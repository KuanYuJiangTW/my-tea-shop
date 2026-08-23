# 萬鷺朝鳳半日・等鳥茶席 — Sanity 內容（任務 9b.2，待業主貼上）

程式與資料庫的部分已經做完（`supabase/add_egret_half_day.sql`、
`src/lib/experiences.ts` 的備援內容）。**這一頁是要貼進 `/studio` 的文案**——
Sanity 是對外內容，沒有你點「Publish」就不會上線，所以留給你決定。

上架順序建議：
1. 在 Supabase SQL Editor 跑 `supabase/add_egret_half_day.sql`（它建的是
   `is_active = FALSE`，前台還看不到）
2. 在 `/studio` 依下表建一筆 Experience，slug 填 `egret-half-day`，補上照片
3. 確認前台預覽沒問題後，跑檔末那一行 `UPDATE … is_active = TRUE`

---

## 基本欄位

| 欄位 | 值 |
|---|---|
| slug | `egret-half-day` |
| 名稱 | 萬鷺朝鳳半日・等鳥茶席 |
| Name (EN) | Ten Thousand Egrets Half-Day with Tea Sitting |
| 價格 | 650 元 |
| 時長 | 4 小時（14:00–18:00） |
| 人數 | 最低 3 人、最多 12 人 |

## Tagline

**zh-TW**
> 秋季限定・下午兩點入席，一壺茶配炭火小點，坐到六點鷺鳥歸巢最壯觀的那一刻。

**EN**
> Autumn only. Take your seat at two, a pot of mountain tea and charcoal-baked
> snacks in hand, and stay until six — when the egrets come home in their thousands.

## 包含項目

**zh-TW**
- 專業在地嚮導全程帶領（約 90 分鐘導覽）
- 等鳥茶席：一壺高山茶可續水，坐到活動結束
- 炭火烘的手作小點一份
- 萬鷺朝鳳生態解說手冊一份
- 信淳茶居停車位（導覽客人免停車費）

**EN**
- Guided walk with a local host (about 90 minutes)
- Tea sitting while you wait: one pot of high-mountain tea, refilled as long as you stay
- Charcoal-baked handmade snacks
- Illustrated guide to the egret gathering
- Parking at Xinchun Tea House (free for tour guests)

## 注意事項

**zh-TW**
- 集合地點：信淳茶居（本身就是停車場），車子可以開到門口，適合推嬰兒車與長輩
- 本活動限定期間：8 月 22 日至 10 月 11 日（依鷺鳥族群實際抵達狀況可能微調）
- 下午 2 點入席至 6 點；黃頭鷺從下午 2 點左右陸續出現，3 點到傍晚 6 點最壯觀
- 茶席設在戶外，備有遮蔭；遇雨可免費改期一次，不退費
- 最低成行 3 人；未達人數會在活動前三天通知並全額退費
- 請勿使用空拍機追逐鳥群，以保護野生動物棲息環境

**EN**
- Meeting point: Xinchun Tea House, which is also the car park — drive right up to
  the door; stroller- and elder-friendly
- Season: 22 August – 11 October (may shift slightly with the birds)
- Seated from 2pm to 6pm. Egrets start arriving around 2, and 3pm to dusk is the peak
- The tea sitting is outdoors with shade. Rain: one free reschedule, no refund
- Minimum 3 guests. Below that we notify you three days ahead and refund in full
- No drones over the flock, please

## 相簿建議

至少三張：茶席擺設（近景）、鳥群（遠景，說明「這是你會看到的」）、
信淳茶居門口與停車空間（回答「車停哪」）。

---

## 為什麼是新的一款，不是加購

加購要動 booking schema——品項、金額、退款分攤都要改，是一整套子系統。
而這裡實際上賣的是不同的行程：待四個小時，茶席就是等鳥那兩小時的內容。
開新款只是一筆資料，客人在列表上也直接看得懂差別。

兩款並存、不互相取代：

| | 萬鷺朝鳳・茶山導覽 | 萬鷺朝鳳半日・等鳥茶席 |
|---|---|---|
| 價格 | 250 元 | 650 元 |
| 時長 | 1.5 小時 | 4 小時 |
| 適合 | 順路來看、時間不多 | 專程來、想待到鳥況最好的時候 |
