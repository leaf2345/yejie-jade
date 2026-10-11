import Link from 'next/link';

export default function SiteHeader({ back = false }) {
  return (
    <header className="site-head">
      {back ? (
        <Link className="btn ghost small" href="/">← 回首頁</Link>
      ) : (
        <div className="logo">葉界首選翡翠<small>YEJIE JADE</small></div>
      )}
      {back ? (
        <div className="logo" style={{ fontSize: 17 }}>葉界首選翡翠</div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <Link className="btn ghost small" href="/lookup">查詢訂單</Link>
          <Link className="btn small" href="/order">直播下單</Link>
        </div>
      )}
    </header>
  );
}
