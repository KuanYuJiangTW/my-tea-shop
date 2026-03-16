import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "隱私權政策",
  description: "霧抉茶隱私權政策，說明個人資料蒐集目的、使用範圍、保護措施與當事人權利。",
  alternates: { canonical: "/privacy" },
};

const sections = [
  {
    title: "一、個人資料蒐集目的",
    content: `本網站（霧抉茶）依據《個人資料保護法》相關規定，於您使用本服務時蒐集必要的個人資料，蒐集目的如下：

• 訂單處理與履行：包含姓名、電話、電子郵件、收件地址，用以確認訂單、安排出貨及寄送訂單確認通知。
• 客戶服務：處理您的退換貨申請、問題諮詢及售後服務。
• 電子報及行銷通知（限您主動同意者）：不定期提供新品上市、優惠活動等資訊。

未經您同意，本網站不會將個人資料用於上述目的以外之用途。`,
  },
  {
    title: "二、個人資料使用範圍",
    content: `本網站蒐集之個人資料，僅在以下範圍內使用：

• 提供您所要求的商品或服務。
• 寄送訂單相關通知（訂單確認、出貨通知）。
• 處理您的付款（透過綠界科技金流平台，本網站不儲存您的信用卡資料）。
• 配合法令規定或司法機關、行政機關依法定程序之要求。

本網站不會將您的個人資料出售、出租或以其他方式提供給任何第三方，但配合訂單履行所必要之物流業者、金流服務提供商除外，且均以完成訂單為限。`,
  },
  {
    title: "三、個人資料保護措施",
    content: `本網站採取適當之技術與管理措施，保護您的個人資料安全：

• 網站使用 HTTPS 加密傳輸，確保資料在傳輸過程中的安全性。
• 訂單資料儲存於具備安全防護機制的雲端資料庫（Supabase），並設有存取權限控管。
• 付款流程透過綠界科技（ECPay）金流平台處理，本網站不儲存任何信用卡或金融帳戶資訊。
• 本網站員工僅在履行職務所必要時，方可存取客戶個人資料。

如發生個人資料外洩情事，本網站將依法通知受影響之當事人。`,
  },
  {
    title: "四、Cookie 使用說明",
    content: `本網站使用 Cookie 及類似技術以改善使用者體驗：

• 必要性 Cookie：維持購物車狀態、登入狀態等網站基本功能運作所必要。
• 分析性 Cookie（若使用）：了解訪客如何使用網站，以協助改善網站內容與功能。

您可透過瀏覽器設定拒絕或刪除 Cookie，但此舉可能影響部分網站功能的正常使用。`,
  },
  {
    title: "五、當事人的權利",
    content: `依據《個人資料保護法》第 3 條，您對於本網站保有之您的個人資料，享有以下權利：

• 查詢或請求閱覽：您可隨時查詢本網站持有您的個人資料內容。
• 請求製給複製本：您可要求取得個人資料的複本。
• 請求補充或更正：如您的個人資料有錯誤或不完整，您可要求補充或更正。
• 請求停止蒐集、處理或利用：您可要求本網站停止蒐集、處理或利用您的個人資料。
• 請求刪除：您可要求本網站刪除您的個人資料。

如需行使上述權利，請透過電話（0972-619-391）或電子郵件（qdbzdt2846@gmail.com）聯繫我們。我們將於 15 個工作天內回覆處理。

行使上述權利如有必要成本，本網站得酌收手續費；若您的請求係屬無理由、過度重複或顯有濫用情形，本網站得依法拒絕或收取合理費用。`,
  },
  {
    title: "六、資料保存期間",
    content: `本網站保存個人資料之期間如下：

• 訂單相關資料：自訂單完成日起保存 5 年（依消費者保護法及稅務相關規定）。
• 客戶服務紀錄：自案件結案日起保存 2 年。
• 行銷通訊名單：至您取消訂閱為止，或本網站停止行銷活動時刪除。

超過保存期限後，本網站將依法銷毀或去識別化處理。`,
  },
  {
    title: "七、第三方連結",
    content: `本網站可能包含連結至第三方網站。本網站對該等第三方網站之隱私保護政策及內容不負任何責任，建議您在進入第三方網站前，詳閱其隱私權政策。`,
  },
  {
    title: "八、隱私權政策修訂",
    content: `本網站保留隨時修訂本隱私權政策之權利，修訂後之政策將公告於本頁面。如有重大變更，本網站將以顯著方式通知您（如於網站首頁公告或寄送電子郵件）。建議您定期查閱本政策，以掌握最新資訊。

本隱私權政策最後更新日期：2025 年 1 月 1 日`,
  },
];

export default function PrivacyPage() {
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
            Privacy Policy
          </p>
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-tea-cream-light mb-6">
            隱私權政策
          </h1>
          <div className="w-10 h-0.5 bg-tea-green mx-auto mb-6" />
          <p className="text-tea-green-pale text-base max-w-xl mx-auto leading-relaxed">
            霧抉茶重視您的個人資料安全與隱私保護，<br />
            請詳細閱讀以下說明。
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="bg-tea-cream py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-sm border border-tea-cream-dark/30 p-8 md:p-12 space-y-10">
            {sections.map((sec) => (
              <div key={sec.title}>
                <h2 className="font-serif text-lg font-bold text-tea-text mb-4 pb-2 border-b border-tea-cream-dark/40">
                  {sec.title}
                </h2>
                <p className="text-sm text-tea-text/70 leading-8 whitespace-pre-line">
                  {sec.content}
                </p>
              </div>
            ))}

            <div className="mt-8 p-5 bg-tea-cream rounded-xl border border-tea-cream-dark/30 text-sm text-tea-text/60 leading-7">
              如您對本隱私權政策有任何疑問，歡迎透過以下方式聯繫我們：<br />
              電話：<strong className="text-tea-text/80">0972-619-391</strong>
              Email：<strong className="text-tea-text/80">qdbzdt2846@gmail.com</strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
