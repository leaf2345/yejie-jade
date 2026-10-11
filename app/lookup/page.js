'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import CopyButton from '@/components/CopyButton';
import { fmtTw } from '@/lib/clientFmt';

const money = (n) => 'NT$ ' + Number(n || 0).toLocaleString('en-US');
const badge = (s) => (s === '新訂單' ? 'new' : ['已取消', '已退款', '退款處理中'].includes(s) ? 'bad' : ['已完成', '已付款', '已出貨'].includes(s) ? 'go' : '');

function Inner() {
  const sp = useSearchParams();
  const [no, setNo] = useState('');
  const [phone, setPhone] = useState('');
  const [data, setData] = useState(null);
  const [bank, setBank] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [last5, setLast5] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    const n = sp.get('no');
    if (n) setNo(n);
  }, [sp]);

  async function look(e, silent) {
    if (e) e.preventDefault();
    setErr('');
    if (!silent) setNote('');
    setBusy(true);
    try {
      const res = await fetch('/api/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderNo: no, phone }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setData(null);
        setErr(j.error || '查詢失敗，請稍後再試。');
      } else {
        setData(j.order);
        setBank(j.bank);
      }
    } catch {
      setErr('網路不穩，請稍後再試。');
    }
    setBusy(false);
  }

  async function post(url, body, okNote) {
    setErr('');
    setNote('');
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderNo: no, phone, ...body }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(j.error || '送出失敗，請稍後再試。');
        return false;
      }
      setNote(okNote);
      await look(null, true);
      return true;
    } catch {
      setErr('網路不穩，請稍後再試。');
      return false;
    }
  }

  async function sendMsg() {
    if (!msg.trim()) { setErr('請輸入訊息內容'); return; }
    if (await post('/api/lookup/message', { body: msg }, '訊息已送出')) setMsg('');
  }
  async function sendLast5() {
    if (!/^\d{5}$/.test(last5)) { setErr('請輸入 5 位數字'); return; }
    if (await post('/api/lookup/transfer', { last5 }, '已收到您回報的轉帳資料，我們核對後會更新付款狀態')) setLast5('');
  }

  return (
    <>
      <div className="page-title"><h1>查詢訂單</h1><p>輸入訂單編號和下單時的手機號碼，查看訂單進度與我們的訊息。</p></div>
      <form onSubmit={look}>
        <fieldset>
          <legend>訂單資料</legend>
          <div className="field"><label htmlFor="l-no">訂單編號<span className="req">必填</span></label><input id="l-no" type="text" autoCapitalize="characters" placeholder="例如：YJ20261011-ABC234" value={no} onChange={(e) => setNo(e.target.value)} /></div>
          <div className="field"><label htmlFor="l-phone">下單時的手機號碼<span className="req">必填</span></label><input id="l-phone" type="tel" inputMode="tel" placeholder="例如：0912345678" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <button className="btn block" type="submit" disabled={busy} style={{ marginBottom: 16 }}>{busy ? '查詢中…' : '查詢'}</button>
        </fieldset>
      </form>
      {err ? <div className="err-banner" role="alert">{err}</div> : null}
      {note ? <div className="ok-banner">{note}</div> : null}

      {data ? (
        <div>
          <div className="panel">
            <div className="rowline"><b style={{ fontVariantNumeric: 'tabular-nums' }}>{data.order_no}</b><span className={'badge ' + badge(data.status)}>{data.status}</span></div>
            <dl className="kv" style={{ marginTop: 10 }}>
              <dt>下單時間</dt><dd>{fmtTw(data.created_at)}</dd>
              <dt>商品</dt><dd>{data.item_name ? `${data.item_name} × ${data.quantity}` : '確認中'}</dd>
              <dt>金額</dt><dd>{data.total_amount != null ? money(data.total_amount) : '確認後通知'}</dd>
              <dt>付款</dt><dd>{data.pay_method}（{data.pay_status}）</dd>
              <dt>配送</dt><dd>{data.ship_method}</dd>
              <dt>物流單號</dt><dd>{data.tracking_no || '尚未出貨'}</dd>
            </dl>
          </div>

          {data.show_bank && bank ? (
            <div className="panel">
              <h3>轉帳資訊</h3>
              <dl className="kv">
                <dt>應付金額</dt><dd><b>{money(data.total_amount)}</b></dd>
                <dt>銀行</dt><dd>{bank.bank}</dd>
                <dt>帳號</dt><dd>{bank.account} <CopyButton text={bank.account} /></dd>
                <dt>戶名</dt><dd>{bank.holder}</dd>
              </dl>
              <p className="hint" style={{ margin: '10px 0' }}>請於確認後 5 天內付款。{data.transfer_last5 ? `已回報後五碼：${data.transfer_last5}，我們核對後會更新。` : ''}</p>
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="l5">轉帳帳號後五碼</label>
                <input id="l5" type="text" inputMode="numeric" maxLength={5} placeholder="您匯出款項的帳號後五碼" value={last5} onChange={(e) => setLast5(e.target.value.replace(/\D/g, ''))} />
              </div>
              <button className="btn block" type="button" style={{ marginTop: 12 }} onClick={sendLast5}>回報已轉帳</button>
            </div>
          ) : null}

          <div className="panel">
            <h3>訊息</h3>
            <div className="msgs">
              {data.messages.length ? data.messages.map((m, i) => (
                <div key={i} className={'msg' + (m.sender === 'customer' ? ' me' : '')}>
                  {m.body}
                  <small>{m.sender === 'shop' ? '葉界首選翡翠' : '您'}　{fmtTw(m.created_at)}</small>
                </div>
              )) : <p className="status-note">目前還沒有訊息，有進度我們會在這裡通知您。</p>}
            </div>
            <div className="field" style={{ margin: '12px 0 0' }}>
              <label htmlFor="lr-in">回覆我們</label>
              <textarea id="lr-in" placeholder="輸入想告訴我們的事" value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={500} />
            </div>
            <button className="btn block" type="button" style={{ marginTop: 12 }} onClick={sendMsg}>送出訊息</button>
            <p className="status-note" style={{ marginTop: 8 }}>我們回覆後不會另外通知，請定期回來查看。客服時間：中午 12:00～晚上 20:00。</p>
          </div>
        </div>
      ) : null}
      <div style={{ height: 40 }} />
    </>
  );
}

export default function LookupPage() {
  return (
    <div className="wrap">
      <SiteHeader back />
      <Suspense fallback={<div className="center">載入中…</div>}>
        <Inner />
      </Suspense>
    </div>
  );
}
