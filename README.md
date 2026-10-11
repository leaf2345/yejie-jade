# 葉界首選翡翠 直播下單網站

- 前端與後端：Next.js
- 資料庫、圖片儲存、管理員登入：Supabase
- 部署：Vercel

## 需要的環境變數（填在 Vercel，不要寫進程式碼，也不要上傳到 GitHub）

| 名稱 | 說明 |
|---|---|
| SUPABASE_URL | Supabase 專案網址（Project URL） |
| SUPABASE_ANON_KEY | anon / publishable 金鑰 |
| SUPABASE_SERVICE_ROLE_KEY | service_role / secret 金鑰，擁有完整權限，絕對不能公開 |

## 網址

- `/` 首頁
- `/order` 直播下單
- `/lookup` 查詢訂單與訊息
- `/notice` 購物須知
- `/admin` 管理後台（需登入）
