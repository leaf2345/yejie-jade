export const STATUSES = [
  '新訂單', '已確認商品', '待付款', '已付款', '待出貨',
  '已出貨', '已完成', '已取消', '退款處理中', '已退款',
];
export const PAY_STATUSES = ['未付款', '已付款', '退款處理中', '已退款'];
export const SHIP_METHODS = ['超商店到店', '郵寄（中華郵政）'];
export const PAY_METHODS = ['銀行轉帳', '貨到付款'];

export const BANK = {
  bank: '合作金庫（006）',
  account: '2044765099221',
  holder: '李維',
};

export const BUCKET = 'order-screenshots';
export const MAX_IMAGES = 6;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 4 * 1024 * 1024; // Vercel 單次請求上限約 4.5MB

export const DEFAULT_SETTINGS = {
  live_slot_1: '週六 13:30～17:30',
  live_slot_2: '週日 20:30～00:30',
  live_link: 'https://tw.shp.ee/RS9yeeje',
};

export const IG_ACCOUNT = 'leaf.2345';
export const IG_URL = 'https://www.instagram.com/leaf.2345/';
export const SERVICE_HOURS = '中午 12:00～晚上 20:00';
