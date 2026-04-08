## 1. AdminSidebar 重構為分組式導航

- [x] 1.1 將 `navItems` 陣列改為分組結構（儀表板獨立、茶山體驗群組、商品群組）
- [x] 1.2 新增群組標題渲染（小字大寫樣式：`text-[#7D9B84] text-[10px] tracking-widest uppercase`）
- [x] 1.3 「內容管理」從 nav 末端移入「茶山體驗」群組，維持 `<a target="_blank">` + 外部連結圖示
- [x] 1.4 確認各項目的 active 判斷邏輯正確（dashboard 精確比對、其他用 startsWith）
