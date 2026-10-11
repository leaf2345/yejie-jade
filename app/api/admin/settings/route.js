import { requireAdmin, reply, unauthorized, badRequest, sameOrigin } from '@/lib/adminAuth';
import { DEFAULT_SETTINGS } from '@/lib/constants';
import { cleanText } from '@/lib/util';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return unauthorized();
    const { data } = await auth.sb.from('site_settings').select('key, value');
    const settings = { ...DEFAULT_SETTINGS };
    for (const r of data || []) if (r.key in settings) settings[r.key] = r.value;
    return reply(auth, { settings });
  } catch (err) {
    console.error('settings get error', err);
    return Response.json({ error: '讀取設定失敗' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    if (!sameOrigin(request)) return Response.json({ error: '不允許的請求' }, { status: 403 });
    const auth = await requireAdmin(request);
    if (!auth.ok) return unauthorized();
    const b = await request.json().catch(() => ({}));
    const link = cleanText(b.live_link, 500);
    if (link && !/^https:\/\//i.test(link)) return badRequest('直播連結必須以 https:// 開頭');
    const rows = [
      { key: 'live_slot_1', value: cleanText(b.live_slot_1, 60) },
      { key: 'live_slot_2', value: cleanText(b.live_slot_2, 60) },
      { key: 'live_link', value: link },
    ].map((r) => ({ ...r, updated_at: new Date().toISOString() }));
    const { error } = await auth.sb.from('site_settings').upsert(rows, { onConflict: 'key' });
    if (error) throw error;
    return reply(auth, { ok: true });
  } catch (err) {
    console.error('settings put error', err);
    return Response.json({ error: '儲存設定失敗' }, { status: 500 });
  }
}
