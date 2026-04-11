## ADDED Requirements

### Requirement: 前台 UI 字串支援中英文翻譯
系統 SHALL 透過 `next-intl` 的 `useTranslations` / `getTranslations` hook 管理所有前台 UI 字串，不得在元件中硬編碼文案。

#### Scenario: 英文頁面顯示英文文案
- **WHEN** 使用者訪問 `/en/products`
- **THEN** 頁面標題、按鈕、標籤等所有 UI 文案顯示為英文

#### Scenario: 中文頁面顯示中文文案
- **WHEN** 使用者訪問 `/products`
- **THEN** 頁面標題、按鈕、標籤等所有 UI 文案顯示為繁體中文

### Requirement: 翻譯涵蓋主要前台頁面
系統 SHALL 完成以下頁面的雙語翻譯：Header、Footer、首頁（Landing Page）、商品列表、商品詳情、體驗列表、體驗詳情、購物車、帳戶頁（我的訂單、我的預約）。

#### Scenario: 首頁雙語
- **WHEN** 使用者分別訪問 `/` 和 `/en/`
- **THEN** Hero 標語、品牌介紹、CTA 按鈕分別以中文和英文呈現

#### Scenario: 商品頁雙語
- **WHEN** 使用者分別訪問 `/products` 和 `/en/products`
- **THEN** 篩選器、排序、加入購物車按鈕文案分別以中英文呈現

#### Scenario: 體驗頁雙語
- **WHEN** 使用者分別訪問 `/experiences` 和 `/en/experiences`
- **THEN** 體驗類型標籤、立即預約按鈕文案分別以中英文呈現

### Requirement: 翻譯檔案以 namespace 分組管理
系統 SHALL 將翻譯字串以 `common`、`home`、`products`、`experiences`、`cart`、`account` 等 namespace 分組存放在 `messages/zh.json` 與 `messages/en.json`。

#### Scenario: 取得 common namespace 翻譯
- **WHEN** 元件呼叫 `useTranslations("common")`
- **THEN** 可取得 `addToCart`、`backToList`、`loading` 等跨頁共用文案

#### Scenario: 缺少翻譯 key 的 fallback
- **WHEN** 英文翻譯檔缺少某個 key
- **THEN** next-intl 回傳 key 名稱作為 fallback，不拋出錯誤（開發期間 console 警告）
