import { NextResponse } from 'next/server';
import { anonClient, serviceClient } from '@/lib/supabase';

export const AT = 'yj_at';
export const RT = 'yj_rt';

const base = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
});

export function applySession(res, session) {
  res.cookies.set(AT, session.access_token, { ...base(), maxAge: 60 * 60 });
  res.cookies.set(RT, session.refresh_token, { ...base(), maxAge: 60 * 60 * 24 * 30 });
}

export function clearSession(res) {
  res.cookies.set(AT, '', { ...base(), maxAge: 0 });
  res.cookies.set(RT, '', { ...base(), maxAge: 0 });
}

// 防止其他網站偷偷送出請求
export function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get('host');
  } catch {
    return false;
  }
}

export async function requireAdmin(request) {
  const sb = serviceClient();
  const at = request.cookies.get(AT)?.value;
  const rt = request.cookies.get(RT)?.value;
  let user = null;
  let newSession = null;

  if (at) {
    const { data, error } = await sb.auth.getUser(at);
    if (!error && data?.user) user = data.user;
  }
  if (!user && rt) {
    const { data, error } = await anonClient().auth.refreshSession({ refresh_token: rt });
    if (!error && data?.session && data?.user) {
      user = data.user;
      newSession = data.session;
    }
  }
  if (!user) return { ok: false };

  const { data: row } = await sb.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!row) return { ok: false };
  return { ok: true, user, sb, newSession };
}

export function reply(auth, body, status = 200) {
  const res = NextResponse.json(body, { status });
  if (auth?.newSession) applySession(res, auth.newSession);
  return res;
}

export function unauthorized() {
  return NextResponse.json({ error: '請先登入' }, { status: 401 });
}

export function badRequest(msg) {
  return NextResponse.json({ error: msg }, { status: 400 });
}
