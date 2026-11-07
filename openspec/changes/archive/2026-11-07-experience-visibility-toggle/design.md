## Context

- `experience_types.is_active` 在資料庫裡早就有了。前台的唯一資料入口 `src/lib/experiences.ts` 的 `getExperienceTypes()`／`getExperienceBySlug()` 都會過濾 `is_active = true`，首頁、`/experiences`、詳細頁、sitemap、茶知識文章的體驗卡都經過它；`chat-knowledge.ts`、`/api/experiences`、`/api/experience-sessions`、`POST /api/experience-requests` 也各自過濾了。
- **沒有過濾的入口**（本次要補）：`POST /api/bookings`（只查場次 `status === "open"`）、`/experiences/booking/[sessionId]`（只擋 `cancelled`）、`POST /api/experience-interest`（只驗 `experienceTypeId` 是整數）。
- 後台「排序與季節」頁（來自尚未歸檔的 `experience-seasonal-ordering` change）的 GET 已經會回傳**全部**體驗及其 `is_active`，只是畫面沒有顯示。「體驗管理」月曆和「場次管理」都只抓上架中的體驗。
- 前台快取：`/` 與 `/experiences` 是 `revalidate = 3600`，詳細頁 60，茶知識文章 3600。後台改動如果不主動清快取，最久要 1 小時才會生效。
- 正式站現況（2026-11-07 唯讀查詢）：7 款中 6 款上架；`egret-half-day` 是**刻意**下架的（3 人時比單買便宜 150 元，見 `egret-half-day.test.ts`）；所有體驗目前都沒有未來的 open 場次。
- 稽核：`withAdminAuth(handler, action)` 只會從 URL 最後一段取 `resource_id`。現有的 `/api/admin/experience-ordering` 沒有帶 action，所以它的寫入目前**完全沒有留稽核紀錄**（與 `admin-audit-log` 規格不符的既有缺口，本次不修，只記錄）。

## Goals / Non-Goals

**Goals:**
- 業主在後台一鍵上架／下架單一體驗，幾秒內反映到全站。
- 下架＝不再接受**新的**預約入口，不只是把卡片藏起來。
- 每次切換都留下稽核紀錄（誰在什麼時候、對哪一款、改成什麼）。

**Non-Goals:**
- 不改資料庫結構、不新增欄位（例如「下架原因」「排程上架」）。
- 不自動取消已成立的預約、不寄信通知客人。下架前業主要自己決定場次怎麼處理，確認視窗會列出數量。
- 不讓 `public/llms.txt` 自動跟著變（改記 BACKLOG）。
- 不修 `experience-ordering` 既有 API 沒有稽核紀錄的問題（另記）。
- 不動 Sanity 端的內容；Sanity 文件存在與否和是否顯示無關。

## Decisions

### D1：開關放在「排序與季節」頁，而不是月曆或場次頁
那一頁是唯一「一列一款體驗」的管理畫面，而且 GET 已經會回傳下架的體驗。放在月曆或場次頁的話，因為它們只抓上架中的體驗，一關掉那一列就消失，再也打不開。
**替代方案**：另開一頁「體驗上架管理」。否決理由：多一個側欄項目，而且上下架、排序、季節本來就是同一件事的不同面向。

### D2：用獨立的 `PATCH /api/admin/experience-types/[id]`，不塞進 experience-ordering 的 PATCH
- 這樣 URL 最後一段是 id，`withAdminAuth(..., "update_experience_active")` 就能自動記下 `resource_id`。塞進 ordering 的 PATCH 會沒有 resource_id，而且那支目前根本沒帶 action。
- 做法與 `api/admin/bundles/[id]`、`api/admin/products/[id]` 的上下架一致，`route-auth-coverage.test.ts` 也會自動檢查它有沒有包登入保護。
- body 只接受 `{ is_active: boolean }`。型別不對、或多帶其他欄位一律回 400，不讓這支 API 變成可以改任意欄位的後門。

### D3：切換後用 `revalidatePath("/", "layout")` 清全站快取
受影響的頁面有首頁、列表、詳細頁、所有茶知識文章（側欄體驗卡）、sitemap，而且中英文（`/en` 是 `src/proxy.ts` rewrite 出來的）都有。逐一列路徑很容易漏，漏掉的那頁就會繼續顯示已下架的體驗一小時。上下架一年頂多切幾次，清全站換來的是「保證不會漏」。
**替代方案**：逐一 `revalidatePath`（商品上下架就是這樣做）。否決理由：茶知識文章是動態 slug，要列全很容易漏。
**代價**：清除後第一批請求會重新向 Sanity／Supabase 取資料，屬可接受的短暫負載。
**上線後修正（2026-11-07）**：這一招**清不到 sitemap.xml**。它是 metadata route，不在 layout 樹裡，而且原本沒有 `revalidate`，是建置時的靜態檔。正式站下架後頁面立刻更新，sitemap 卻停在部署當下的版本。現在另外呼叫 `revalidatePath("/sitemap.xml")`，並在 `sitemap.ts` 加 `revalidate = 3600` 當保底。

