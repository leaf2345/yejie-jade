'use client';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { PAY_STATUSES, PAY_METHODS, SHIP_METHODS, STATUSES } from '@/lib/constants';
import { fmtTw } from '@/lib/clientFmt';

const money = (n) => 'NT$ ' + Number(n || 0).toLocaleString('en-US');
const badge = (s) => (s === '新訂單' ? 'new' : ['已取消', '已退款', '退款處理中'].includes(s) ? 'bad' : ['已完成', '已付款', '已出貨'].includes(s) ? 'go' : '');

class Unauth extends Error {}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method || 'GET',
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
  });
  if (res.status === 401) throw new Unauth('401');
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || '操作失敗，請稍後再試');
  return j;
}

/* ---------------- 登入 ---------------- */
function Login({ onDone }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function go(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await api('/api/admin/login', { method: 'POST', body: { email, password: pw } });
      onDone();
    } catch (x) {
      setErr(x.message === '401' ? '電子郵件或密碼不正確' : x.message);
    }
    setBusy(false);
  }
  return (
    <form className="adm-login" onSubmit={go}>
      <div className="logo">葉界首選翡翠<small>管理後台</small></div>
      {err ? <div className="err-banner" role="alert">{err}</div> : null}
      <div className="field"><label htmlFor="a-mail">管理員電子郵件</label><input id="a-mail" type="text" inputMode="email" autoComplete="username" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="field"><label htmlFor="a-pw">密碼</label><input id="a-pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
      <button className="btn block" type="submit" disabled={busy}>{busy ? '登入中…' : '登入'}</button>
    </form>
  );
}

/* ---------------- 總覽 ---------------- */
function Dashboard({ onGo }) {
  const [s, setS] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    api('/api/admin/stats').then(setS).catch((e) => { if (!(e instanceof Unauth)) setErr(e.message); else onGo('__unauth'); });
  }, [onGo]);
  if (err) return <div className="err-banner">{err}</div>;
  if (!s) return <div className="center">載入中…</div>;
  const cards = [
    ['今日新訂單', s.today, 'all'], ['待確認', s.pendingConfirm, '新訂單'], ['待付款', s.pendingPay, '待付款'],
    ['待出貨', s.pendingShip, '待出貨'], ['本月訂單數', s.monthOrders, 'all'],
  ];
  return (
    <div>
      <div className="grid4">
        {cards.map(([k, v, st]) => (
          <button key={k} type="button" className="stat" onClick={() => onGo('orders', st)}>
            <span className="k">{k}</span><span className="v">{v}</span>
          </button>
        ))}
      </div>
      <h3 style={{ margin: '22px 0 4px', fontSize: 19 }}>本月金額（依下單日期統計）</h3>
      <p className="status-note">三種金額分開計算，未付款的訂單不會算進實際收款。</p>
      <div className="money">
        <div className="mcard"><span className="k">成交金額</span><span className="s">已確認價格、尚未取消或退款的訂單總額（含未付款）</span><span className="v">{money(s.dealAmount)}</span></div>
        <div className="mcard gain"><span className="k">實際收款</span><span className="s">已收到的款項，扣除退款後的淨額</span><span className="v">{money(s.received)}</span></div>
        <div className="mcard loss"><span className="k">已退款</span><span className="s">已退還給客人的金額</span><span className="v">{money(s.refunded)}</span></div>
      </div>
    </div>
  );
}

