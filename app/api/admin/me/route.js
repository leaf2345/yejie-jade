import { requireAdmin, reply, unauthorized } from '@/lib/adminAuth';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return unauthorized();
    return reply(auth, { email: auth.user.email });
  } catch (err) {
    console.error('me error', err);
    return unauthorized();
  }
}
