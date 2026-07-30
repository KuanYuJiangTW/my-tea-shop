# 提案：清償既有 lint 債

## 背景

`npm run lint` 在 2026-07-30 之前完全無法執行（script 是被 Next 16 移除的 `next lint`，且 repo 無 eslint 設定檔）。修好之後首次全 repo 掃描得到 **22 個 error（13 檔）＋ 42 個 warning**——這些不是新寫壞的，是 lint 空轉期間累積的既有債。

修 lint 那次已順手處理落在該次 diff 內的 1 個（`ProcessContent.tsx` 的 `react-hooks/set-state-in-effect`），其餘 22 個依店主裁示另立本 change 處理。

## 為什麼值得做（而不是加 eslint-disable）

錯誤的組成本身說明了問題性質：

| 規則 | 數量 | 為什麼是真問題 |
|---|---|---|
| `react-hooks/set-state-in-effect` | 12 | effect 內同步 setState 造成連鎖 render，且讓同一份狀態有兩個事實來源。`tsc` 與單元測試都抓不到 |
| `react-hooks/immutability` | 3 | 直接改動不可變值，在 React 19 的 compiler 下行為未定義 |
| `react-hooks/use-memo` | 3 | `useCallback`/`useMemo` 首參數非 inline function，等於沒有 memo 效果 |
| `react-hooks/purity` | 2 | render 期間有副作用 |
| `@typescript-eslint/no-explicit-any` | 2 | 顯式 `any`，繞過型別檢查 |

修 lint 那次在 `ProcessContent.tsx` 遇到的正是 `set-state-in-effect`，而它確實是個真 bug（用 effect 修正另一個 state，改為 render 時推導後消除了連鎖 render）。同一類問題在本 repo 還有 12 個。

## 範圍與風險分級

**分三批，依風險由低到高。每批獨立驗證、獨立 commit。**

- **批次 C｜前台展示元件（先做）**：`ChatWidget.tsx`、`ProductLightbox.tsx`、`Header.tsx`、`ExperienceCalendar.tsx`、`LoginForm.tsx`
- **批次 B｜admin 後台**：campaigns、coupons、experiences/sessions、members points
- **批次 A｜金流與帳務（最後做）**：`CheckoutClient.tsx`、`AccountClient.tsx`、`account/page.tsx`、bookings participants

> **分級更正**：初版清冊把 `LoginForm.tsx` 歸在「批次 C／風險最低」，**這是錯的**——它屬 auth，是 CLAUDE.md 鐵律 4 明列的高風險區。本 change 仍將它留在批次 C（該檔只有兩個 `no-explicit-any`，是純型別修正），但**套用高風險流程**：改前先讀 `openspec/specs/member-auth*`／`admin-auth` 相關規格，改後必跑 `npm run test`。

## 不做的事

- 不加 `eslint-disable`（那是把債藏起來，不是還債）
- 不改 42 個 warning（另議；error 優先）
- 不順手重構無關的程式碼——每個 commit 只包含讓某個 error 消失所必需的最小改動
- 不改 eslint 規則設定來讓錯誤消失

## 驗收原則

**lint 綠不等於沒改壞。**這些都是營運中的互動元件（聊天視窗、燈箱、Header、預約日曆、登入表單），`set-state-in-effect` 的修法會改變 render 與狀態時序。因此每批都須：

1. `npm run lint` 該批檔案零 error（並依 JUDG-2 第 2 條做歸屬對比）
2. `npm run test` 全綠、無退化
3. `npm run build` 成功
4. **實跑驗證該元件的互動行為**——不接受「測試綠所以應該沒壞」
