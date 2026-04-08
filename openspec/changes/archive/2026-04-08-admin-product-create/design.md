## Context

後台產品管理頁（`/admin/products`）目前只有 `GET`（查詢列表）與 `PATCH`（部分更新）兩支 API，UI 僅支援編輯現有商品。`POST /api/admin/products` 尚未實作，當茶莊要上架新品時，管理員必須直接操作資料庫。

現有架構：
- API：`src/app/api/admin/products/route.ts`（只有 GET）
- API：`src/app/api/admin/products/[id]/route.ts`（PATCH）
- UI：`src/app/admin/(protected)/products/ProductsClient.tsx`（Client Component，管理 editing 狀態）
- 資料庫：Supabase `products` 資料表，已有完整欄位
- CMS：Sanity Studio（`/studio`），已有 `experience`、`faq` schema，尚無 `product` schema

## Goals / Non-Goals

**Goals:**
- 在 Sanity 新增 `product` schema，管理內容面欄位（描述、圖片、相簿）
- 新增 `POST /api/admin/products` API，在 Supabase 建立商業資料記錄
- 在後台產品管理頁新增「+ 新增商品」按鈕，點擊展開內嵌新增表單
- 提交後新商品立即出現在列表中（無需重新整理頁面）

**Non-Goals:**
- 批次匯入商品
- 刪除商品功能
- 前台產品頁的 Sanity 資料整合（另立變更處理）

## Decisions

### 1. 混合架構：Sanity（內容）+ Supabase（商務）
選擇：商品資料拆成兩層——Sanity 負責內容面，Supabase 負責交易面，以 `slug` 作為橋樑。

| 存放位置 | 欄位 |
|---|---|
| **Sanity** | `name`（中文）、`nameEn`、`description`（Rich Text）、`coverImage`、`gallery`、`category`、`origin`、`altitude`、`color` |
| **Supabase** | `slug`、`price`、`stock_quantity`、`price_75g`、`stock_75g`、`price_tea_bag`、`stock_tea_bag`、`is_active`、`is_featured` |

**理由**：與專案現有模式一致（`experience` 同樣是 Sanity 內容 + Supabase 預約資料）；管理員可在 Sanity Studio 所見即所得地上傳圖片、編輯 Rich Text，無需貼 URL；商務敏感資料仍在 Supabase 受保護。作品集展示時可示範 headless CMS 與關聯式資料庫協作的架構能力。

備選：純 Supabase——實作較快，但圖片管理弱，且與專案既有架構不一致。

### 2. 新增流程：先建 Sanity 文件，再建 Supabase 記錄
選擇：後台新增表單送出時，依序呼叫：
1. Sanity API（建立 product document，取得 `_id`）
2. `POST /api/admin/products`（建立 Supabase 記錄，存入 `slug` 與商務欄位）

**理由**：Sanity 的 `_id` 不需存入 Supabase（以 `slug` 連結即可），流程清晰；若 Sanity 成功但 Supabase 失敗，管理員可重試，不影響資料一致性（Supabase 記錄缺失時前台不會顯示）。

### 3. 內嵌表單 vs. 獨立頁面
選擇：在同一頁面頂部展開內嵌表單。

**理由**：與現有 inline edit 模式一致；新增商品的必填欄位少（`slug` + `price`），不需獨立頁面。圖片與 Rich Text 的豐富編輯透過 Sanity Studio 完成，後台表單只需輸入基本商務資訊。

### 4. 後台表單欄位範圍
選擇：後台新增表單僅涵蓋 Supabase 的商務欄位（`slug`、`price`、各規格選填）；Sanity 內容欄位（描述、圖片）引導管理員前往 Sanity Studio 填寫。

**理由**：避免在後台重複實作 Sanity 的圖片上傳與 Rich Text 編輯器（Studio 已有完整實作）；分工清晰——後台管商務，Studio 管內容。

## Risks / Trade-offs

- **兩步驟建立 → 可能出現「Sanity 有、Supabase 沒有」的孤兒文件**：前台查詢以 Supabase 為主，孤兒文件不會顯示；管理員可在 Studio 刪除或重試。
- **`slug` 唯一性須手動確保**：API 收到 `slug` 時需先查詢 Supabase 確認不重複，重複則回傳 400。
- **後台目前不顯示 Sanity 內容**：產品列表目前只讀 Supabase，Sanity 的描述/圖片不在列表中呈現（後續可擴充）。

## Open Questions

- Sanity 的 `product` schema 中，`slug` 是否要 `validation: required`？→ 是，slug 是兩端的連結鍵，必填。
- 後台新增成功後是否要直接跳轉到 Sanity Studio 該商品的編輯頁？→ 顯示提示連結「前往 Studio 補充描述與圖片」，不強制跳轉。
