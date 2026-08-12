# 任務：全站公告條

## 1. 常數單一事實來源
- [x] 1.1 新增 `src/lib/coupon-constants.ts`，定義 `WELCOME_COUPON`（50／350／30）
- [x] 1.2 `src/app/auth/callback/route.ts` 改引用常數（值不變）

## 2. 元件
- [x] 2.1 新增 `src/components/AnnouncementBar.tsx`
- [x] 2.2 依登入狀態擇一文案；`loading` 期間走配送文案
- [x] 2.3 關閉鈕 + localStorage 7 天靜默，讀寫包 try/catch
- [x] 2.4 金額由 `INTERNATIONAL_FREE_SHIPPING_THRESHOLD` 與 `WELCOME_COUPON` 插值
- [x] 2.5 圖示用 SVG 線條（沿用 Header 語言），不用 emoji

## 3. 掛載
- [x] 3.1 `SiteChrome` 掛在 Header 上方
- [x] 3.2 排除 `/checkout` 與 `/en/checkout`

## 4. i18n
- [x] 4.1 `messages/zh.json` 新增 `common.announcement`
- [x] 4.2 `messages/en.json` 同步

## 5. 驗證（實跑證據見 WORKLOG）
- [x] 5.1 未登入 zh：文案／金額／CTA 連結正確
- [x] 5.2 已登入 zh／en：配送文案，非連結（以暫時反轉條件實跑，已還原）
- [x] 5.3 條高 375／640／768 恆 36px，單行不斷行
- [x] 5.4 **英文 640px 曾斷成兩行（36→55px）**：斷點由 `sm` 提到 `md` 並精簡英文文案後修正
- [x] 5.5 關閉→localStorage 存 7 天→重載仍隱藏→過期恢復
- [x] 5.6 `/checkout` 排除機制（暫改排除 `/products` 實測，已還原）
- [x] 5.7 底色 rgb(92,122,103)、白字、關閉鈕 36×36 實測確認
- [x] 5.8 `/verify` 三項：測試 42 檔 551 測試、型別零錯誤、build 成功

## 6. 待辦（不在本次範圍）
- [x] 6.1 Header 在 768px 有既有水平溢出（購物車圖示 right=787 > vw=753）。
      ✅ 2026-08-13 覆驗：已由 PR #6（a58d422）修掉。768px 實測文件寬 753、購物車圖示右緣 683，無水平溢出
      已用「移除公告條後 scrollWidth 不變」證明與本次改動無關，另案處理
- [ ] 6.2 `/auth/register` 頁上的公告條 CTA 會指向當前頁。不影響功能，
      若要處理可在該頁改為純文字
