# Tasks: 風土數位報價頁

## 1. 資料層

- [x] 1.1 建 `supabase/add_web_inquiries.sql`：`web_inquiries` 表（六題欄位：referral_source、industry_brand、pain_points text[]、budget_range、timeline、contact_name、contact_line、contact_email、contact_time、locale、created_at）＋ enable RLS 不建 policy（deny by default），附註解說明由業主在 SQL editor 執行

## 2. 後端

- [x] 2.1 `src/lib/email.ts` 新增 `sendWebInquiryEmail()`：照 `sendContactEmail()` 結構，寄六題摘要到 `ADMIN`
- [x] 2.2 `src/app/api/web-inquiry/route.ts`：rate-limit → honeypot 檢查（有值回 200 靜默丟棄）→ 欄位驗證（必填＋單選/複選白名單，非法回 400）→ service_role insert → best-effort 寄信（try/catch 只 log）

## 3. 前端

- [x] 3.1 `messages/zh.json`＋`messages/en.json` 新增 `webDesign` namespace：Hero、三階報價卡（含定價、內容、交期、適合誰）、加購、維護方案、商業條款、FAQ、表單六題與錯誤/成功訊息、課程籌備一行
- [x] 3.2 `src/app/web-design/page.tsx`（server）：metadata（`langAlternates("/web-design")`）＋靜態區塊（Hero／三階卡／加購／維護／條款／FAQ／課程行），98K 卡「最多人選」視覺強調
- [x] 3.3 `src/app/web-design/InquiryFormClient.tsx`（client）：六題受控表單＋honeypot＋前端必填驗證（姓名、LINE/Email 擇一）＋fetch POST＋成功畫面（LINE 按鈕依 `NEXT_PUBLIC_LINE_ADD_URL` 有無渲染）
- [x] 3.4 `src/components/Footer.tsx` 加「本網站設計開發：風土數位」徽章連結（`lp("/web-design")`，雙語字串進 `common.footer`）

## 4. 測試與驗證

- [x] 4.1 `src/__tests__/web-inquiry/route.test.ts`：合法提交寫入＋200、白名單外值 400 不寫入、honeypot 200 靜默丟棄、寄信拋錯仍 200、rate-limit 觸發
- [x] 4.2 跑 `/verify`（測試＋tsc＋build）全綠
- [x] 4.3 派 checker 驗收（對照兩份 spec 逐條）
- [x] 4.4 補 `/web-design` 進 `src/app/sitemap.ts`（規格外但必要：報價頁要被搜尋引擎找到）

## 5. 收尾

- [x] 5.1 WORKLOG 補記＋commit＋push

## 6. v2：痛點／成果文案與案例故事頁（2026-08-02）

- [x] 6.1 報價頁插入痛點區塊（5 場景＋轉折句）與成果區塊（4 利益＋ROI 試算框＋案例頁連結），位置：Hero 之後、三階卡之前；FAQ 加 `id="faq"`、表單加 `id="inquiry"`；文案照 copy-zh.md v2 逐字
- [x] 6.2 `src/app/web-design/case/page.tsx` 案例故事頁（webDesignCase namespace、`langAlternates("/web-design/case")`、LINE 按鈕沿用環境變數規則）
- [x] 6.3 `messages/zh.json`＋`en.json` 新增對應字串（zh 逐字、en 行銷語感翻譯）
- [x] 6.4 `src/app/sitemap.ts` 加 `/web-design/case`
- [x] 6.5 LINE 圖文選單 1200×810 設計稿 PNG＋後台設定說明（主對話自製，PNG 已交付使用者）
- [ ] 6.6 `/verify` 全綠＋checker 對照更新後 spec 驗收＋commit/push
