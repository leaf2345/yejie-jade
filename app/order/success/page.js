'use client';
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BANK } from '@/lib/constants';
import CopyButton from '@/components/CopyButton';

function Inner() {
  const sp = useSearchParams();
  const no = sp.get('no') || '';
  const bank = sp.get('pay') === 'bank';
  return (
    <div className="success">
      <div className="seal" aria-hidden="true">✓</div>
      <h1 style={{ fontSize: 30 }}>訂單已送出</h1>
      <div className="ordno">{no}</div>
      <CopyButton text={no} label="複製訂單編號" />
      <p className="hint">請截圖或記下訂單編號，之後用「訂單編號＋手機號碼」可以查詢進度。</p>

      {bank ? (
        <div className="review next">
          <b style={{ fontFamily: 'var(--font-display)', fontSize: 19 }}>匯款帳戶</b>
          <dl className="kv" style={{ marginTop: 10 }}>
            <dt>銀行</dt><dd>{BANK.bank}</dd>
            <dt>帳號</dt><dd>{BANK.account} <CopyButton text={BANK.account} /></dd>
            <dt>戶名</dt><dd>{BANK.holder}</dd>
          </dl>
          <p className="hint" style={{ marginTop: 10 }}>請等我們確認商品與金額後再匯款，確認後 5 天內付款。匯款後到「查詢訂單」回報轉帳帳號後五碼。</p>
        </div>
      ) : null}

      <div className="review next">
        <b style={{ fontFamily: 'var(--font-display)', fontSize: 19 }}>接下來會怎麼進行？</b>
        <ol className="steps" style={{ marginTop: 12 }}>
          <li><div>我們會對照您的截圖，確認商品與成交金額。</div></li>
          <li><div>確認後會通知您，並請您在 5 天內付款。</div></li>
          <li><div>收到款項後安排出貨，會提供物流單號。</div></li>
        </ol>
      </div>
      <Link className="btn block" href={`/lookup?no=${encodeURIComponent(no)}`}>查詢訂單與訊息</Link>
      <Link className="btn ghost block" href="/">回首頁</Link>
    </div>
  );
}

export default function Success() {
  return (
    <div className="wrap">
      <Suspense fallback={<div className="center">載入中…</div>}>
        <Inner />
      </Suspense>
    </div>
  );
}
