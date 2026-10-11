import SiteHeader from '@/components/SiteHeader';
import { BANK, SERVICE_HOURS } from '@/lib/constants';

export const metadata = { title: '購物須知｜葉界首選翡翠' };

const Pending = ({ children }) => <span className="pending">{children}</span>;

export default function Notice() {
  return (
    <div className="wrap">
      <SiteHeader back />
      <div className="page-title"><h1>購物須知</h1><p>下單前請先看，有問題歡迎直接問我們。</p></div>

      <section className="block">
        <h2>下單流程</h2>
        <ol className="steps">
          <li><div>直播中看到喜歡的翡翠，截圖「紙卡＋翡翠」（同一張）。</div></li>
          <li><div>到「直播下單」上傳截圖並填寫資料。</div></li>
          <li><div>我們確認商品與金額後通知您，下單才算成立。</div></li>
          <li><div>確認後 5 天內付款，收款後安排出貨。</div></li>
        </ol>
      </section>

      <section className="block">
        <h2>付款方式</h2>
        <p>提供銀行轉帳與貨到付款。信用卡預計之後開放。確認商品與金額後，請於 5 天內付款。</p>
        <p style={{ marginTop: 10 }}>選擇銀行轉帳的客人，送出訂單後會看到匯款帳戶（{BANK.bank}）。轉帳完成後，請到「查詢訂單」回報轉帳帳號後五碼，方便我們核對。</p>
        <p style={{ marginTop: 10 }}><Pending>待商家確認</Pending> 貨到付款是否有手續費。</p>
      </section>

      <section className="block">
        <h2>配送與運費</h2>
        <p>配送方式：超商店到店（7-11／全家）、中華郵政郵寄。訂單滿 NT$200 免運。出貨時間較長的訂單，需 14～21 天。</p>
        <p style={{ marginTop: 10 }}><Pending>待商家確認</Pending> 未滿 NT$200 的運費金額。</p>
      </section>

      <section className="block">
        <h2>退換貨及退款政策</h2>
        <p>翡翠若有破損，可以寄回處理或退款。</p>
        <p style={{ marginTop: 10 }}><Pending>待商家確認</Pending> 寄回運費由誰負擔、申請期限，以及客製化編綁商品的規則。</p>
      </section>

      <section className="block">
        <h2>隱私權政策</h2>
        <p>我們收集的資料有：您的稱呼、聯絡電話、蝦皮帳號名稱、收件資料，以及您上傳的商品截圖。這些資料只用來處理您的訂單、聯絡您，以及出貨與售後服務，不會販售或提供給無關的第三方（配送時，必要的收件資料會提供給物流業者）。</p>
        <p style={{ marginTop: 10 }}>訂單資料與截圖只有授權的管理員可以查看。如需查詢、更正或刪除您的資料，請聯絡我們。</p>
        <p style={{ marginTop: 10 }}><Pending>待商家確認</Pending> 資料保存期限、商家名稱與聯絡地址。</p>
      </section>

      <section className="block">
        <h2>聯絡我們</h2>
        <p>Instagram：@leaf.2345</p>
        <p>客服時間：{SERVICE_HOURS}</p>
        <p style={{ marginTop: 10 }}><Pending>待商家確認</Pending> 商家名稱、統一編號、聯絡地址。</p>
      </section>
      <div style={{ height: 40 }} />
    </div>
  );
}
