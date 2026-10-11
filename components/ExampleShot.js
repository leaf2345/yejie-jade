export default function ExampleShot() {
  return (
    <figure className="exshot" aria-label="截圖範例">
      <svg viewBox="0 0 200 270" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="截圖範例示意圖">
        <rect x="2" y="2" width="196" height="266" rx="14" fill="#E9D98C" stroke="#8FA397" strokeWidth="3" />
        <rect x="2" y="2" width="196" height="120" rx="14" fill="#F4F4F0" />
        <rect x="2" y="100" width="196" height="22" fill="#F4F4F0" />
        <path d="M30 40 C45 20 60 60 75 35 S105 50 120 30 150 55 168 32" stroke="#2A3FA8" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M40 98 C40 70 62 66 62 86 C62 104 40 100 56 100 M80 78 C70 78 70 112 84 108 C96 104 96 80 80 78 M112 78 C102 78 102 112 116 108 C128 104 128 80 112 78" stroke="#2A3FA8" strokeWidth="5" fill="none" strokeLinecap="round" />
        <ellipse cx="100" cy="196" rx="66" ry="56" fill="none" stroke="#6FA38A" strokeWidth="16" strokeDasharray="1 14" strokeLinecap="round" />
        <ellipse cx="100" cy="196" rx="66" ry="56" fill="none" stroke="#8FBFA6" strokeWidth="12" strokeDasharray="14 3" />
      </svg>
      <figcaption>
        <b>截圖範例（示意圖）</b>
        <br />
        紙卡上會寫價格、蝦皮帳號名稱，有要綁邊也會寫在上面。紙卡和翡翠要在同一張截圖。
      </figcaption>
    </figure>
  );
}
