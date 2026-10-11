import { NextResponse } from 'next/server';
import { anonClient, serviceClient } from '@/lib/supabase';
import { applySession, sameOrigin } from '@/lib/adminAuth';
import { clientIp, rateLimit } from '@/lib/util';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    if (!sameOrigin(request)) return NextResponse.json({ error: '不允許的請求' }, { status: 403 });
    if (!rateLimit('login:' + clientIp(request), 8, 10 * 60 * 1000)) {
      return NextResponse.json({ error: '嘗試次數太多，請 10 分鐘後再試。' }, { status: 429 });
    }
    const { email, password } = await request.json().catch(() => ({}));
    if (!email || !password) return NextResponse.json({ error: '請輸入電子郵件和密碼' }, { status: 400 });

    const { data, error } = await anonClient().auth.signInWithPassword({ email: String(email).trim(), password: String(password) });
    if (error || !data?.session || !data?.user) {
      return NextResponse.json({ error: '電子郵件或密碼不正確' }, { status: 401 });
    }
    const { data: row } = await serviceClient().from('admins').select('user_id').eq('user_id', data.user.id).maybeSingle();
    if (!row) return NextResponse.json({ error: '這個帳號沒有管理員權限' }, { status: 403 });

    const res = NextResponse.json({ ok: true, email: data.user.email });
    applySession(res, data.session);
    return res;
  } catch (err) {
    console.error('login error', err);
    return NextResponse.json({ error: '系統暫時發生問題，請稍後再試。' }, { status: 500 });
  }
}
