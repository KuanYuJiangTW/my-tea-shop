## Why

會員點數新制已完成基礎功能，但經過多角度專業審查（產品設計、程式工程、銷售行銷、會計帳務、資安風控、營運客服），發現若干需要補強的面向：效能瓶頸、並發安全、行銷觸發機制不足、帳務合規缺漏、風控機制缺失、以及營運工具不完整。這些問題在用戶量成長後會成為實際障礙，需要在 production 上線前解決。

## What Changes

### 效能與穩定性
- 已修復：`getValidBalance()` 改為 DB 層過濾（避免拉全部交易到 JS）
- 已修復：`updateMembershipSpend()` 改用 RPC atomic increment（解決 race condition）
- 已修復：`getActiveMultiplier()` 首購判斷提至迴圈外（避免 N+1 查詢）
- 年度重置 Cron 改為批次 update（避免逐筆更新導致 timeout）

### 行銷與用戶體驗
- 點數到期 email 通知（到期前 7 天/3 天自動寄信）
- 升等通知機制（升等時記錄事件，帳戶頁/email 通知）
- 保級預警（年底前顯示「距離保級還差 NT$XXX」）
- 結帳頁顯示等級上限提示文字
- 通用碼套用成功 toast 動畫

### 會計帳務合規
- earnBase 定義明確化（確認使用 subtotal 或 total_amount）
- 點數過期沖銷事件記錄（認列為其他收入）
- 未兌現點數負債報表（IFRIC 13 合規）
- 儀表板新增「點數負債估算」卡片

### 資安風控
- 通用碼輸入 rate limit（防暴力破解）
- 點數異常監測告警（單日折抵超額、短時間大量操作）
- Campaign 修改 audit log

### 營運工具
- 後台手動調整點數功能（客訴補償用）
- 會員等級變動歷史記錄
- 點數明細匯出（CSV/PDF）

## Capabilities

### New Capabilities
- `points-expiry-notification`: 點數到期 email 推播通知 cron
- `tier-upgrade-notification`: 升等/保級預警通知系統
- `points-liability-report`: 未兌現點數負債報表與過期沖銷記錄
- `coupon-rate-limit`: 通用碼輸入頻率限制
- `points-anomaly-detection`: 點數異常監測告警
- `admin-points-adjustment`: 後台手動調整點數功能
- `campaign-audit-log`: 活動設定修改歷史記錄
- `tier-history`: 會員等級變動歷史追蹤

### Modified Capabilities
- （無現有 spec 需修改，均為新增功能）

## Impact

- **Backend API**: 新增 3 個 cron jobs、2 個 admin API、修改 checkout UX
- **Database**: 新增 `tier_history`、`campaign_audit_log`、`points_expiry_events` 表；新增 index
- **Frontend**: 結帳頁提示文字、帳戶頁保級警告、admin 手動點數介面
- **Email**: 新增點數到期通知模板、升等通知模板
- **效能**: 已部分修復（RPC、DB filter、N+1），需部署 SQL migration
- **合規**: 點數負債認列方式需與會計確認後定案
