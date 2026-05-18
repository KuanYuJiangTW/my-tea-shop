## Context

茶葉電商「霧抉茶」使用 Next.js + Supabase，現有點數系統為 100:1 兌換比（100 點 = NT$1），折抵上限 10%，用戶無法自選折抵金額。折價券僅新人自動發放，後台無管理介面。儀表板營收以 paid 為準，但點數在 completed 才發放，兩者時機不一致。

技術棧：Next.js 14 App Router、Supabase (PostgreSQL)、Vitest、Playwright。

## Goals / Non-Goals

**Goals:**
- 簡化點數為 1:1（1 點 = NT$1），回饋率 2%~4% 依等級
- 用戶可自選折抵金額（最低 10 點，最高依等級比率）
- 後台可 CRUD 管理點數活動和折價券
- 儀表板營收統一改為 completed 認列，新增行銷成本卡片
- 訂單金額拆分記錄，確保金額恆等式，DB constraint 保障
- 完整自動測試覆蓋（單元 + API 整合 + E2E）

**Non-Goals:**
- 不做即時通知推播（點數到期提醒等排入未來 phase）
- 不做會員降等（本次只做升等，降等邏輯日後再議）
- 不重寫金流串接（綠界/PayPal/Stripe 邏輯不動）
- 不做積分商城（點數只能折抵，不能換商品）

## Decisions

### 1. 點數兌換比 1:1，降低發放量

**決定**：1 點 = NT$1，消費 100 元得 2 點（一般會員）

**替代方案**：維持 100:1 但改善 UI 顯示
**理由**：1:1 從 DB 到前端都不需要除法運算，減少計算錯誤機會；用戶在帳戶頁面看到「餘額 NT$24」比「2400 點」直覺

### 2. 會員等級存 DB 設定表，不寫死在程式碼

**決定**：member_tiers 表存放等級設定（回饋率、折抵上限、門檻），程式碼 join 查詢

**替代方案**：寫成 config 常數
**理由**：未來可在後台調整門檻/新增等級，不需要重新部署

### 3. 訂單折扣拆分為兩欄位

**決定**：新增 coupon_discount + points_discount 兩個 integer 欄位，保留 discount_amount 作為計算欄（= coupon + points），加 CHECK constraint

**替代方案**：只用 JSONB 存折扣明細
**理由**：SQL 聚合查詢直接 sum() 比 parse JSON 快且正確；CHECK constraint 是資料完整性的最後防線

### 4. 營收認列時機改為 completed

**決定**：儀表板主數字改為 `order_status = 'completed'`，另外顯示 paid 金額作為現金流參考

**替代方案**：維持 paid
**理由**：completed 時點數才發放，營收和點數在同一時刻認列，會計永遠能對上；取消訂單不需回沖營收

### 5. 點數活動取最高倍率（不疊加）

**決定**：同時有多個活動適用時，取最高 multiplier，不疊加

**替代方案**：疊加（例 2x + 3x = 5x）
**理由**：疊加容易失控導致點數負債爆炸；取最高倍率可控且用戶好理解

### 6. 折價券分為「批次碼」和「通用碼」兩種模式

**決定**：批次碼 = 每人一張獨立券（insert 到指定 user_id）；通用碼 = 所有人可輸入同一組 code 兌換

**替代方案**：只做批次碼
**理由**：節日活動常需要公開宣傳一組代碼（如「DRAGON2026」），批次碼無法滿足行銷需求

### 7. 測試策略分層

**決定**：
- 單元測試 (Vitest)：金額計算、等級判斷、倍率套用
- API 整合測試 (Vitest + mock Supabase)：完整 CRUD 流程、結帳驗證
- E2E 測試 (Playwright)：結帳折抵流程、後台操作

**理由**：三層覆蓋確保邏輯正確性（單元）、API 合約正確（整合）、用戶體驗正確（E2E）

## Risks / Trade-offs

- **[舊資料遷移]** 現有點數除以 100 可能產生小數 → 使用 ROUND() 進位，遷移前備份
- **[點數負債膨脹]** 活動倍率設太高可能產生大量負債 → 後台建立活動時顯示「預估負債影響」警示，倍率上限設 10x
- **[向後相容]** discount_amount 欄位仍在使用中（PayPal/Stripe routes 可能讀取）→ 保留欄位並設為 generated column = coupon_discount + points_discount
- **[通用碼濫用]** 公開碼可能被大量使用 → 通用碼加上「總使用次數上限」和「每人限用一次」的 constraint
- **[等級升等延遲]** 年消費累計在 completed 才更新，pending 期間不計 → 可接受，與營收認列一致

## Migration Plan

1. **Phase 0（準備）**：在 staging 建立新 table，不影響 production
2. **Phase 1（DB）**：production 加欄位 + 新 table（加法操作，不破壞現有功能）
3. **Phase 2（遷移腳本）**：舊點數 ÷ 100 轉換，舊 discount_amount 拆分填入新欄位
4. **Phase 3（後端）**：切換 API 邏輯到新制
5. **Phase 4（前端）**：部署新 UI
6. **Rollback**：Phase 3 之前可隨時 rollback（新欄位有 default 值不影響舊邏輯）；Phase 3 之後需回復 API + 執行反向遷移腳本

## Open Questions

- 是否需要「點數即將到期通知」的排程功能（目前標為 non-goal，日後加入）
- 通用碼折價券的「每人限用一次」是用 unique index 還是 application-level check
- 會員降等邏輯（年度重算時降等或保留半年緩衝）
