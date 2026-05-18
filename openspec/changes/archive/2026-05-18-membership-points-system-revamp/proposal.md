## Why

現行點數系統兌換比為 100:1（100 點 = NT$1），用戶認知困難、實質回饋率僅 1%，缺乏驅動回購的誘因。折價券僅有新人自動發放，後台無法手動管理。儀表板營收認列時機（paid）與點數發放時機（completed）不一致，未來會計對帳將出現落差。需要一次性重構為清晰、可管理、財務正確的會員制度。

## What Changes

- **點數兌換比簡化**：從 100:1 改為 1:1（1 點 = NT$1），發放改為消費金額 × 回饋率（2%~4%）
- **會員等級制度**：新增 standard/silver/gold 三級，依年消費自動升等，各級有不同回饋率和折抵上限
- **點數折抵自選**：用戶可自由輸入要折抵的金額（最低 10 點，最高依等級上限 10%/15%/20%）
- **點數活動管理**：後台 CRUD 管理加碼活動（雙倍日、首購加碼、指定商品加碼等）
- **折價券管理**：後台 CRUD 手動建立節日折價券（批次發放/通用碼），保留原有新人自動歡迎券
- **儀表板營收對齊**：營收認列從 paid 改為 completed，與點數發放時機一致；新增行銷成本卡片（折價券消耗、點數消耗、未兌現點數負債）
- **訂單金額拆分**：**BREAKING** — orders 表的 discount_amount 拆為 coupon_discount + points_discount，加入 DB CHECK constraint 確保金額恆等式
- **舊點數遷移**：一次性將現有 100:1 點數轉換為 1:1

## Capabilities

### New Capabilities
- `member-tiers`: 會員等級資料結構、年消費累計、自動升降等邏輯
- `points-earning`: 點數發放邏輯（回饋率 × 活動倍率）、首購加碼
- `points-redemption`: 點數折抵自選（最低/最高限制、1:1 兌換、後端驗證）
- `points-campaigns`: 後台點數活動 CRUD（全站/商品/首購/等級 類型、倍率、時間區間）
- `coupon-management`: 後台折價券 CRUD（手動建立、批次發放、通用碼、狀態追蹤）
- `dashboard-financials`: 儀表板行銷成本卡片、營收認列改為 completed、金額拆解顯示
- `points-migration`: 舊 100:1 資料遷移腳本、向後相容處理

### Modified Capabilities
（目前 openspec/specs/ 無既有 spec）

## Impact

- **DB schema**：新增 member_tiers, user_membership, points_campaigns 表；修改 orders 表拆分折扣欄位；新增 CHECK constraint
- **API routes**：修改 orders/route.ts（折抵邏輯）、admin/orders/[id]/route.ts（發放邏輯）、user/points/route.ts（回傳 tier 資訊）；新增 admin/campaigns CRUD、admin/coupons CRUD
- **前端**：修改 CheckoutClient.tsx（折抵滑桿 UI）、dashboard/page.tsx（新增卡片）；新增 admin/campaigns 頁、admin/coupons 頁、會員等級顯示
- **測試**：需新增單元測試（金額恆等式、等級計算、倍率套用）、API 整合測試、E2E 測試
- **遷移**：需 staging 環境先跑一次確認舊資料轉換正確
