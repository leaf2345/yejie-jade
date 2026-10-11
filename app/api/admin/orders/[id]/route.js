import { requireAdmin, reply, unauthorized, badRequest, sameOrigin } from '@/lib/adminAuth';
import { BUCKET, PAY_STATUSES, SHIP_METHODS, PAY_METHODS, STATUSES } from '@/lib/constants';
import { cleanText, toIntOrNull } from '@/lib/util';

export const runtime = 'nodejs';

const UUID = /^[0-9a-f-]{36}$/i;

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!UUID.test(id)) return badRequest('訂單代碼不正確');
    const auth = await requireAdmin(request);
    if (!auth.ok) return unauthorized();
    const { sb } = auth;

    const { data: order, error } = await sb.from('orders').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!order) return Response.json({ error: '找不到這筆訂單' }, { status: 404 });

    const { data: imgs } = await sb.from('order_images').select('id, storage_path, created_at').eq('order_id', id).order('created_at');
    let images = [];
    if (imgs && imgs.length) {
      const { data: signed } = await sb.storage.from(BUCKET).createSignedUrls(imgs.map((i) => i.storage_path), 60 * 60);
      images = imgs.map((i, idx) => ({ id: i.id, url: signed?.[idx]?.signedUrl || null }));
    }
    const { data: messages } = await sb.from('order_messages').select('id, sender, body, created_at').eq('order_id', id).order('created_at');
    const { data: history } = await sb
      .from('orders')
      .select('id, order_no, created_at, status, item_name, total_amount')
      .eq('phone', order.phone)
      .neq('id', id)
      .order('created_at', { ascending: false })
      .limit(20);

    return reply(auth, { order, images, messages: messages || [], history: history || [] });
  } catch (err) {
    console.error('admin order get error', err);
    return Response.json({ error: '讀取訂單失敗' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    if (!UUID.test(id)) return badRequest('訂單代碼不正確');
    if (!sameOrigin(request)) return Response.json({ error: '不允許的請求' }, { status: 403 });
    const auth = await requireAdmin(request);
    if (!auth.ok) return unauthorized();
    const { sb } = auth;
    const b = await request.json().catch(() => ({}));

    const { data: cur } = await sb.from('orders').select('*').eq('id', id).maybeSingle();
    if (!cur) return Response.json({ error: '找不到這筆訂單' }, { status: 404 });

    const upd = {};
    for (const k of ['unit_price', 'shipping_fee', 'total_amount', 'paid_amount', 'refund_amount']) {
      if (k in b) {
        const n = toIntOrNull(b[k]);
        if (Number.isNaN(n)) return badRequest('金額請填 0 以上的數字');
        upd[k] = (k === 'paid_amount' || k === 'refund_amount') ? (n || 0) : n;
      }
    }
    if ('quantity' in b) {
      const n = toIntOrNull(b.quantity);
      if (Number.isNaN(n) || !n || n < 1) return badRequest('數量請填 1 以上的數字');
      upd.quantity = n;
    }
    if ('status' in b) {
      if (!STATUSES.includes(b.status)) return badRequest('訂單狀態不正確');
      upd.status = b.status;
    }
    if ('pay_status' in b) {
      if (!PAY_STATUSES.includes(b.pay_status)) return badRequest('付款狀態不正確');
      upd.pay_status = b.pay_status;
    }
    if ('ship_method' in b) {
      if (!SHIP_METHODS.includes(b.ship_method)) return badRequest('配送方式不正確');
      upd.ship_method = b.ship_method;
    }
    if ('pay_method' in b) {
      if (!PAY_METHODS.includes(b.pay_method)) return badRequest('付款方式不正確');
      upd.pay_method = b.pay_method;
    }
    for (const [k, max] of [['item_name', 100], ['item_code', 50], ['tracking_no', 60], ['admin_note', 2000]]) {
      if (k in b) upd[k] = cleanText(b[k], max) || null;
    }

    // 自動帶入：改成已付款就記錄實收金額；改成已退款就記錄退款金額
    const total = 'total_amount' in upd ? upd.total_amount : cur.total_amount;
    const paid = 'paid_amount' in upd ? upd.paid_amount : cur.paid_amount;
    if (upd.pay_status === '已付款' && !('paid_amount' in upd) && !cur.paid_amount) upd.paid_amount = total || 0;
    if (upd.pay_status === '已退款' && !('refund_amount' in upd) && !cur.refund_amount) {
      upd.refund_amount = ('paid_amount' in upd ? upd.paid_amount : paid) || total || 0;
    }
    if (upd.pay_status === '未付款' && !('paid_amount' in upd)) upd.paid_amount = 0;

    upd.updated_at = new Date().toISOString();
    const { data, error } = await sb.from('orders').update(upd).eq('id', id).select('*').single();
    if (error) throw error;
    return reply(auth, { order: data });
  } catch (err) {
    console.error('admin order patch error', err);
    return Response.json({ error: '儲存失敗，請再試一次' }, { status: 500 });
  }
}
