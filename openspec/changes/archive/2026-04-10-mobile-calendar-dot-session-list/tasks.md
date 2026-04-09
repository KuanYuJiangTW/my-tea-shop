## 1. ExperienceCalendar 重構（圓點 + 展開清單）

- [x] 1.1 新增 `selectedDay: number | null` state，取代原本直接在格內渲染按鈕的做法
- [x] 1.2 重寫日期格 JSX：格子只顯示日期數字 + 圓點（最多 3 個，依場次狀態決定顏色）
- [x] 1.3 實作格子點擊邏輯：點選有場次的日期設定 selectedDay；再點同一天則折疊（toggle to null）；切換月份時重設 selectedDay
- [x] 1.4 在月曆 grid 下方新增場次清單區塊：僅在 selectedDay 非 null 時顯示，列出該日所有場次卡片
- [x] 1.5 場次卡片顯示：開始時間、時長（從 experience prop 取得）、剩餘名額 / 狀態標籤、「立即預約」按鈕
- [x] 1.6 「立即預約」按鈕點擊後 `router.push(/experiences/booking/${s.id})`；額滿或取消場次按鈕 disabled + 說明文字
- [x] 1.7 過去日期格子維持 opacity-40，不可選取（無 onClick）

## 2. 版面調整（手機優先顯示月曆）

- [x] 2.1 在 `page.tsx` 的月曆 `div`（`lg:col-span-3`）加上 `order-first lg:order-last`，讓手機版月曆排在體驗資訊上方

## 3. 樣式細節

- [x] 3.1 確認圓點大小（`w-1.5 h-1.5`）在 7 欄 grid 中不溢出，各瀏覽器正常渲染
- [x] 3.2 選中日期的格子加上視覺高亮（`ring-2 ring-tea-green`）
- [x] 3.3 場次清單區塊加上標題（如「4 月 15 日　場次」）
- [x] 3.4 更新圖例說明，確保仍對應新的圓點配色

## 4. 驗收

- [x] 4.1 手機寬度（375px）模擬：月曆格子無溢出，圓點清晰可見
- [x] 4.2 點選日期 → 展開場次清單 → 點擊「立即預約」可正常進入 booking flow
- [x] 4.3 桌機（1280px）視覺正常，layout 不跑版
- [x] 4.4 `npm run build` 通過，無 TypeScript 錯誤
