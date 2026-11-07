## ADDED Requirements

### Requirement: 已下架體驗不接受新預約
系統 SHALL 拒絕為 `is_active = false` 的體驗建立新預約；此檢查 MUST 在名額檢查之前執行。已成立的預約（pending／confirmed）的付款、取消、退款、提醒信，以及候補確認（`/api/waitlist/[id]/confirm`）不受影響。

#### Scenario: 預約已下架體驗的開放場次
- **WHEN** 已登入使用者對某個 `status = "open"` 的場次呼叫 `POST /api/bookings`，但該場次所屬體驗為 `is_active = false`
- **THEN** 系統回傳 HTTP 409 `{ error: "此體驗目前未開放預約" }`，不建立預約、不扣名額

#### Scenario: 場次查不到所屬體驗
- **WHEN** `POST /api/bookings` 查到的場次其 `experience_types` join 結果為 null
- **THEN** 系統回傳 HTTP 409 `{ error: "此體驗目前未開放預約" }`，而不是 HTTP 500

#### Scenario: 對已下架體驗的額滿場次加入候補
- **WHEN** 已登入使用者對某個 `status = "full"` 的場次呼叫 `POST /api/waitlist`，但該場次所屬體驗為 `is_active = false`
- **THEN** 系統回傳 HTTP 409 `{ error: "此體驗目前未開放預約" }`，不寫入候補紀錄、不增加候補人數

#### Scenario: 上架中體驗照常預約
- **WHEN** 使用者對上架中體驗、名額足夠的 `open` 場次呼叫 `POST /api/bookings`
- **THEN** 預約照原流程建立，行為與本需求加入前相同

#### Scenario: 開啟已下架體驗的預約頁
- **WHEN** 已登入使用者開啟 `/experiences/booking/[sessionId]`，且該場次所屬體驗已下架
- **THEN** 系統導向 `/experiences?error=unavailable`，不顯示預約表單；列表頁看到這個參數時顯示「這個體驗目前沒有開放預約」的提示（中英文）

#### Scenario: 已成立預約在下架後仍可付款
- **WHEN** 某筆 `pending` 預約所屬體驗在建立預約之後才被下架，客人接著進行付款
- **THEN** 付款流程照常進行，不因下架而被拒絕
