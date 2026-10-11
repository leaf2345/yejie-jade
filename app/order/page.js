'use client';
import { Fragment, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import { MAX_IMAGES, MAX_IMAGE_BYTES, MAX_TOTAL_BYTES } from '@/lib/constants';

const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const isMobile = (v) => /^09\d{8}$/.test(String(v || '').replace(/[\s-]/g, ''));

// 手機截圖通常很大，上傳前先縮小，速度快也比較不會失敗
async function compress(file, maxDim = 1600, quality = 0.85) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  if (bmp.close) bmp.close();
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
  if (!blob) throw new Error('compress failed');
  return blob;
}

function Field({ k, label, children, hint, optional, err }) {
  return (
    <div className={'field' + (err ? ' err' : '')} data-f={k}>
      <label htmlFor={'f-' + k}>{label}{optional ? <span className="opt">選填</span> : <span className="req">必填</span>}</label>
      {children}
      {hint ? <span className="hint">{hint}</span> : null}
      <span className="errmsg">{err}</span>
    </div>
  );
}

const empty = {
  customer_name: '', phone: '', shopee_account: '', amount_text: '', customer_note: '',
  ship_method: '超商店到店', pay_method: '銀行轉帳', receiver_name: '', receiver_phone: '', receiver_address: '',
};

