import { requireAdmin, reply, unauthorized, badRequest, sameOrigin } from '@/lib/adminAuth';
import { cleanText } from '@/lib/util';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return badRequest('訂單代碼不正確');
    if (!sameOrigin(request)) return Response.json({ error: '不允許的請求' }, { status: 403 });
    const auth = await requireAdmin(request);
    if (!auth.ok) return unauthorized();
    const b = await request.json().catch(() => ({}));
    const text = cleanText(b.body, 1000);
    if (!text) return badRequest('請輸入訊息內容');
    const { data, error } = await auth.sb
      .from('order_messages')
      .insert({ order_id: id, sender: 'shop', body: text })
      .select('id, sender, body, created_at')
      .single();
    if (error) throw error;
    return reply(auth, { message: data });
  } catch (err) {
    console.error('admin message error', err);
    return Response.json({ error: '訊息送出失敗' }, { status: 500 });
  }
}
