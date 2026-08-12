# 設計：商品評價

## Context

體驗端的評價已經跑很久，本提案要做的是**把同一套搬到商品端**，不是重新發明：

| 既有資產 | 位置 |
|---|---|
| 資料表與 `is_visible` 軟刪除 | `experience_reviews` |
| 前台顯示（星等、平均、則數） | `src/app/experiences/[slug]/ExperienceReviews.tsx` |
| 後台切換顯示 | `src/app/admin/(protected)/reviews/page.tsx`、`PATCH /api/admin/reviews/[id]` |
| 留評 API 與已購驗證 | `POST /api/reviews`（驗證預約屬本人、已確認、已結束） |
| `aggregateRating` 門檻 | `src/app/experiences/[slug]/page.tsx:57-64`，**評價數 ≥ 3 才輸出** |
| 規格 | `openspec/specs/user-reviews/`、`openspec/specs/admin-review-moderation/` |

現實約束：真實客人只有 3 位、已付款訂單 6 筆。**投稿系統在這個量體下不會產出任何評價**，所以階段一（手動建檔）不是妥協，是唯一能在短期內產生效果的做法。

商品卡 632px 是業主指定值（`ProductCard.tsx:237-240` 有明確註解），任何新增元素都要在既有間距內吸收。

## Goals / Non-Goals

**Goals**

- 商品能顯示星等彙總與評價列表，且**看得出評價來源**
- 後台能手動建檔既有口碑，並用既有的顯示切換機制管理
- 資料模型與體驗端對齊，讓兩者未來能共用審核介面
- 階段一可獨立上線，不依賴階段二

**Non-Goals**

- 不做評價的圖片上傳
- 不做評價回覆（商家回應）
- 不做評價排序／篩選 UI（量體不足）
- 不改動 `experience_reviews` 的既有行為
- 不在本提案處理 `/products/[slug]` 商品詳情頁（那是 `product-detail-pages`）

## Decisions

### D1：新開 `product_reviews` 表，不共用 `experience_reviews`

**選擇**：獨立資料表，欄位對齊。

**替代方案**：在 `experience_reviews` 加 `target_type` / `target_id` 做多型關聯。

**理由**：多型關聯會讓既有的 FK（`booking_id`、`experience_type_id`）變成可空，等於把已經穩定的約束拆掉——體驗評價的「每筆預約限一則」正是靠 `booking_id` 的 UNIQUE constraint 實現的。商品端的唯一性條件不同（每訂單每商品一則），硬塞進同一張表會讓兩組約束互相打架。獨立表的代價只是後台要處理兩個來源，那是顯示層的事。

### D2：`source` 欄位必填，前台明示來源

**選擇**：`source` 為 enum（`site` / `line` / `facebook` / `other`），手動建檔一律不是 `site`，前台對非 `site` 的評價顯示來源標註。

**理由**：手動輸入的口碑如果混在站內評價裡不做區分，就是偽造站內評價。標明來源既誠實，也不減損說服力——「LINE 上的顧客回饋」本來就是真的。

### D3：階段一不做投稿，但資料表一次建好

**選擇**：`product_reviews` 的欄位（含 `order_id`、`user_id`）在階段一就建齊，只是階段一不寫入。

**理由**：避免階段二再做一次 migration。空欄位沒有成本。

### D4：星等彙總放商品卡，但不加高度

**選擇**：星等列塞進商品卡既有的描述區與規格區之間，**用既有間距吸收**，總高維持 632px。若量測後吸收不了，改為只在 `/products` 列表顯示、商品卡不顯示。

**理由**：632 是業主指定值，`ProductCard.tsx` 的註解明寫「動這些間距或描述行數前，先量總高」。實作時必須先量。

### D5：`aggregateRating` 沿用 ≥3 則的門檻

**選擇**：與 `experiences/[slug]/page.tsx` 相同，評價數 < 3 不輸出 `aggregateRating`。

**理由**：那個門檻已經是本專案的既定判準（`ai-search-seo` 提案裡寫明「評價數低時顯示反而減分」），沒有理由在商品端用另一套。

### D6：後台審核路由用 query 參數辨別來源

**選擇**：`PATCH /api/admin/reviews/[id]?type=product|experience`，預設 `experience` 以保持既有呼叫端不變。

**替代方案**：另開 `/api/admin/product-reviews/[id]`。

**理由**：兩者做的事完全相同（切 `is_visible`），分成兩支路由會讓後台介面要維護兩套呼叫。用 query 參數且保留預設值，既有前端不必改。

## Risks / Trade-offs

- **[手動建檔的評價缺乏可驗證性]** → `source` 必填 ＋ 前台明示來源；後台欄位加上「原始出處」自由文字（例如 LINE 對話日期），留下追溯線索
- **[商品卡加星等會破壞 632px]** → 實作第一步就是量高度，吸收不了就退回「只在列表頁顯示」（D4 已寫明退路）
- **[評價數過少時顯示平均星等反而扣分]** → 沿用 ≥3 門檻；未達門檻只顯示評價列表不顯示平均（與 `aggregateRating` 同一條規則）
- **[階段二的已購驗證要跨 `orders.items` JSON 查商品]** → `orders.items` 是 JSONB，驗證「這筆訂單含此商品」需要在應用層展開比對；量體小，先用應用層驗證，不加索引
- **[兩張評價表未來要合併報表]** → 目前無此需求；若出現，做 SQL VIEW 而不是改表結構

## Migration Plan

1. 執行 `supabase/add_product_reviews.sql`（建表 ＋ RLS ＋ 索引）
2. 部署階段一程式碼（後台建檔 ＋ 前台顯示）
3. 業主手動輸入既有口碑
4. 觀察一段時間後再決定是否做階段二

**回滾**：階段一的所有前台顯示都以「有資料才顯示」為條件，資料表清空即回到現況；程式碼回滾用 `git revert`。

## Open Questions

- **商品卡要不要顯示星等**，取決於 632px 能否吸收——實作時量測後回報業主
- **既有口碑有多少則**？若不足 3 則，`aggregateRating` 與平均星等都不會顯示，階段一的效益會打折——需要業主確認手上的數量
- 階段二是否要做，等階段一的實際效果再決定
