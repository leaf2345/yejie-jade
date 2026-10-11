import { requireAdmin, reply, unauthorized } from '@/lib/adminAuth';
import { twDayStartUtc, twMonthStartUtc } from '@/lib/util';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return unauthorized();
    const { sb } = auth;
    const dayStart = twDayStartUtc().toISOString();
    const monthStart = twMonthStartUtc().toISOString();

    const count = async (build) => {
      const { count: c, error } = await build(sb.from('orders').select('id', { count: 'exact', head: true }));
      if (error) throw error;
      return c || 0;
    };
    const [today, pendingConfirm, pendingPay, pendingShip] = await Promise.all([
      count((q) => q.gte('created_at', dayStart)),
      count((q) => q.eq('status', '新訂單')),
      count((q) => q.eq('status', '待付款')),
      count((q) => q.eq('status', '待出貨')),
    ]);

    const { data: month, error } = await sb
      .from('orders')
      .select('status, pay_status, total_amount, paid_amount, refund_amount')
      .gte('created_at', monthStart)
      .limit(5000);
    if (error) throw error;

    let monthOrders = 0, dealAmount = 0, received = 0, refunded = 0;
    for (const o of month || []) {
      monthOrders += 1;
      if (o.total_amount != null && !['新訂單', '已取消', '已退款'].includes(o.status)) dealAmount += o.total_amount;
      received += o.paid_amount || 0;
      refunded += o.refund_amount || 0;
    }
    return reply(auth, {
      today, pendingConfirm, pendingPay, pendingShip, monthOrders,
      dealAmount, received: received - refunded, refunded,
    });
  } catch (err) {
    console.error('stats error', err);
    return Response.json({ error: '讀取統計失敗' }, { status: 500 });
  }
}
