import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { serviceClient } from '@/lib/supabase';
import { BUCKET, MAX_IMAGES, MAX_IMAGE_BYTES, MAX_TOTAL_BYTES, SHIP_METHODS, PAY_METHODS } from '@/lib/constants';
import { sameOrigin } from '@/lib/adminAuth';
import { cleanText, clientIp, isMobile, makeOrderNo, normalizePhone, rateLimit, sniffImage } from '@/lib/util';

export const runtime = 'nodejs';
export const maxDuration = 30;

const fail = (msg, status = 400) => NextResponse.json({ error: msg }, { status });

export async function POST(request) {
  try {
    if (!sameOrigin(request)) return fail('不允許的請求', 403);
    if (!rateLimit('order:' + clientIp(request), 15, 10 * 60 * 1000)) {
      return fail('送出次數太多，請稍後再試。', 429);
    }

    let form;
    try {
      form = await request.formData();
    } catch {
      return fail('送出的資料太大或格式不正確，請減少圖片張數後再試。');
    }

    // 隱藏欄位：真人看不到，機器人會填。假裝成功，不存入。
    if (cleanText(form.get('website'), 100)) {
      return NextResponse.json({ orderNo: 'YJ-OK' });
    }

    const customer_name = cleanText(form.get('customer_name'), 50);
    const phone = normalizePhone(form.get('phone'));
    const shopee_account = cleanText(form.get('shopee_account'), 80);
    const amount_text = cleanText(form.get('amount_text'), 12).replace(/[,\s]/g, '');
    const customer_note = cleanText(form.get('customer_note'), 500);
    const ship_method = cleanText(form.get('ship_method'), 40);
    const pay_method = cleanText(form.get('pay_method'), 40);
    const receiver_name = cleanText(form.get('receiver_name'), 50);
    const receiver_phone = normalizePhone(form.get('receiver_phone'));
    const receiver_address = cleanText(form.get('receiver_address'), 200);

    if (!customer_name) return fail('請填寫姓名或稱呼');
    if (!isMobile(phone)) return fail('聯絡電話請填 09 開頭的 10 碼手機號碼');
    if (!shopee_account) return fail('請填寫蝦皮帳號名稱');
    if (!/^\d{1,7}$/.test(amount_text)) return fail('購買數量（金額）請填數字');
    if (!SHIP_METHODS.includes(ship_method)) return fail('請選擇配送方式');
    if (!PAY_METHODS.includes(pay_method)) return fail('請選擇付款方式');
    if (!receiver_name) return fail('請填寫收件人姓名');
    if (!isMobile(receiver_phone)) return fail('收件人電話請填 09 開頭的 10 碼手機號碼');
    const minAddr = ship_method === '超商店到店' ? 2 : 8;
    if (receiver_address.length < minAddr) {
      return fail(ship_method === '超商店到店' ? '請填寫取貨門市' : '請填寫完整郵寄地址');
    }

    const files = form.getAll('images').filter((f) => f && typeof f === 'object' && 'arrayBuffer' in f);
    if (files.length < 1) return fail('請至少上傳 1 張商品截圖');
    if (files.length > MAX_IMAGES) return fail(`最多只能上傳 ${MAX_IMAGES} 張圖片`);

    const images = [];
    let total = 0;
    for (const f of files) {
      if (f.size > MAX_IMAGE_BYTES) return fail('每張圖片請小於 5MB');
      const buf = Buffer.from(await f.arrayBuffer());
      const kind = sniffImage(buf);
      if (!kind) return fail('只接受 JPG、PNG、WebP 圖片');
      total += buf.length;
      images.push({ buf, ...kind });
    }
    if (total > MAX_TOTAL_BYTES + 400 * 1024) return fail('圖片總大小太大，請減少張數');

    const sb = serviceClient();

    // 同一個人 2 分鐘內送出一模一樣的訂單，視為重複點擊，直接回傳原本的訂單
    const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: dup } = await sb
      .from('orders')
      .select('order_no')
      .eq('phone', phone)
      .eq('shopee_account', shopee_account)
      .eq('amount_text', amount_text)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1);
    if (dup && dup.length) return NextResponse.json({ orderNo: dup[0].order_no, duplicate: true });

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await sb
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('phone', phone)
      .gte('created_at', hourAgo);
    if ((count || 0) >= 8) return fail('這支電話短時間內送出太多筆訂單，請稍後再試或直接聯絡我們。', 429);

    let order = null;
    for (let i = 0; i < 4 && !order; i++) {
      const { data, error } = await sb
        .from('orders')
        .insert({
          order_no: makeOrderNo(),
          customer_name,
          phone,
          shopee_account,
          amount_text,
          customer_note: customer_note || null,
          ship_method,
          pay_method,
          receiver_name,
          receiver_phone,
          receiver_address,
        })
        .select('id, order_no')
        .single();
      if (!error) order = data;
      else if (error.code !== '23505') {
        console.error('order insert failed', error);
        return fail('訂單儲存失敗，請稍後再試。', 500);
      }
    }
    if (!order) return fail('訂單編號產生失敗，請再按一次送出。', 500);

    const uploaded = [];
    try {
      for (const img of images) {
        const path = `${order.id}/${randomUUID()}.${img.ext}`;
        const { error } = await sb.storage.from(BUCKET).upload(path, img.buf, { contentType: img.type, upsert: false });
        if (error) throw error;
        uploaded.push(path);
      }
      const { error: e2 } = await sb.from('order_images').insert(uploaded.map((p) => ({ order_id: order.id, storage_path: p })));
      if (e2) throw e2;
    } catch (err) {
      console.error('image upload failed', err);
      if (uploaded.length) await sb.storage.from(BUCKET).remove(uploaded);
      await sb.from('orders').delete().eq('id', order.id);
      return fail('圖片上傳失敗，訂單沒有送出，請再試一次。', 500);
    }

    return NextResponse.json({ orderNo: order.order_no });
  } catch (err) {
    console.error('order route error', err);
    return fail('系統暫時發生問題，請稍後再試。', 500);
  }
}
