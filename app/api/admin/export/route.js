import { requireAdmin, unauthorized } from '@/lib/adminAuth';
import { csvCell, fmtTw, twDateStr } from '@/lib/util';
import { STATUSES } from '@/lib/constants';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return unauthorized();
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'all';

    let q = auth.sb.from('orders').select('*').order('created_at', { ascending: false }).limit(10000);
    if (status !== 'all' && STATUSES.includes(status)) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;

    const head = ['訂單編號', '下單時間', '訂單狀態', '付款狀態', '付款方式', '客人稱呼', '手機', '蝦皮帳號', '客人填的金額', '商品名稱', '商品編號', '數量', '成交單價', '運費', '訂單總金額', '實收金額', '退款金額', '轉帳後五碼', '配送方式', '收件人', '收件電話', '取貨門市或地址', '物流單號', '客人備註', '管理員備註'];
    const lines = [head.map(csvCell).join(',')];
    for (const o of data || []) {
      lines.push([
        o.order_no, fmtTw(o.created_at), o.status, o.pay_status, o.pay_method, o.customer_name, o.phone, o.shopee_account,
        o.amount_text, o.item_name, o.item_code, o.quantity, o.unit_price, o.shipping_fee, o.total_amount, o.paid_amount,
        o.refund_amount, o.transfer_last5, o.ship_method, o.receiver_name, o.receiver_phone, o.receiver_address,
        o.tracking_no, o.customer_note, o.admin_note,
      ].map(csvCell).join(','));
    }
    const body = '﻿' + lines.join('\r\n');
    return new Response(body, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="orders-${twDateStr()}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('export error', err);
    return Response.json({ error: '匯出失敗' }, { status: 500 });
  }
}
