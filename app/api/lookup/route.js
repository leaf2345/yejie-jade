import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase';
import { findOrder, publicOrderView } from '@/lib/orders';
import { BANK } from '@/lib/constants';
import { clientIp, rateLimit } from '@/lib/util';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    if (!rateLimit('lookup:' + clientIp(request), 30, 10 * 60 * 1000)) {
      return NextResponse.json({ error: '查詢次數太多，請稍後再試。' }, { status: 429 });
    }
    const body = await request.json().catch(() => ({}));
    const sb = serviceClient();
    const order = await findOrder(sb, body.orderNo, body.phone);
    if (!order) return NextResponse.json({ error: '查不到這筆訂單，請檢查訂單編號和手機號碼。' }, { status: 404 });
    const { data: msgs } = await sb
      .from('order_messages')
      .select('sender, body, created_at')
      .eq('order_id', order.id)
      .order('created_at', { ascending: true });
    const view = publicOrderView(order, msgs);
    return NextResponse.json({ order: view, bank: view.show_bank ? BANK : null });
  } catch (err) {
    console.error('lookup error', err);
    return NextResponse.json({ error: '系統暫時發生問題，請稍後再試。' }, { status: 500 });
  }
}