export default function OrderPage() {
  const router = useRouter();
  const [f, setF] = useState(empty);
  const [imgs, setImgs] = useState([]); // {id, blob, url}
  const [errs, setErrs] = useState({});
  const [step, setStep] = useState('form');
  const [busy, setBusy] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [banner, setBanner] = useState('');
  const [hp, setHp] = useState('');
  const sending = useRef(false);
  const seq = useRef(0);

  const set = (k) => (e) => {
    setF((p) => ({ ...p, [k]: e.target.value }));
    setErrs((p) => ({ ...p, [k]: false }));
  };
  const cvs = f.ship_method === '超商店到店';

  async function onFiles(e) {
    const list = Array.from(e.target.files || []);
    e.target.value = '';
    if (!list.length) return;
    setBanner('');
    setProcessing(true);
    const notes = [];
    const added = [];
    let room = MAX_IMAGES - imgs.length;
    for (const file of list) {
      if (room <= 0) { notes.push(`最多只能上傳 ${MAX_IMAGES} 張`); break; }
      if (!OK_TYPES.includes(file.type)) { notes.push(`${file.name}：格式不支援（請用 JPG、PNG、WebP）`); continue; }
      if (file.size > MAX_IMAGE_BYTES) { notes.push(`${file.name}：超過 5MB`); continue; }
      try {
        const blob = await compress(file);
        added.push({ id: ++seq.current, blob, url: URL.createObjectURL(blob) });
        room -= 1;
      } catch {
        notes.push(`${file.name}：讀取失敗，請換一張`);
      }
    }
    setImgs((p) => [...p, ...added]);
    if (added.length) setErrs((p) => ({ ...p, shots: false }));
    if (notes.length) setBanner(notes.slice(0, 3).join('；'));
    setProcessing(false);
  }

  function removeImg(id) {
    setImgs((p) => {
      const t = p.find((x) => x.id === id);
      if (t) URL.revokeObjectURL(t.url);
      return p.filter((x) => x.id !== id);
    });
  }

  function validate() {
    const e = {};
    if (!f.customer_name.trim()) e.customer_name = '請填寫姓名或稱呼';
    if (!isMobile(f.phone)) e.phone = '請填寫正確的手機號碼（09 開頭共 10 碼）';
    if (!f.shopee_account.trim()) e.shopee_account = '請填寫蝦皮帳號名稱';
    if (imgs.length < 1) e.shots = '請至少上傳 1 張商品截圖';
    if (!/^\d{1,7}$/.test(f.amount_text.replace(/[,\s]/g, ''))) e.amount_text = '請填寫金額（數字）';
    if (!f.receiver_name.trim()) e.receiver_name = '請填寫收件人姓名';
    if (!isMobile(f.receiver_phone)) e.receiver_phone = '請填寫正確的手機號碼（09 開頭共 10 碼）';
    if (f.receiver_address.trim().length < (cvs ? 2 : 8)) e.receiver_address = cvs ? '請填寫取貨門市' : '請填寫完整郵寄地址';
    setErrs(e);
    const first = Object.keys(e)[0];
    if (first) {
      setBanner(`有 ${Object.keys(e).length} 個欄位需要補填或修正`);
      const el = document.querySelector(`[data-f="${first}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  }

  function goReview(ev) {
    ev.preventDefault();
    setBanner('');
    if (validate()) {
      const total = imgs.reduce((s, i) => s + i.blob.size, 0);
      if (total > MAX_TOTAL_BYTES) {
        setBanner('圖片總大小太大，請減少張數或換較小的圖片。');
        return;
      }
      setStep('review');
      window.scrollTo(0, 0);
    }
  }

  async function submit() {
    if (sending.current) return; // 防止重複點擊
    sending.current = true;
    setBusy(true);
    setBanner('');
    try {
      const fd = new FormData();
      Object.entries(f).forEach(([k, v]) => fd.append(k, v));
      fd.append('website', hp);
      imgs.forEach((im, i) => fd.append('images', new File([im.blob], `shot-${i + 1}.jpg`, { type: 'image/jpeg' })));
      const res = await fetch('/api/order', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner(data.error || (res.status === 413 ? '圖片太大，請減少張數後再試。' : '送出失敗，請稍後再試。'));
        sending.current = false;
        setBusy(false);
        return;
      }
      imgs.forEach((i) => URL.revokeObjectURL(i.url));
      router.push(`/order/success?no=${encodeURIComponent(data.orderNo)}&pay=${f.pay_method === '銀行轉帳' ? 'bank' : 'cod'}`);
    } catch {
      setBanner('網路不穩，訂單可能沒有送出。請確認網路後再按一次（重複按不會產生兩筆訂單）。');
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="wrap">
      <SiteHeader back />
      {banner ? <div className="err-banner" role="alert">{banner}</div> : null}

      {step === 'form' ? (
        <form onSubmit={goReview} noValidate>
          <div className="page-title"><h1>直播下單</h1><p>不需要註冊。標示 <span className="req" style={{ margin: 0 }}>必填</span> 的欄位請填寫。</p></div>
          <div className="how"><b>怎麼做？</b> 直播看到喜歡的翡翠，截圖「單字＋翡翠（同一張）」，也就是紙卡（價格、蝦皮帳號名稱、綁邊需求）和翡翠要一起入鏡；回到這裡上傳截圖，再填資料送出。</div>

          <div className="hp" aria-hidden="true">
            <label htmlFor="f-website">請勿填寫此欄</label>
            <input id="f-website" type="text" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
          </div>

          <fieldset>
            <legend>1. 您的資料</legend>
            <Field k="customer_name" err={errs.customer_name} label="姓名或稱呼">
              <input id="f-customer_name" type="text" autoComplete="name" placeholder="例如：陳小姐" value={f.customer_name} onChange={set('customer_name')} maxLength={50} />
            </Field>
            <Field k="shopee_account" err={errs.shopee_account} label="蝦皮帳號名稱" hint="用來對照直播紙卡，請照蝦皮上的帳號名稱填寫。">
              <input id="f-shopee_account" type="text" autoCapitalize="none" placeholder="跟直播紙卡上寫的一樣" value={f.shopee_account} onChange={set('shopee_account')} maxLength={80} />
            </Field>
            <Field k="phone" err={errs.phone} label="聯絡電話">
              <input id="f-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="例如：0912345678" value={f.phone} onChange={set('phone')} maxLength={20} />
            </Field>
          </fieldset>

          <fieldset>
            <legend>2. 商品截圖</legend>
            <div className={'field' + (errs.shots ? ' err' : '')} data-f="shots">
              <div className="lab">上傳直播截圖<span className="req">必填</span></div>
              <div className="drop">
                <span className="big">從相簿選擇截圖</span>
                <label className="btn" htmlFor="f-files" style={{ cursor: 'pointer' }}>{processing ? '處理中…' : '選擇照片'}</label>
                <input id="f-files" className="file-input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onFiles} disabled={processing || imgs.length >= MAX_IMAGES} />
                <span className="hint">可選多張。JPG、PNG、WebP，每張 5MB 以內，最多 {MAX_IMAGES} 張。</span>
              </div>
              <div className="thumbs">
                {imgs.map((im, i) => (
                  <div className="thumb" key={im.id}>
                    <img src={im.url} alt={`截圖 ${i + 1}`} />
                    <span className="n">第 {i + 1} 張</span>
                    <button type="button" className="x" aria-label={`刪除第 ${i + 1} 張`} onClick={() => removeImg(im.id)}>×</button>
                  </div>
                ))}
              </div>
              <span className="errmsg">{errs.shots}</span>
            </div>
            <Field k="amount_text" err={errs.amount_text} label="購買數量（打上金額即可）" hint="照直播紙卡上的金額填寫即可。">
              <input id="f-amount_text" type="text" inputMode="numeric" placeholder="例如：400" value={f.amount_text} onChange={set('amount_text')} maxLength={12} />
            </Field>
            <Field k="customer_note" err={errs.customer_note} label="訂單備註（綁邊需求可寫這裡）" optional>
              <textarea id="f-customer_note" placeholder="例如：要綁邊、想要黑色繩、手圍 15.5 公分" value={f.customer_note} onChange={set('customer_note')} maxLength={500} />
            </Field>
          </fieldset>

          <fieldset>
            <legend>3. 收件與配送</legend>
            <div className="field">
              <div className="lab">配送方式<span className="req">必填</span></div>
              <div className="radios">
                {['超商店到店', '郵寄（中華郵政）'].map((v) => (
                  <label className="radio" key={v}>
                    <input type="radio" name="ship" checked={f.ship_method === v} onChange={() => setF((p) => ({ ...p, ship_method: v }))} />
                    <span>{v === '超商店到店' ? '超商店到店（7-11／全家）' : v}</span>
                  </label>
                ))}
              </div>
              <span className="hint">訂單滿 NT$200 免運。</span>
            </div>
            <div className="field">
              <div className="lab">付款方式<span className="req">必填</span></div>
              <div className="radios">
                {['銀行轉帳', '貨到付款'].map((v) => (
                  <label className="radio" key={v}>
                    <input type="radio" name="pay" checked={f.pay_method === v} onChange={() => setF((p) => ({ ...p, pay_method: v }))} />
                    <span>{v}</span>
                  </label>
                ))}
              </div>
              <span className="hint">不需要現在付款。我們確認商品與金額後會通知，請於確認後 5 天內付款。</span>
            </div>
            <Field k="receiver_name" err={errs.receiver_name} label="收件人姓名">
              <input id="f-receiver_name" type="text" placeholder="請填真實姓名，超商取貨需核對" value={f.receiver_name} onChange={set('receiver_name')} maxLength={50} />
            </Field>
            <Field k="receiver_phone" err={errs.receiver_phone} label="收件人電話">
              <input id="f-receiver_phone" type="tel" inputMode="tel" placeholder="例如：0912345678" value={f.receiver_phone} onChange={set('receiver_phone')} maxLength={20} />
            </Field>
            <Field k="receiver_address" err={errs.receiver_address} label={cvs ? '取貨門市（店名或店號）' : '郵寄地址'}>
              <input id="f-receiver_address" type="text" placeholder={cvs ? '例如：7-11 ○○門市' : '縣市、區、路街、門牌、樓層'} value={f.receiver_address} onChange={set('receiver_address')} maxLength={200} />
            </Field>
          </fieldset>

          <button className="btn block" type="submit" style={{ minHeight: 60, fontSize: 20 }}>下一步：檢查訂單內容</button>
          <div style={{ height: 40 }} />
        </form>
      ) : (
        <div>
          <div className="page-title"><h1>請檢查訂單</h1><p>確認無誤後再送出。要修改請按「回去修改」。</p></div>
          <div className="review">
            <dl>
              {[
                ['稱呼', f.customer_name], ['蝦皮帳號', f.shopee_account], ['聯絡電話', f.phone],
                ['購買數量（金額）', f.amount_text], ['備註', f.customer_note || '（無）'],
                ['配送方式', f.ship_method], ['付款方式', f.pay_method],
                ['收件人', f.receiver_name], ['收件人電話', f.receiver_phone],
                [cvs ? '取貨門市' : '郵寄地址', f.receiver_address], ['商品截圖', `${imgs.length} 張`],
              ].map(([k, v]) => (
                <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>
              ))}
            </dl>
            <div className="thumbs" style={{ marginTop: 14 }}>
              {imgs.map((im, i) => (
                <div className="thumb" key={im.id}><img src={im.url} alt={`截圖 ${i + 1}`} /><span className="n">第 {i + 1} 張</span></div>
              ))}
            </div>
          </div>
          <div className="actions">
            <button className="btn ghost" type="button" onClick={() => { setStep('form'); setBanner(''); window.scrollTo(0, 0); }} disabled={busy}>回去修改</button>
            <button className="btn" type="button" onClick={submit} disabled={busy}>{busy ? '送出中…請稍候' : '確認送出訂單'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
