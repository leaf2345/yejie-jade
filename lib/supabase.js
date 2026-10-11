import { createClient } from '@supabase/supabase-js';

function need(name) {
  const v = process.env[name];
  if (!v) throw new Error(`缺少環境變數 ${name}`);
  return v;
}

// 伺服器專用，具有完整權限，絕對不能傳到瀏覽器
export function serviceClient() {
  return createClient(need('SUPABASE_URL'), need('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// 只用於管理員登入驗證
export function anonClient() {
  return createClient(need('SUPABASE_URL'), need('SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
