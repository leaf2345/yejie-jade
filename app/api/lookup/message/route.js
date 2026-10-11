import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase';
import { findOrder } from '@/lib/orders';
import { cleanText, clientIp, rateLimit } from '@/lib/util';
import { sameOrigin } from '@/lib/adminAuth';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    if (!sameOrigin(request)) return NextResponse.json({ error: '不允許的請求' }, { status: 403 });
    if (!rateLimit('msg:' + clientIp(request), 20, 10 * 60 * 1000)) {
      return NextResponse.json({ error: '送出次數太多，請稍後再試。' }, { status: 429 });
    }
    const body = await request.json().catch(() => ({}));
    const text = cleanText(body.body, 500);
    if (!text) return NextResponse.json({ error: '請輸入訊息內容' }, { status: 400 });
    const sb = serviceClient();
    const order = await findOrder(sb, body.orderNo, body.phone);
    if (!order) return NextResponse.json({ error: '查不到這筆訂單' }, { status: 404 });

    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = await sb
      .from('order_messages')
      .select('id', { count: 'exact', head: true })
      .eq('order_id', order.id)
      .eq('sender', 'customer')
      .gte('created_at', dayAgo);
    if ((count || 0) >= 30) return NextResponse.json({ error: '今天的訊息已達上限，請明天再試。' }, { status: 429 });

    const { error } = await sb.from('order_messages').insert({ order_id: order.id, sender: 'customer', body: text });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('lookup message error', err);
    return NextResponse.json({ error: '系統暫時發生問題，請稍後再試。' }, { status: 500 });
  }
}
