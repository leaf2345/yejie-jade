import { randomInt } from 'crypto';

export function normalizePhone(v) {
  return String(v || '').replace(/[\s\-()]/g, '');
}

export function isMobile(v) {
  return /^09\d{8}$/.test(normalizePhone(v));
}

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// 台灣時間（UTC+8）
export function twNow(date = new Date()) {
  return new Date(date.getTime() + 8 * 3600 * 1000);
}

export function twDateStr(date = new Date()) {
  const t = twNow(date);
  const p = (n) => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}${p(t.getUTCMonth() + 1)}${p(t.getUTCDate())}`;
}

export function makeOrderNo() {
  let tail = '';
  for (let i = 0; i < 6; i++) tail += ALPHABET[randomInt(ALPHABET.length)];
  return `YJ${twDateStr()}-${tail}`;
}

export function fmtTw(iso) {
  if (!iso) return '';
  const t = twNow(new Date(iso));
  const p = (n) => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())} ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}`;
}

// 台灣當天 00:00 對應的 UTC 時間
export function twDayStartUtc(date = new Date()) {
  const t = twNow(date);
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()) - 8 * 3600 * 1000);
}

export function twMonthStartUtc(date = new Date()) {
  const t = twNow(date);
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1) - 8 * 3600 * 1000);
}

export function cleanText(v, max) {
  return String(v == null ? '' : v).replace(/\u0000/g, '').trim().slice(0, max);
}

export function toIntOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100000000) return NaN;
  return Math.round(n);
}

// 判斷檔案內容真的是圖片（不只看副檔名）
export function sniffImage(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { type: 'image/jpeg', ext: 'jpg' };
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { type: 'image/png', ext: 'png' };
  if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return { type: 'image/webp', ext: 'webp' };
  return null;
}

export function csvCell(v) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // 避免試算表公式注入
  if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// 簡易限流（只在同一台伺服器實例內有效，用來擋最基本的亂試）
const buckets = new Map();
export function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    buckets.set(key, arr);
    return false;
  }
  arr.push(now);
  buckets.set(key, arr);
  if (buckets.size > 5000) buckets.clear();
  return true;
}

export function clientIp(request) {
  const xf = request.headers.get('x-forwarded-for') || '';
  return xf.split(',')[0].trim() || 'unknown';
}