### D4：「下架」的定義＝擋所有新入口，已成立的照舊
| 入口 | 下架後行為 |
|---|---|
| 列表、詳細頁、sitemap、AI 客服 | 已經會過濾，不用改（詳細頁變 404） |
| `POST /api/bookings` | 回 409 `{ error: "此體驗目前未開放預約" }`，在名額檢查之前就擋下 |
| `/experiences/booking/[sessionId]` | `redirect("/experiences?error=unavailable")`（不導回詳細頁，因為那頁已經 404） |
| `POST /api/waitlist`（加入候補） | 回 409 `{ error: "此體驗目前未開放預約" }`（實作時才發現的入口，提案初版漏列） |
| `POST /api/experience-interest` | 回 400 `{ error: "此體驗目前未開放" }` |
| `POST /api/experience-requests` | 已經會過濾，不用改 |
| 已成立的預約（pending／confirmed）的付款、取消、提醒信 | **照舊**。客人已經付錢或正在付，不能因為業主下架就卡住付款或退款 |

`POST /api/bookings` 的檢查放在 `session.status !== "open"` 之後、名額檢查之前，讀的是同一個查詢裡已經 join 回來的 `experience_types(*)`，不會多一次資料庫查詢。

### D5：已成立預約的付款（ECPay）與候補確認（`/api/waitlist/[id]/confirm`）都不擋
體驗付款目前只有 `ecpay/experience-checkout` 一條路（PayPal 沒有體驗付款路由），它是對既有的 `pending_payment` 預約結帳。如果在這裡擋下，就會出現客人已經佔了名額、卻付不了錢的狀態，所以不擋。


候補是系統在場次有空位時主動通知客人的，客人點確認的時候已經持有「被邀請」的狀態。下架的意思是「不再招新客」，不是「把已經在排隊的人踢掉」。業主如果真的不辦了，應該去取消場次（候補怎麼處理照取消場次的既有流程走，本次不改）。這條寫進規格，避免日後有人「順手」補上檢查。

### D6：後台「場次管理」下拉改列全部體驗
讓業主可以「先排場次、再上架」。下架的體驗在選單上標「（未上架）」。月曆頁的 `getExpTypes()` 只用來顯示圖例和顏色，維持現狀。

### D7：確認視窗要顯示影響範圍
- 下架時：「前台會立刻看不到〈名稱〉。目前還有 N 個未來的開放場次、M 筆有效預約，這些不會被取消，客人仍會收到提醒信。」數字由新 API 的 GET 提供，或由 ordering 的 GET 一併回傳（實作時二選一，偏好後者以免多一支 API）。
- 上架時：「客人會立刻看得到〈名稱〉並可以預約。」

## Risks / Trade-offs

- **[誤上架 `egret-half-day`]** 它是因為訂價不合理才刻意下架的，開關一按就會上架。→ 上架確認視窗必須點第二次才生效；tasks 裡註明實作完不要動這一筆。
- **[`POST /api/bookings` 是金流入口]** 擋錯會讓正常客人訂不到。→ 依 CLAUDE.md 高風險區規則：補回歸測試（上架可訂、下架 409、join 回傳 null 時的行為），用 `reverse-verify` 確認測試真的擋得住，再跑 `npm run test`。
- **[join 結果為 null]** `experience_types` 被刪掉或 RLS 擋住時 `expType` 會是 null，原本的程式在 `expType.max_participants` 就會丟例外。→ 新的檢查寫成 `!expType?.is_active`，順便把 null 也當成「不可預約」回 409，不再丟 500。
- **[快取清不乾淨]** Vercel CDN 層或 Sanity 的 `sanityFetch` 也有自己的快取。→ 驗收時要在正式站實測：切換後 1 分鐘內，列表頁中英文都要變。
- **[llms.txt 不同步]** AI 搜尋會繼續介紹已下架的體驗。→ 開關旁邊顯示提醒文字，並記進 BACKLOG。

## Migration Plan

1. 不需要 SQL。
2. 部署後在正式站對 `egret-half-day` 以外、也沒有預約的體驗做一次「下架 → 檢查 → 上架」實測，或改在 Vercel preview 上做（preview 共用正式資料庫，一樣要選沒有預約的那款，並且當下就切回）。
3. 回滾：直接 revert；`is_active` 的值留在資料庫裡，不會因為 revert 而改變。

## Open Questions

- ~~D7 的場次與預約數字，要由 ordering 的 GET 帶回來，還是新 API 提供？~~ **已決定（2026-11-07）**：由 `GET /api/admin/experience-ordering` 一併帶回 `upcoming_open_sessions`／`active_bookings`。查詢失敗時回 null，不讓整頁壞掉；確認視窗會說「無法取得」，不會顯示成 0。
- 「體驗管理」月曆要不要把下架體驗的場次標成「已下架」？目前不做；等真的遇到「下架了但還有場次」的情況再說。
