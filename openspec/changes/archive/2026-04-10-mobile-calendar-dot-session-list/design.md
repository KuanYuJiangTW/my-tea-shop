## Context

體驗詳情頁（`/experiences/[slug]`）的月曆元件 `ExperienceCalendar.tsx` 目前在每個日期格內直接渲染場次按鈕。桌機尚可接受，但手機（375px）下每格僅 ~47px 寬，兩行文字（時間 + 剩餘人數）必然溢出或被截斷，觸控目標也遠低於 44px 的無障礙最低建議。

改動範圍刻意縮到單一元件，不動 API 路由與 booking flow，降低風險。

## Goals / Non-Goals

**Goals:**
- 月曆格子只顯示日期數字 + 彩色圓點，保持格子大小可預期
- 點選某日後，月曆正下方展開該日場次清單（每個場次為一張完整卡片）
- 手機版 page.tsx 讓月曆先於體驗資訊顯示（`order-first`）
- 桌機版視覺維持不變或更好

**Non-Goals:**
- 不改動 `/experiences/booking/[sessionId]` 的 booking flow
- 不新增 npm 套件
- 不改 Supabase API 路由

## Decisions

### 圓點設計

每個日期格最多顯示 3 個圓點（多場次時截斷），顏色對應狀態：
- 綠色（`bg-tea-green`）= 有場次可預約
- 灰色（`bg-tea-text-light/40`）= 額滿
- 紅色（`bg-red-300`）= 已取消

選擇最多 3 點而非全數顯示，是因為格子寬度（~47px）放不下超過 3 個 8px 圓點加間距，且用戶只需知道「有沒有場次」而非精確數量。

### 選取狀態

用 `selectedDay: number | null` state 追蹤。點同一天再次點擊 → 折疊（toggle）。切換月份時 selectedDay 重設為 null。

**為何不用 bottom sheet？** 避免引入額外 portal/overlay 複雜度；inline 展開在此場景（單一區塊頁面）夠用，也容易測試。

### 場次卡片

每張卡片顯示：開始時間、時長、剩餘名額 / 狀態標籤、「立即預約」按鈕。卡片高度固定易觸控，不可預約時按鈕 disabled + 說明文字。

### 版面順序

在 `page.tsx` 的月曆 `div` 加上 `order-first lg:order-last`（Tailwind CSS flexbox/grid order）。此方法不需改 DOM 結構，只用 CSS 調整視覺順序，對 SEO 無影響。

## Risks / Trade-offs

- **圓點數量截斷** → 極少數日期有 4+ 場次時用戶看不出確切數量，但點選後清單完整展開，可接受
- **inline 展開位移版面** → 選取日期後下方內容往下推，用戶感知跳動；若覺得體驗差可改 fixed 高度或 scroll-into-view，先觀察再調
- **order-first 對 SEO** → 僅影響視覺順序，DOM 順序不變，搜尋引擎仍能正確理解內容結構