/* ---------------- 訂單列表 ---------------- */
function OrdersList({ initialStatus, onOpen, onUnauth }) {
  const [status, setStatus] = useState(initialStatus || 'all');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const timer = useRef(null);

  const load = useCallback(async (st, query) => {
    setErr('');
    try {
      const j = await api(`/api/admin/orders?status=${encodeURIComponent(st)}&q=${encodeURIComponent(query)}`);
      setRows(j.orders);
    } catch (e) {
      if (e instanceof Unauth) onUnauth();
      else setErr(e.message);
    }
  }, [onUnauth]);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => load(status, q), q ? 300 : 0);
    return () => clearTimeout(timer.current);
  }, [status, q, load]);

  return (
    <div>
      <div className="toolbar">
        <input type="text" placeholder="搜尋訂單編號、姓名、蝦皮帳號、電話、日期（2026-10-11）" aria-label="搜尋訂單" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chips">
          {['all', ...STATUSES].map((s) => (
            <button key={s} type="button" className="chip" aria-pressed={status === s} onClick={() => setStatus(s)}>
              {s === 'all' ? '全部' : s === '新訂單' ? '新訂單／待確認' : s}
            </button>
          ))}
        </div>
      </div>
      {err ? <div className="err-banner">{err}</div> : null}
      {!rows ? <div className="center">載入中…</div> : (
        <div className="olist">
          {rows.length ? rows.map((o) => (
            <button key={o.id} type="button" className="orow" onClick={() => onOpen(o.id)}>
              <div className="top">
                <span className="no">{o.order_no}</span>
                <span>
                  {o.customer_replied ? <span className="badge new">客人有新回覆 </span> : null}
                  <span className={'badge ' + badge(o.status)}>{o.status}</span>
                </span>
              </div>
              <div>{o.customer_name}　{o.item_name || '待確認商品'}{o.item_name ? ` × ${o.quantity}` : ''}</div>
              <div className="meta">{fmtTw(o.created_at)}　{o.total_amount != null ? money(o.total_amount) : `客人填 ${o.amount_text || '-'}`}　{o.pay_status}</div>
            </button>
          )) : <p style={{ color: 'var(--muted)', padding: '20px 0' }}>沒有符合的訂單。</p>}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <a className="btn ghost small" href={`/api/admin/export?status=${encodeURIComponent(status)}`}>匯出 CSV（Excel 可開）</a>
        <span className="status-note">匯出目前篩選狀態的訂單，建議每週匯出一次備份。</span>
      </div>
    </div>
  );
}

/* ---------------- 訂單詳情 ---------------- */
function Lightbox({ src, onClose }) {
  const [z, setZ] = useState(1);
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="lightbox" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <img className="lb-img" src={src} alt="放大檢視截圖" style={{ transform: `scale(${z})` }} />
      <div className="bar">
        <button type="button" onClick={() => setZ((v) => Math.min(3, v + 0.5))}>放大</button>
        <button type="button" onClick={() => setZ((v) => Math.max(1, v - 0.5))}>縮小</button>
        <button type="button" onClick={onClose}>關閉</button>
      </div>
    </div>
  );
}

const numStr = (v) => (v == null ? '' : String(v));

