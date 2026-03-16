import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "退換貨政策",
  description: "霧抉茶退換貨政策，包含七天鑑賞期、退貨流程、退款方式及不接受退貨之例外情況說明。",
  alternates: { canonical: "/return-policy" },
};

export default function ReturnPolicyPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-tea-text py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-tea-green/10 rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-tea-green/8 rounded-full" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <p className="text-tea-green text-xs tracking-[0.3em] uppercase mb-5">
            Return Policy
          </p>
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-tea-cream-light mb-6">
            退換貨政策
          </h1>
          <div className="w-10 h-0.5 bg-tea-green mx-auto mb-6" />
          <p className="text-tea-green-pale text-base max-w-xl mx-auto leading-relaxed">
            我們希望您對每一次購買都感到滿意，<br />
            如有任何問題請隨時聯繫我們。
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="bg-tea-cream py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

          {/* 七天鑑賞期 */}
          <div className="bg-white rounded-2xl shadow-sm border border-tea-cream-dark/30 p-8 md:p-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-full bg-tea-green/20 flex items-center justify-center flex-shrink-0">
                <span className="text-tea-green font-bold text-sm">1</span>
              </div>
              <h2 className="font-serif text-lg font-bold text-tea-text">七天鑑賞期保障</h2>
            </div>
            <p className="text-sm text-tea-text/70 leading-8">
              依據《消費者保護法》第 19 條，您享有收到商品後 <strong className="text-tea-text">7 天猶豫期（鑑賞期）</strong>，無須說明理由即可申請退貨。
            </p>
            <div className="mt-4 p-4 bg-tea-cream rounded-xl border border-tea-cream-dark/30 text-sm text-tea-text/60 leading-7">
              <strong className="text-tea-text/80">重要說明：</strong>鑑賞期為「檢視商品的合理期間」，並非試用期。商品應保持全新未拆封狀態，請勿拆封或使用後再申請退貨，以免影響您的退貨權利。
            </div>
          </div>

          {/* 退貨流程 */}
          <div className="bg-white rounded-2xl shadow-sm border border-tea-cream-dark/30 p-8 md:p-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-full bg-tea-green/20 flex items-center justify-center flex-shrink-0">
                <span className="text-tea-green font-bold text-sm">2</span>
              </div>
              <h2 className="font-serif text-lg font-bold text-tea-text">退貨流程</h2>
            </div>
            <ol className="space-y-5">
              {[
                {
                  step: "聯繫我們",
                  desc: "請於收到商品後 7 天內，致電 0972-619-391 或來信至 qdbzdt2846@gmail.com，告知訂單編號、退貨品項及退貨原因。",
                },
                {
                  step: "確認退貨資格",
                  desc: "我們將於 2 個工作天內與您確認退貨資格及後續退貨方式。",
                },
                {
                  step: "寄回商品",
                  desc: "請將商品連同原包裝、贈品（如有）及發票一同寄回。退貨運費由消費者負擔；若商品有瑕疵或寄送錯誤，則由本店負擔運費。",
                },
                {
                  step: "確認收到退貨",
                  desc: "本店收到退貨商品並確認狀態後，將於 3 個工作天內安排退款。",
                },
              ].map(({ step, desc }, i) => (
                <li key={i} className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-tea-green/15 flex items-center justify-center mt-0.5">
                    <span className="text-xs font-bold text-tea-green">{i + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-tea-text mb-1">{step}</p>
                    <p className="text-sm text-tea-text/65 leading-7">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* 退款方式 */}
          <div className="bg-white rounded-2xl shadow-sm border border-tea-cream-dark/30 p-8 md:p-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-full bg-tea-green/20 flex items-center justify-center flex-shrink-0">
                <span className="text-tea-green font-bold text-sm">3</span>
              </div>
              <h2 className="font-serif text-lg font-bold text-tea-text">退款方式</h2>
            </div>
            <div className="space-y-4 text-sm text-tea-text/70 leading-8">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-tea-cream/60 border border-tea-cream-dark/20">
                <span className="text-tea-green font-bold flex-shrink-0 mt-0.5">●</span>
                <div>
                  <p className="font-semibold text-tea-text mb-1">線上刷卡付款</p>
                  <p>退款將退回原信用卡帳戶，依各發卡銀行作業時程，約需 7–14 個工作天入帳。</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-tea-cream/60 border border-tea-cream-dark/20">
                <span className="text-tea-green font-bold flex-shrink-0 mt-0.5">●</span>
                <div>
                  <p className="font-semibold text-tea-text mb-1">貨到付款</p>
                  <p>退款將以銀行轉帳方式退還，請提供您的銀行帳戶資訊（銀行名稱、分行、帳號、戶名）。退款將於確認退貨後 3 個工作天內匯出。</p>
                </div>
              </div>
            </div>
          </div>

          {/* 不接受退貨之例外 */}
          <div className="bg-white rounded-2xl shadow-sm border border-tea-cream-dark/30 p-8 md:p-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-full bg-tea-green/20 flex items-center justify-center flex-shrink-0">
                <span className="text-tea-green font-bold text-sm">4</span>
              </div>
              <h2 className="font-serif text-lg font-bold text-tea-text">不接受退貨的例外情況</h2>
            </div>
            <p className="text-sm text-tea-text/65 leading-7 mb-5">
              依《消費者保護法》第 19 條第 2 項及相關規定，下列情況不適用 7 天鑑賞期：
            </p>
            <ul className="space-y-3">
              {[
                "商品已拆封開封（茶葉、食品類因衛生安全考量，一經拆封即不接受退貨）",
                "商品非因瑕疵而人為損壞、污損或缺少配件",
                "超過收到商品後 7 天之鑑賞期限",
                "商品因消費者不當使用、保存不當導致變質或損壞",
                "已使用或試用之商品",
                "訂製、客製化商品",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-tea-text/70 leading-7">
                  <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 110 18A9 9 0 0112 3z" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200/60 rounded-xl text-sm text-amber-800/80 leading-7">
              <strong>特別說明：</strong>霧抉茶產品為農產食品，為維護食品安全與衛生，<strong>茶葉商品一經拆封即無法退換貨</strong>，敬請於購買前審慎評估。若收到商品時發現包裝損毀或明顯瑕疵，請於收貨後 48 小時內拍照記錄並聯繫我們，本店將依情況提供補寄或退款服務。
            </div>
          </div>

          {/* 聯絡我們 */}
          <div className="bg-tea-text rounded-2xl p-8 md:p-10 text-center">
            <h3 className="font-serif text-xl font-bold text-tea-cream-light mb-3">有任何問題？</h3>
            <p className="text-tea-green-pale text-sm leading-7 mb-6">
              如對退換貨政策有任何疑問，歡迎隨時聯繫我們，<br />
              我們將盡快為您處理。
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="tel:0972619391"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-tea-green text-white rounded-full text-sm font-medium hover:bg-tea-green/90 transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.37 9.5 19.79 19.79 0 01.38 4.46 2 2 0 012.37 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.41 9.84a16 16 0 006.75 6.75l1.2-1.21a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                </svg>
                0972-619-391
              </a>
              <a
                href="mailto:qdbzdt2846@gmail.com"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-tea-green-pale/40 text-tea-green-pale rounded-full text-sm font-medium hover:bg-white/5 transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                寄信給我們
              </a>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
