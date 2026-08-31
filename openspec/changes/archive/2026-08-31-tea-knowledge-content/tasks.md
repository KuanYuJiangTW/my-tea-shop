# Tasks

> **本檔為追溯補寫（2026-08-31）。**
> 這個 change 在 2026-07-19 立案後，實作是分批跟著攻略文一起做掉的，
> 但當時沒有建 tasks.md，於是它在 `changes/` 裡看起來像停滯 35 天的殭屍提案。
> 2026-08-31 盤點時逐項查證實作狀態，補上本檔與 delta spec 後歸檔。
> 每一項的勾選都附「查證方式」，不是憑印象打勾。

## 1. 內容模型

- [x] 1.1 Sanity 新增 `article` schema
      ✅ `src/sanity/schemas/article.ts`。欄位：`slug`／`title`／`titleEn`／`excerpt`／
      `excerptEn`／`coverImage`／`coverImageAlt`／`coverImageAltEn`／`publishedAt`／
      `updatedAt`／`keywords`／`keywordsEn`／`sections`（含 `section`、`paragraphs`、
      `paragraphsEn`）／`relatedExperiences`。
      必填：`slug`、`title`、`excerpt`、`publishedAt`。
- [x] 1.2 英文欄位留空時回退中文
      ✅ `src/lib/articles.ts` 的 `pick`／`pickList`。

## 2. 路由

- [x] 2.1 `/tea-guide` 列表頁（含 `/en`）
      ✅ `src/app/tea-guide/page.tsx`，`revalidate = 3600`。
- [x] 2.2 Sanity 掛掉時不炸頁
      ✅ `src/lib/articles.ts` catch 後回傳空陣列；列表頁有空狀態分支
      （`page.tsx` 的 `articles.length === 0`）。
- [x] 2.3 `/tea-guide/[slug]` 文章頁（含 `/en`）
      ✅ `src/app/tea-guide/[slug]/page.tsx`，`generateStaticParams`＋`revalidate = 3600`，
      查無文章走 `notFound()`。
- [x] 2.4 雙語 hreflang
      ✅ `generateMetadata` 使用 `langAlternates('/tea-guide/${slug}')`。

## 3. SEO

- [x] 3.1 `Article` 與 `BreadcrumbList` JSON-LD
      ✅ 文章頁輸出兩組 `application/ld+json`。
- [x] 3.2 問答型內容另輸出 `FAQPage`
      ✅ `faqPageJsonLd(localizedSections, ...)`。
- [x] 3.3 sitemap 納入文章
      ✅ `src/app/sitemap.ts:16` 有 `/tea-guide`；`:65` 對每篇文章輸出 zh/en 兩筆，
      `lastModified` 取 `updatedAt ?? publishedAt`。
- [x] 3.4 llms.txt 列出文章
      ✅ 2026-08-31 實測線上 `llms.txt` 含
      `https://taiwantea.store/tea-guide/cattle-egret-viewing-guide`。

## 4. 段落自動連結

- [x] 4.1 手機號碼轉 `tel:`、體驗名稱連到體驗頁
      ✅ `linkifyParagraph`，行為由 `src/__tests__/tea-guide/article-links.test.ts` 釘住
      （含「時間與日期不是電話」「市話不認」「跨段落只連第一次」等反例）。

## 5. 內容

- [x] 5.1 萬鷺朝鳳完整攻略（最優先，8 月季節前上線）
      ✅ 線上 `/tea-guide/cattle-egret-viewing-guide` 回 200，含影片、四張圖、
      10 個小標錨點、目錄、季節倒數、浮動 CTA（WORKLOG 2026-08-31 已驗）。
- [ ] 5.2 其餘五篇（高山茶怎麼泡、金萱奶香真相、蜜香紅茶與小綠葉蟬、冷泡茶做法、
      第一次買茶挑選指南）
      ⏸ **未做，且不阻擋歸檔**：文章系統本身已完成並上線，寫文章是持續性的內容工作
      而非這個 change 的收尾條件。已登記在 `openspec/BACKLOG.md` 之外的日常內容排程，
      要開新 change 時再立案。

## 6. 歸檔前查證（2026-08-31）

- [x] 6.1 逐項確認實作存在（見上方各項的「✅」證據）
- [x] 6.2 補寫 delta spec `specs/tea-knowledge-articles/spec.md`，依實際行為書寫
      而非依提案的想像
- [x] 6.3 `npx openspec validate tea-knowledge-content --type change` 通過
