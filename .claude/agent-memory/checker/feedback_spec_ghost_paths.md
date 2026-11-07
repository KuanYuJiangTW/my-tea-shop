---
name: spec-ghost-paths
description: openspec 文件常引用不存在的路由／模組（例：tasks 寫「PayPal 體驗付款」），驗 spec 要逐個 grep 路徑是否真存在
metadata:
  type: feedback
---

2026-11-07 openspec change 的 tasks／design 會提到想像中的程式路徑（experience-visibility-toggle 的 tasks 1.6 提「PayPal 體驗付款」，實際 `src/app/api/paypal/` 完全沒有體驗相關；`src/lib/paypal.ts` 的 `experience_context` 是 PayPal 結帳外觀設定，不是「體驗」功能，grep "experience" 會誤中）。

**How to apply:** 驗 spec／tasks 時，對文中每個路徑先 `ls`／`find`；grep 關鍵字命中要看上下文，不要只看有沒有命中。同理，redirect 帶 query（如 `?error=unavailable`）要另外 grep 目標頁有沒有人處理。
