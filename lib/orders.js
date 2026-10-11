import { normalizePhone } from '@/lib/util';

// 用「訂單編號＋下單手機」找訂單，兩個都對才算
export async function findOrder(sb, orderNo, phone) {
  const no = String(orderNo || '').trim().toUpperCase();
  const ph = normalizePhone(phone);
  if (!no || !ph) return null;
  const { data } = await sb.from('orders').select('*').eq('order_no', no).maybeSingle();
  if (!data) return null;
  if (normalizePhone(data.phone) !== ph) return null;
  return data;
}

export function publicOrderView(o, messages) {
  const showBank = o.pay_method === '銀行轉帳' && o.pay_status === '未付款' && o.total_amount != null
    && !['已取消', '已退款'].includes(o.status);
  return {
    order_no: o.order_no,
    created_at: o.created_at,
    status: o.status,
    pay_status: o.pay_status,
    pay_method: o.pay_method,
    ship_method: o.ship_method,
    item_name: o.item_name,
    quantity: o.quantity,
    total_amount: o.total_amount,
    tracking_no: o.tracking_no,
    transfer_last5: o.transfer_last5 || null,
    show_bank: showBank,
    messages: (messages || []).map((m) => ({ sender: m.sender, body: m.body, created_at: m.created_at })),
  };
}