function OrderDetail({ id, onBack, onOpen, onUnauth, toast }) {
  const [d, setD] = useState(null);
  const [f, setF] = useState(null);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setErr('');
    try {
      const j = await api(`/api/admin/orders/${id}`);
      setD(j);
      const o = j.order;
      setF({
        item_name: o.item_name || '', item_code: o.item_code || '', quantity: numStr(o.quantity),
        unit_price: numStr(o.unit_price), shipping_fee: numStr(o.shipping_fee), total_amount: numStr(o.total_amount),
        status: o.status, pay_status: o.pay_status, pay_method: o.pay_method, ship_method: o.ship_method,
        paid_amount: numStr(o.paid_amount), refund_amount: numStr(o.refund_amount),
        tracking_no: o.tracking_no || '', admin_note: o.admin_note || '',
      });
    } catch (e) {
      if (e instanceof Unauth) onUnauth();
      else setErr(e.message);
    }
  }, [id, onUnauth]);

  useEffect(() => { setD(null); load(); }, [load]);

  if (err) return <div><button className="btn ghost small" onClick={onBack}>← 回訂單列表</button><div className="err-banner" style={{ marginTop: 12 }}>{err}</div></div>;
  if (!d || !f) return <div className="center">載入中…</div>;
  const o = d.order;

  const set = (k) => (e) => setF((p) => {
    const next = { ...p, [k]: e.target.value };
    if (['unit_price', 'quantity', 'shipping_fee'].includes(k) && next.unit_price !== '') {
      const price = Number(next.unit_price);
      const qty = Number(next.quantity) || 1;
      const ship = Number(next.shipping_fee) || 0;
      if (Number.isFinite(price)) next.total_amount = String(price * qty + ship);
    }
    return next;
  });

  async function save() {
    setSaving(true);
    try {
      const body = { ...f };
      for (const k of ['quantity', 'unit_price', 'shipping_fee', 'total_amount', 'paid_amount', 'refund_amount']) {
        body[k] = body[k] === '' ? (k === 'quantity' ? 1 : k === 'paid_amount' || k === 'refund_amount' ? 0 : null) : Number(body[k]);
      }
      await api(`/api/admin/orders/${id}`, { method: 'PATCH', body });
      toast('已儲存');
      await load();
    } catch (e) {
      if (e instanceof Unauth) onUnauth(); else toast(e.message, true);
    }
    setSaving(false);
  }

  async function send() {
    if (!msg.trim()) return;
    try {
      await api(`/api/admin/orders/${id}/message`, { method: 'POST', body: { body: msg } });
      setMsg('');
      toast('訊息已送出');
      await load();
    } catch (e) {
      if (e instanceof Unauth) onUnauth(); else toast(e.message, true);
    }
  }

  return (
    <div>
      <button className="btn ghost small" type="button" onClick={onBack} style={{ marginBottom: 14 }}>← 回訂單列表</button>
      <div className="panel">
        <div className="rowline"><b style={{ fontVariantNumeric: 'tabular-nums' }}>{o.order_no}</b><span className={'badge ' + badge(o.status)}>{o.status}</span></div>
        <p className="status-note">下單時間 {fmtTw(o.created_at)}</p>
      </div>

      <div className="panel">
        <h3>客人截圖（點圖放大）</h3>
        {d.images.length ? (
          <div className="shots">
            {d.images.map((im, i) => (
              <button key={im.id} type="button" aria-label={`放大第 ${i + 1} 張`} onClick={() => im.url && setZoom(im.url)}>
                {im.url ? <img src={im.url} alt={`截圖 ${i + 1}`} /> : '圖片讀取失敗'}
              </button>
            ))}
          </div>
        ) : <p className="status-note">沒有截圖。</p>}
      </div>

      <div className="panel">
        <h3>客人資料</h3>
        <dl className="kv">
          <dt>稱呼</dt><dd>{o.customer_name}</dd>
          <dt>蝦皮帳號</dt><dd>{o.shopee_account}</dd>
          <dt>電話</dt><dd>{o.phone}</dd>
          <dt>客人填的金額</dt><dd>{o.amount_text || '-'}</dd>
          <dt>客人備註</dt><dd>{o.customer_note || '（無）'}</dd>
          <dt>收件人</dt><dd>{o.receiver_name}　{o.receiver_phone}</dd>
          <dt>門市／地址</dt><dd>{o.receiver_address}</dd>
        </dl>
      </div>

      <div className="panel">
        <h3>商品與金額</h3>
        <div className="field"><label htmlFor="d-item">商品名稱</label><input id="d-item" type="text" value={f.item_name} onChange={set('item_name')} placeholder="對照截圖後填寫" /></div>
        <div className="two">
          <div className="field"><label htmlFor="d-code">商品編號</label><input id="d-code" type="text" value={f.item_code} onChange={set('item_code')} /></div>
          <div className="field"><label htmlFor="d-qty">數量</label><input id="d-qty" type="number" inputMode="numeric" value={f.quantity} onChange={set('quantity')} /></div>
        </div>
        <div className="two">
          <div className="field"><label htmlFor="d-price">成交單價</label><input id="d-price" type="number" inputMode="numeric" value={f.unit_price} onChange={set('unit_price')} /></div>
          <div className="field"><label htmlFor="d-ship">運費</label><input id="d-ship" type="number" inputMode="numeric" value={f.shipping_fee} onChange={set('shipping_fee')} /></div>
        </div>
        <div className="field"><label htmlFor="d-total">訂單總金額</label><input id="d-total" type="number" inputMode="numeric" value={f.total_amount} onChange={set('total_amount')} /><span className="hint">填單價、數量、運費後會自動計算，也可以手動修改。</span></div>
      </div>

      <div className="panel">
        <h3>狀態、付款與出貨</h3>
        <div className="field"><label htmlFor="d-status">訂單狀態</label><select id="d-status" value={f.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div className="field"><label htmlFor="d-paym">付款方式</label><select id="d-paym" value={f.pay_method} onChange={set('pay_method')}>{PAY_METHODS.map((s) => <option key={s}>{s}</option>)}</select>
          {o.transfer_last5 ? <span className="hint">客人回報的轉帳後五碼：<b>{o.transfer_last5}</b>，請到銀行紀錄核對。</span> : null}</div>
        <div className="field"><label htmlFor="d-pay">付款狀態</label><select id="d-pay" value={f.pay_status} onChange={set('pay_status')}>{PAY_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div className="two">
          <div className="field"><label htmlFor="d-paid">實收金額</label><input id="d-paid" type="number" inputMode="numeric" value={f.paid_amount} onChange={set('paid_amount')} /></div>
          <div className="field"><label htmlFor="d-refund">退款金額</label><input id="d-refund" type="number" inputMode="numeric" value={f.refund_amount} onChange={set('refund_amount')} /></div>
        </div>
        <span className="hint" style={{ display: 'block', marginBottom: 14 }}>付款狀態改成「已付款」或「已退款」時，沒填的金額會自動帶入。</span>
        <div className="field"><label htmlFor="d-shipm">配送方式</label><select id="d-shipm" value={f.ship_method} onChange={set('ship_method')}>{SHIP_METHODS.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div className="field"><label htmlFor="d-track">物流單號</label><input id="d-track" type="text" value={f.tracking_no} onChange={set('tracking_no')} /></div>
        <div className="field"><label htmlFor="d-note">管理員備註（只有後台看得到）</label><textarea id="d-note" value={f.admin_note} onChange={set('admin_note')} /></div>
        <button className="btn block" type="button" onClick={save} disabled={saving}>{saving ? '儲存中…' : '儲存變更'}</button>
      </div>

      <div className="panel">
        <h3>傳訊息給客人</h3>
        <div className="msgs">
          {d.messages.length ? d.messages.map((m) => (
            <div key={m.id} className={'msg' + (m.sender === 'shop' ? ' me' : '')}>{m.body}<small>{m.sender === 'shop' ? '店家' : '客人'}　{fmtTw(m.created_at)}</small></div>
          )) : <p className="status-note">還沒有訊息。</p>}
        </div>
        <div className="field" style={{ margin: '12px 0 0' }}><label htmlFor="d-msg">新訊息</label><textarea id="d-msg" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="客人到「查詢訂單」頁就會看到" maxLength={1000} /></div>
        <button className="btn block" type="button" style={{ marginTop: 12 }} onClick={send}>送出訊息</button>
        <p className="status-note" style={{ marginTop: 8 }}>訊息只會出現在客人的「查詢訂單」頁，不會推播通知。</p>
      </div>

      <div className="panel">
        <h3>同一位客人的歷史訂單（依電話比對）</h3>
        {d.history.length ? (
          <div className="hist">
            {d.history.map((h) => (
              <Fragment key={h.id}>
                <button type="button" className="orow" onClick={() => onOpen(h.id)}>
                  <div className="top"><span className="no">{h.order_no}</span><span className={'badge ' + badge(h.status)}>{h.status}</span></div>
                  <div className="meta">{fmtTw(h.created_at)}　{h.item_name || '待確認'}　{h.total_amount != null ? money(h.total_amount) : ''}</div>
                </button>
              </Fragment>
            ))}
          </div>
        ) : <p className="status-note">這是此客人的第一筆訂單。</p>}
      </div>
      {zoom ? <Lightbox src={zoom} onClose={() => setZoom(null)} /> : null}
    </div>
  );
}

/* ---------------- 設定 ---------------- */
function Settings({ onUnauth, toast }) {
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api('/api/admin/settings').then((j) => setS(j.settings)).catch((e) => { if (e instanceof Unauth) onUnauth(); else toast(e.message, true); });
  }, [onUnauth, toast]);
  if (!s) return <div className="center">載入中…</div>;
  const set = (k) => (e) => setS((p) => ({ ...p, [k]: e.target.value }));
  async function save() {
    setBusy(true);
    try {
      await api('/api/admin/settings', { method: 'PUT', body: s });
      toast('已儲存，前台首頁會同步更新');
    } catch (e) {
      if (e instanceof Unauth) onUnauth(); else toast(e.message, true);
    }
    setBusy(false);
  }
  return (
    <div className="panel">
      <h3>直播時間與連結</h3>
      <div className="field"><label htmlFor="s1">場次一</label><input id="s1" type="text" value={s.live_slot_1} onChange={set('live_slot_1')} placeholder="例如：週六 13:30～17:30" /></div>
      <div className="field"><label htmlFor="s2">場次二</label><input id="s2" type="text" value={s.live_slot_2} onChange={set('live_slot_2')} placeholder="例如：週日 20:30～00:30" /></div>
      <div className="field"><label htmlFor="slink">直播連結（蝦皮）</label><input id="slink" type="text" value={s.live_link} onChange={set('live_link')} placeholder="https://" /></div>
      <button className="btn block" type="button" onClick={save} disabled={busy}>{busy ? '儲存中…' : '儲存並更新前台'}</button>
      <p className="status-note" style={{ marginTop: 8 }}>日期與時間之間請用空格隔開，例如「週六 13:30～17:30」。</p>
    </div>
  );
}

