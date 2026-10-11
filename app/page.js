import Link from 'next/link';
import { serviceClient } from '@/lib/supabase';
import { DEFAULT_SETTINGS, IG_ACCOUNT, IG_URL, SERVICE_HOURS } from '@/lib/constants';
import SiteHeader from '@/components/SiteHeader';
import ExampleShot from '@/components/ExampleShot';
import CopyButton from '@/components/CopyButton';

export const dynamic = 'force-dynamic';

async function getSettings() {
  const s = { ...DEFAULT_SETTINGS };
  try {
    const { data } = await serviceClient().from('site_settings').select('key, value');
    for (const r of data || []) if (r.key in s) s[r.key] = r.value;
  } catch (e) {
    console.error('讀取直播設定失敗，使用預設值', e);
  }
  return s;
}

function Slot({ text }) {
  const parts = String(text || '').trim().split(/\s+/);
  return (
    <div className="slot">
      <b>{parts[0]}</b>
      <span>{parts.slice(1).join(' ')}</span>
    </div>
  );
}

export default async function Home() {
  const s = await getSettings();
  return (
    <div className="wrap">
      <SiteHeader />

      <div className="hero">
        <div style={{ display: 'grid', gap: 18 }}>
          <span className="eyebrow">天然緬甸 A 貨翡翠・手工編綁</span>
          <h1>讓每一份喜歡，<br />都能找到適合自己的<span>翡翠</span>。</h1>
          <p className="lead">專人介紹、手工編綁，從 NT$500 起。直播看到喜歡的，截圖下單就好。</p>
          <div style={{ display: 'grid', gap: 8 }}>
            <Link className="btn block" href="/order" style={{ fontSize: 20, minHeight: 60 }}>立即直播下單</Link>
            <span className="cta-note">不用註冊帳號，截圖、填資料即可送出。</span>
          </div>
        </div>
      </div>

      <section className="block" id="about">
        <span className="eyebrow-s">關於我們</span>
        <h2>5 年以上經驗，平價、有質感</h2>
        <figure className="photo">
          <img src="/jade-photo.jpg" alt="直播中展示的翡翠牌飾與擺件" />
          <figcaption>直播現場展示的翡翠</figcaption>
        </figure>
        <p style={{ color: 'var(--muted)', marginBottom: 16 }}>
          主要販售天然緬甸 A 貨翡翠，有山水牌、佛牌、手鐲、貔貅、金蟾等。價格約 NT$500～12,000，適合自己戴，也適合送禮。
        </p>
        <div className="pillars">
          <div className="pillar"><b>手工編綁</b>每條繩結都由專人手工完成，也可依喜好客製化。</div>
          <div className="pillar"><b>獨特風格</b>編法與配色有自己的特色，不會千篇一律。</div>
          <div className="pillar"><b>第一手貨源</b>貨源直接，價格實在，沒有多餘的層層加價。</div>
          <div className="pillar"><b>專人介紹</b>直播時逐件展示、說明，看得清楚再決定。</div>
        </div>
        <div className="tags">
          {['山水牌', '佛牌', '手鐲', '貔貅', '金蟾', '客製化編綁'].map((t) => (
            <span className="tag" key={t}>{t}</span>
          ))}
        </div>
      </section>

      <section className="block" id="live">
        <span className="eyebrow-s">直播時間</span>
        <h2>每週兩場，歡迎來看</h2>
        <div className="live">
          <div>
            <Slot text={s.live_slot_1} />
            <Slot text={s.live_slot_2} />
          </div>
          {s.live_link ? (
            <a className="btn ghost block" href={s.live_link} target="_blank" rel="noopener noreferrer">前往直播（蝦皮）</a>
          ) : (
            <span className="status-note">直播連結即將公布。</span>
          )}
        </div>
      </section>

      <section className="block" id="howto">
        <span className="eyebrow-s">下單方式</span>
        <h2>看直播，三步完成下單</h2>
        <ol className="steps">
          <li><div><b>截圖直播中單字＋翡翠（同一張）</b><br /><span style={{ color: 'var(--muted)' }}>紙卡（價格、蝦皮帳號名稱、綁邊需求）和翡翠要一起入鏡，不要分開截。</span></div></li>
          <li><div><b>填寫直播下單表單</b><br /><span style={{ color: 'var(--muted)' }}>上傳截圖，填寫聯絡與收件資料。</span></div></li>
          <li><div><b>等待我們確認</b><br /><span style={{ color: 'var(--muted)' }}>確認商品與金額後，會通知您付款與出貨。</span></div></li>
        </ol>
        <ExampleShot />
        <div style={{ marginTop: 20 }}>
          <Link className="btn block" href="/order">前往直播下單</Link>
        </div>
      </section>

      <section className="block" id="notice">
        <span className="eyebrow-s">購物須知</span>
        <h2>下單前請先看</h2>
        <details><summary>付款方式</summary><p>提供：銀行轉帳、貨到付款（信用卡預計之後開放）。我們確認商品與金額後會通知您，請於確認後 5 天內完成付款。選擇銀行轉帳的客人，送出訂單後會看到匯款帳戶。</p></details>
        <details><summary>配送方式與運費</summary><p>配送方式：超商店到店（7-11／全家）、中華郵政郵寄。訂單滿 NT$200 免運。出貨時間較長的訂單，需 14～21 天。</p></details>
        <details><summary>退換貨及退款政策</summary><p>翡翠若有破損，可以寄回處理或退款。完整規則請看<Link href="/notice">購物須知頁面</Link>。</p></details>
        <details><summary>常見問題</summary><p>Q：需要註冊嗎？ A：不用。直播下單頁填資料即可。<br />Q：下單後就成交了嗎？ A：還不是。我們確認商品與金額並通知您後，才算成立。<br />Q：下單後怎麼查進度？ A：到「查詢訂單」輸入訂單編號和手機號碼，可以看進度和我們的訊息。</p></details>
        <p style={{ marginTop: 12 }}><Link href="/notice">看完整的購物須知、退換貨與隱私權政策</Link></p>
      </section>

      <footer className="site-foot" id="contact">
        <b style={{ color: 'var(--fg)', fontFamily: 'var(--font-display)', fontSize: 18 }}>聯絡我們</b>
        <div>
          Instagram：<a href={IG_URL} target="_blank" rel="noopener noreferrer">@{IG_ACCOUNT}</a>{' '}
          <CopyButton text={IG_ACCOUNT} label="複製帳號" />
        </div>
        <div>客服時間：{SERVICE_HOURS}</div>
        <div>已下單的客人，請到<Link href="/lookup">「查詢訂單」</Link>看進度、傳訊息給我們。</div>
        <div className="foot-links"><Link href="/notice">購物須知</Link><Link href="/lookup">查詢訂單</Link></div>
        <div>© 葉界首選翡翠</div>
      </footer>
    </div>
  );
}
