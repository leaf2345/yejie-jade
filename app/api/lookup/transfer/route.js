import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase';
import { findOrder } from '@/lib/orders';
import { clientIp, rateLimit } from '@/lib/util';
import { sameOrigin } from '@/lib/adminAuth';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    if (!sameOrigin(request)) return NextResponse.json({ error: '不允許的請求' }, { status: 403 });
    if (!rateLimit('l5:' + clientIp(request), 15, 10 * 60 * 1000)) {
      return NextResponse.json({ error: '送出次數太多，請稍後再試。' }, { status: 429 });
    }
    const body = await request.json().catch(() => ({}));
    const last5 = String(body.last5 || '').trim();
    if (!/^\d{5}$/.test(last5)) return NextResponse.json({ error: '請輸入 5 位數字' }, { status: 400 });
    const sb = serviceClient();
    const order = await findOrder(sb, body.orderNo, body.phone);
    if (!order) return NextResponse.json({ error: '查不到這筆訂單' }, { status: 404 });
    if (order.pay_method !== '銀行轉帳' || order.pay_status !== '未付款') {
      return NextResponse.json({ error: '這筆訂單目前不需要回報轉帳' }, { status: 400 });
    }
    const { error } = await sb.from('orders').update({ transfer_last5: last5, updated_at: new Date().toISOString() }).eq('id', order.id);
    if (error) throw error;
    await sb.from('order_messages').insert({ order_id: order.id, sender: 'customer', body: `已轉帳，轉帳帳號後五碼：${last5}` });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('transfer error', err);
    return NextResponse.json({ error: '系統暫時發生問題，請稍後再試。' }, { status: 500 });
  }
}
