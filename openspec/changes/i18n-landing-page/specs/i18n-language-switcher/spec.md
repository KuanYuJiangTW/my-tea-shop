## ADDED Requirements

### Requirement: Header 顯示語言切換按鈕
系統 SHALL 在前台 Header 右側顯示語言切換元件，讓使用者可在中文與英文之間切換。

#### Scenario: 切換至英文
- **WHEN** 使用者在中文頁面點擊「EN」按鈕
- **THEN** 頁面跳轉至對應的英文 URL（如 `/products` → `/en/products`），內容以英文顯示

#### Scenario: 切換至中文
- **WHEN** 使用者在英文頁面點擊「中」按鈕
- **THEN** 頁面跳轉至對應的中文 URL（如 `/en/products` → `/products`），內容以中文顯示

#### Scenario: 當前語言高亮
- **WHEN** 使用者查看 Header
- **THEN** 當前使用的語言按鈕以高亮樣式標示（另一語言為非高亮狀態）

### Requirement: 語言切換保留當前路徑
系統 SHALL 在語言切換時保留當前頁面路徑，只替換 locale 前綴，不跳回首頁。

#### Scenario: 在商品詳情頁切換語言
- **WHEN** 使用者在 `/products/some-product` 點擊「EN」
- **THEN** 跳轉至 `/en/products/some-product`，而非 `/en/`

#### Scenario: 在首頁切換語言
- **WHEN** 使用者在 `/` 點擊「EN」
- **THEN** 跳轉至 `/en/`
