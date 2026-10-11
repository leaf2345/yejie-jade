// 顯示台灣時間（瀏覽器端與伺服器端都可用）
export function fmtTw(iso) {
  if (!iso) return '';
  const t = new Date(new Date(iso).getTime() + 8 * 3600 * 1000);
  const p = (n) => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())} ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}`;
}
