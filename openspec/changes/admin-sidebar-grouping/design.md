## Context

現有 `AdminSidebar` 使用 `navItems` 陣列統一渲染，無群組概念。新設計改為「群組標題 + 縮排項目」的分層結構。

## Goals / Non-Goals

**Goals:**
- 導航項目依業務分組，提升可讀性

**Non-Goals:**
- 可折疊群組（目前不需要）
- 權限控制（所有項目對管理員全部顯示）

## Decisions

### D1：以靜態群組物件取代單一 navItems 陣列

將導航結構改為群組陣列：

```
[
  { type: "item",  href: "/admin/dashboard", label: "儀表板" },
  { type: "group", label: "茶山體驗", items: [
      { href: "/admin/experiences", label: "體驗管理" },
      { href: "/admin/reviews",     label: "評價管理" },
      { href: "/studio", label: "內容管理", external: true },
  ]},
  { type: "group", label: "商品", items: [
      { href: "/admin/orders",   label: "訂單管理" },
      { href: "/admin/products", label: "產品管理" },
  ]},
]
```

### D2：群組標題使用小字大寫樣式，與項目視覺區隔

群組標題：`text-[#7D9B84] text-[10px] tracking-widest uppercase px-3 pt-4 pb-1`

### D3：內容管理（external）維持 `<a target="_blank">`，其餘用 Next.js `<Link>`

`external: true` 的項目渲染為 `<a>` 並加外部連結圖示，其餘維持現有 `<Link>` 行為。
