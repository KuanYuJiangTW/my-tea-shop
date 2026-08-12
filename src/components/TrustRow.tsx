import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  DOMESTIC_FREE_THRESHOLD,
  INTERNATIONAL_FREE_SHIPPING_THRESHOLD,
} from "@/lib/shipping-constants";

/**
 * 商品區下方的信任列：把「所以可以放心買」的三件事講在決策點旁邊。
 *
 * **為什麼收在「本季精選」內部，而不是獨立 section**：首頁底色走
 * cream → cream-light → white → tea-text 的漸進序列（design-system 2.1.1），
 * 中間插一條新底色會斷掉那個序列。收進商品區就只是一張提示卡，序列不動。
 *
 * **為什麼不塞進公告條**：`AnnouncementBar` 明文「刻意只講一件事，不做輪播」
 * （該檔 L11-15）——第三則訊息會把註冊禮與國際配送那兩則一起稀釋掉。
 *
 * **四項都有出處，不是行銷話術**：免運門檻取自 `shipping-constants`、
 * 運費數字對齊購物車的 `products.shippingOptions`、鑑賞期文案對齊
 * `/return-policy` 的消保法第 19 條與「應保持未拆封」但書。
 * 出貨天數「2–3 個工作天」原本只存在於 `chat-knowledge.ts`（同一句話裡的免運
 * 金額還是錯的），**業主 2026-08-12 拍板確認後才寫進來**——出貨時效是對客人的
 * 服務承諾，不能拿一個已知有錯的句子當唯一來源。
 */
export default async function TrustRow({ locale }: { locale: string }) {
  const t = await getTranslations("common.trust");
  const returnPolicyHref = locale === "en" ? "/en/return-policy" : "/return-policy";

  return (
    <div className="mt-12 rounded-card bg-tea-green-mist p-card md:p-card-lg">
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <li className="flex items-start gap-3">
          <ClockIcon />
          <div>
            <p className="text-label font-semibold text-tea-text">{t("dispatch")}</p>
            <p className="text-caption text-tea-text-muted mt-1">{t("dispatchNote")}</p>
          </div>
        </li>

        <li className="flex items-start gap-3">
          <TruckIcon />
          <div>
            <p className="text-label font-semibold text-tea-text">
              {t("freeShipping", { amount: DOMESTIC_FREE_THRESHOLD.toLocaleString() })}
            </p>
            <p className="text-caption text-tea-text-muted mt-1">
              {t("freeShippingNote", {
                intl: INTERNATIONAL_FREE_SHIPPING_THRESHOLD.toLocaleString(),
              })}
            </p>
          </div>
        </li>

        <li className="flex items-start gap-3">
          <StoreIcon />
          <div>
            <p className="text-label font-semibold text-tea-text">{t("delivery")}</p>
            <p className="text-caption text-tea-text-muted mt-1">{t("deliveryNote")}</p>
          </div>
        </li>

        <li className="flex items-start gap-3">
          <ShieldIcon />
          <div>
            <p className="text-label font-semibold text-tea-text">{t("returns")}</p>
            <p className="text-caption text-tea-text-muted mt-1">{t("returnsNote")}</p>
            {/* py-1 撐點擊區到 ≥24px，見 design-system 2.1.4——用 padding 不用 margin */}
            <Link
              href={returnPolicyHref}
              className="inline-block py-1 text-caption text-tea-green-ink underline underline-offset-4 hover:text-tea-green-dark transition-colors duration-base ease-standard"
            >
              {t("returnsLink")}
            </Link>
          </div>
        </li>
      </ul>
    </div>
  );
}

// 圖示沿用 AnnouncementBar／Header 的線條語言（stroke 1.8、無填色、不用 emoji）。
// 色用 green-ink 不用 tea-green：後者在 green-mist 底上達不到 UI 元件的 3:1
// （design-system 2.3），green-ink 在四種淺底皆 ≥4.54。

function ClockIcon() {
  return (
    <svg
      width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className="flex-shrink-0 mt-0.5 text-tea-green-ink" aria-hidden
    >
      <circle cx="12" cy="12" r="9.25" />
      <path d="M12 6.75V12l3.5 2.25" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg
      width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className="flex-shrink-0 mt-0.5 text-tea-green-ink" aria-hidden
    >
      <path d="M3 16V6.5A1.5 1.5 0 014.5 5h9A1.5 1.5 0 0115 6.5V16" />
      <path d="M15 9h3.6a1.5 1.5 0 011.29.73L21.5 12.5V16" />
      <circle cx="7" cy="17.5" r="2" />
      <circle cx="17.5" cy="17.5" r="2" />
      <path d="M9 17.5h6.5" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg
      width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className="flex-shrink-0 mt-0.5 text-tea-green-ink" aria-hidden
    >
      <path d="M4 10v9.5h16V10" />
      <path d="M2.5 10l1.6-5a1.5 1.5 0 011.43-1h12.94a1.5 1.5 0 011.43 1l1.6 5a3 3 0 01-5.75.6 3 3 0 01-5.5 0 3 3 0 01-5.75-.6z" />
      <path d="M10 19.5V14h4v5.5" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className="flex-shrink-0 mt-0.5 text-tea-green-ink" aria-hidden
    >
      <path d="M12 2.75l7.5 2.75v6c0 4.6-3.1 8.4-7.5 9.75-4.4-1.35-7.5-5.15-7.5-9.75v-6z" />
      <path d="M8.75 12l2.25 2.25 4.25-4.25" />
    </svg>
  );
}