/* ---------------- 主程式 ---------------- */
export default function AdminApp() {
  const [authed, setAuthed] = useState(null);
  const [email, setEmail] = useState('');
  const [tab, setTab] = useState('dash');
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const tt = useRef(null);

  const toast = useCallback((m, bad) => {
    setToastMsg({ m, bad });
    clearTimeout(tt.current);
    tt.current = setTimeout(() => setToastMsg(null), 3500);
  }, []);

  const checkMe = useCallback(async () => {
    try {
      const j = await api('/api/admin/me');
      setEmail(j.email || '');
      setAuthed(true);
    } catch {
      setAuthed(false);
    }
  }, []);
  useEffect(() => { checkMe(); }, [checkMe]);

  const onUnauth = useCallback(() => { setAuthed(false); toast('登入已過期，請重新登入', true); }, [toast]);

  const go = useCallback((t, st) => {
    if (t === '__unauth') { onUnauth(); return; }
    if (t === 'orders') { setFilter(st || 'all'); setOpenId(null); }
    setTab(t);
    window.scrollTo(0, 0);
  }, [onUnauth]);

  async function logout() {
    try { await api('/api/admin/logout', { method: 'POST' }); } catch {}
    setAuthed(false);
  }

  if (authed === null) return <div className="wrap"><div className="center">載入中…</div></div>;
  if (!authed) return <div className="wrap"><Login onDone={checkMe} />{toastMsg ? <div className="toast">{toastMsg.m}</div> : null}</div>;

  return (
    <div className="wrap">
      <div className="adm-top"><h1>訂單後台</h1><button className="btn ghost small" type="button" onClick={logout}>登出</button></div>
      <p className="status-note" style={{ marginTop: -4, marginBottom: 8 }}>{email}</p>
      <div className="tabs" role="tablist">
        {[['dash', '總覽'], ['orders', '訂單'], ['settings', '設定']].map(([k, label]) => (
          <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => { setTab(k); if (k === 'orders') { setOpenId(null); setFilter('all'); } }}>{label}</button>
        ))}
      </div>
      {tab === 'dash' ? <Dashboard onGo={go} /> : null}
      {tab === 'orders' ? (
        openId
          ? <OrderDetail key={openId} id={openId} onBack={() => setOpenId(null)} onOpen={(i) => { setOpenId(i); window.scrollTo(0, 0); }} onUnauth={onUnauth} toast={toast} />
          : <OrdersList key={filter} initialStatus={filter} onOpen={(i) => { setOpenId(i); window.scrollTo(0, 0); }} onUnauth={onUnauth} />
      ) : null}
      {tab === 'settings' ? <Settings onUnauth={onUnauth} toast={toast} /> : null}
      {toastMsg ? <div className="toast" style={toastMsg.bad ? { background: 'var(--bad)', color: '#fff' } : undefined}>{toastMsg.m}</div> : null}
      <div style={{ height: 60 }} />
    </div>
  );
}
