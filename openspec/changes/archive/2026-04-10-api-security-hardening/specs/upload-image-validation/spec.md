## ADDED Requirements

### Requirement: 圖片上傳 MIME 類型白名單驗證
系統 SHALL 在上傳圖片至 Supabase Storage 前，驗證檔案的 MIME 類型與副檔名，只允許安全的圖片格式。

#### Scenario: 上傳允許的圖片格式
- **WHEN** 上傳檔案的 `file.type` 為 `image/jpeg`、`image/png` 或 `image/webp`，且副檔名為 `jpg`、`jpeg`、`png` 或 `webp`
- **THEN** 系統繼續上傳流程

#### Scenario: 上傳不允許的 MIME 類型
- **WHEN** 上傳檔案的 `file.type` 不在允許清單內（如 `application/x-sh`、`application/octet-stream`）
- **THEN** 系統回傳 HTTP 400，body 為 `{ error: "只允許上傳 JPG、PNG、WebP 格式的圖片" }`，不執行上傳

#### Scenario: MIME 類型與副檔名不一致
- **WHEN** 檔案 `file.type` 為允許格式，但副檔名不在白名單內（如 `file.type=image/jpeg` 但檔名為 `evil.exe`）
- **THEN** 系統回傳 HTTP 400，body 為 `{ error: "只允許上傳 JPG、PNG、WebP 格式的圖片" }`
