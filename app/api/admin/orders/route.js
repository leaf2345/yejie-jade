import { requireAdmin, reply, unauthorized } from '@/lib/adminAuth';
import { STATUSES } from '@/lib/constants';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return unauthorized();
    const { sb } = auth;
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'all';
    const rawQ = (url.searchParams.get('q') || '').trim().slice(0, 60);
    const limit = Math.min(Number(url.searchParams.get('limit')) || 100, 300);

    let query = sb
      .from('orders')
      .select('id, order_no, created_at, customer_name, phone, shopee_account, item_name, quantity, total_amount, status, pay_status, pay_method, amount_text')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status !== 'all' && STATUSES.includes(status)) query = query.eq('status', status);

    if (rawQ) {
      const dateMatch = rawQ.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dateMatch) {
        const start = new Date(Date.UTC(+dateMatch[1], +dateMatch[2] - 1, +dateMatch[3]) - 8 * 3600 * 1000);
        const end = new Date(start.getTime() + 24 * 3600 * 1000);
        query = query.gte('created_at', start.toISOString()).lt('created_at', end.toISOString());
      } else {
        const q = rawQ.replace(/[,()%*\\]/g, ' ').trim();
        if (q) {
          const like = `%${q}%`;
          query = query.or(
            ['order_no', 'customer_name', 'phone', 'shopee_account', 'item_name', 'status']
              .map((c) => `${c}.ilike.${like}`)
              .join(',')
          );
        }
      }
    }

    const { data: orders, error } = await query;
    if (error) throw error;

    // 標記「客人有新回覆」：最後一則訊息是客人傳的
    const ids = (orders || []).map((o) => o.id);
    const lastSender = {};
    if (ids.length) {
      const { data: msgs } = await sb
        .from('order_messages')
        .select('order_id, sender, created_at')
        .in('order_id', ids)
        .order('created_at', { ascending: false });
      for (const m of msgs || []) if (!(m.order_id in lastSender)) lastSender[m.order_id] = m.sender;
    }
    const rows = (orders || []).map((o) => ({ ...o, customer_replied: lastSender[o.id] === 'customer' }));
    return reply(auth, { orders: rows });
  } catch (err) {
    console.error('admin orders error', err);
    return Response.json({ error: '讀取訂單失敗' }, { status: 500 });
  }
}
