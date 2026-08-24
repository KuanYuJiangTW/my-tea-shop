/**
 * 綠界要打正式站還是測試站。
 *
 * 只有一個開關 `ECPAY_MODE`，**預設 live**——不設就跟以前完全一樣。
 *
 * ## 為什麼要有 `VERCEL_ENV` 這道鎖
 *
 * 在正式站切測試模式的後果是**真實客人付不了錢**，而且不會有錯誤訊息——
 * 表單照樣送出、綠界測試站照樣回應，只是錢永遠不會進帳。賞鳥季一天損失
 * 掉的訂單比這個功能整季賺的還多。
 *
 * 所以這裡不只讀環境變數，還**硬性拒絕在 production 生效**。誤設一個環境
 * 變數是很容易發生的事（複製貼上、環境選錯、忘了刪），把「絕對不要」寫成
 * 註解不會擋住任何人，寫成程式才會。
 *
 * ## 要跑測試模式的話
 *
 * 在 Vercel **Preview** 環境（不是 Production）設這四個：
 *   ECPAY_MODE=stage
 *   ECPAY_MERCHANT_ID / ECPAY_HASH_KEY / ECPAY_HASH_IV  ← 綠界測試帳號那組
 *
 * 三個憑證必須一起換成測試帳號的。只換 URL 不換憑證的話，回調的
 * CheckMacValue 驗不過（`/api/ecpay/return` 用同一組 HashKey/IV 驗簽），
 * 付款會成功但系統收不到通知。
 */

/**
 * Vercel 在 production 部署時 `VERCEL_ENV === "production"`；
 * preview 部署是 `"preview"`，本機 `next dev` 則是 undefined。
 */
const isVercelProduction = process.env.VERCEL_ENV === "production";

/** 是否走綠界測試站。production 一律 false，不管環境變數怎麼設 */
export const ECPAY_STAGE = process.env.ECPAY_MODE === "stage" && !isVercelProduction;

if (process.env.ECPAY_MODE === "stage" && isVercelProduction) {
  // 這行會出現在 Vercel 的 production log 裡。設錯的人需要知道它被忽略了，
  // 否則他會以為自己在測試，實際上每一筆都是真的
  console.error(
    "[ecpay] ECPAY_MODE=stage 在 production 被忽略——正式站一律使用綠界正式端點。" +
    "要跑測試請改用 Preview 部署。",
  );
}

export const ECPAY_HOST = ECPAY_STAGE ? "payment-stage.ecpay.com.tw" : "payment.ecpay.com.tw";

/** 結帳表單要 POST 到哪裡 */
export const ECPAY_CHECKOUT_URL = `https://${ECPAY_HOST}/Cashier/AioCheckout/index`;

/**
 * CSP 要放行的綠界付款網域。
 *
 * **這個很容易被漏掉**：CSP 的 `form-action` 沒放行測試站的話，切了 URL 也
 * 沒用——瀏覽器會擋掉表單送出，而且畫面上看起來就像按鈕沒反應。
 *
 * 測試模式下兩個都放行：使用者可能還停在切換前就載好的頁面上。
 */
export const ECPAY_CSP_HOSTS = ECPAY_STAGE
  ? "https://payment-stage.ecpay.com.tw https://payment.ecpay.com.tw"
  : "https://payment.ecpay.com.tw";

// ── 憑證 ────────────────────────────────────────────────────────────────
//
// 為什麼測試值用**不同的變數名**、而不是在 Vercel 把同名變數依環境分開：
// 現有的 ECPAY_MERCHANT_ID／HASH_KEY／HASH_IV 都設成 All Environments，要分開
// 就得去編輯這三個**正在收錢**的變數。手滑把 Production 取消掉，真實客人就
// 付不了錢，而且要到有人抱怨才會發現。測試環境的方便不值得用那個風險換。
//
// 這裡的做法是：正式站讀原本那三個、完全不動；測試模式讀另一組名字。
// 兩者不可能互相影響，因為連變數名都不一樣。
//
// 測試預設值是綠界**公開共布的共用測試帳號**（https://developers.ecpay.com.tw/?p=2856），
// 不是機密——任何人都能用同一組。寫成預設值是為了讓 Preview 只需要設
// ECPAY_MODE=stage 一個變數就能動，少設一個就是少一個出錯的地方。
// 綠界哪天換掉的話，用 ECPAY_STAGE_* 覆寫即可。
const STAGE_MERCHANT_ID = "3002607";
const STAGE_HASH_KEY    = "pwFHCqoQZGmho4w6";
const STAGE_HASH_IV     = "EkRm7iFT261dpevs";

export const ECPAY_MERCHANT_ID = ECPAY_STAGE
  ? (process.env.ECPAY_STAGE_MERCHANT_ID ?? STAGE_MERCHANT_ID)
  : process.env.ECPAY_MERCHANT_ID!;

export const ECPAY_HASH_KEY = ECPAY_STAGE
  ? (process.env.ECPAY_STAGE_HASH_KEY ?? STAGE_HASH_KEY)
  : process.env.ECPAY_HASH_KEY!;

export const ECPAY_HASH_IV = ECPAY_STAGE
  ? (process.env.ECPAY_STAGE_HASH_IV ?? STAGE_HASH_IV)
  : process.env.ECPAY_HASH_IV!;
