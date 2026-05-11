## Context

茶藝店已有 COD / ECPay / PayPal 三種付款方式與宅配/超商兩種配送方式。Phase 2a 新增國際配送，讓海外客人（日本、歐洲、澳洲為主）可用 PayPal 付款並填寫國際地址。運費依中華郵政 ePacket 資費表按區域與重量計算。

## Goals / Non-Goals

**Goals:**
- 新增國際配送選項，與現有國內配送共存
- 運費依 ePacket 7 區費率查表計算，支援按重量累進
- 抽出共用運費計算函式，消除現有 5 處重複邏輯
- 國際訂單免運門檻 NT$2,500
- 國際地址表單支援自由文字輸入（不驗證各國格式）

**Non-Goals:**
- 不做 DHL/FedEx 等快遞選項（後續 Phase）
- 不做中國大陸配送（費率/金流/法規不同）
- 不做國際退貨流程（僅加免責聲明）
- 不做即時物流 API 查詢（用資料庫查表）
- 不做管理後台運費區域 CRUD（直接 SQL 管理，後續再做 UI）
- 不做國際訂單追蹤號碼功能（後續 Phase）

## Decisions

### D1：使用中華郵政 ePacket 作為唯一國際配送方式

**選擇**: 國際 e 小包（ePacket），限重 2kg，全程追蹤
**理由**: 價格最低、覆蓋廣（18+ 國家）、茶葉包裝輕量（150g/包 含包裝約 200g）通常不超過 2kg。
**風險**: 速度較慢（7-21 天），但茶葉非急需品，可接受。

### D2：運費按 7 個區域 + 重量查表計算

**資費區域**:

| 區域代碼 | 區域名稱 | 起重(100g) | 續重/100g | 國家 |
|---------|---------|-----------|----------|------|
| asia_1 | 東亞及東南亞 I | 100 | 20 | JP, SG, TH, VN |
| asia_2 | 東亞及東南亞 II | 120 | 20 | ID, KR, MY, PH |
| west_asia | 西亞 | 160 | 25 | IL |
| europe_1 | 歐洲 I | 140 | 25 | DE |
| europe_2 | 歐洲 II | 160 | 25 | FR, GB, NO, PL, DK |
| oceania | 大洋洲 | 180 | 25 | NZ, AU |
| americas | 美洲 | 190 | 30 | US, CA |

**計算公式**: `fee = base + Math.ceil((weight - 100) / 100) * perExtra`
（weight 單位為 g，不足 100g 以 100g 計）

**免運**: 商品小計 >= NT$2,500 時國際運費為 0

### D3：商品配送重量 — DB 欄位 + 後台 UI + 常量 fallback

每種規格的配送重量（含包裝）預設值：

| 規格 | 淨重 | 含包裝配送重量（預設） |
|------|------|----------------------|
| 150g | 150g | 200g |
| 75g | 75g | 120g |
| 茶包 (15包×3g) | 45g | 150g |

**DB 欄位**：products 表新增 3 個 integer 欄位（單位：公克）：
- `shipping_weight_150g` — 150g 規格的配送重量，null 時 fallback 200
- `shipping_weight_75g` — 75g 規格的配送重量，null 時 fallback 120
- `shipping_weight_teabag` — 茶包規格的配送重量，null 時 fallback 150

**後台 UI**：管理後台商品編輯頁新增「配送重量」區塊，3 個輸入框分別對應 3 種規格，placeholder 顯示預設值，留空即使用預設。

**常量 fallback**：`shipping-constants.ts` 維持 `DEFAULT_SPEC_WEIGHT_G` 作為 fallback：
```typescript
export const DEFAULT_SPEC_WEIGHT_G: Record<string, number> = {
  "150g": 200,
  "75g": 120,
  "teabag": 150,
};
```

**重量取用優先順序**：商品 DB 欄位值 > 常量 fallback

**前端可見性**：Product 型別新增 `shippingWeight150g?`、`shippingWeight75g?`、`shippingWeightTeabag?` 欄位。CartItem 已存完整 Product 物件，前端可直接取用計算總重。

**好處**：
- 管理員發現實際重量不對時，可立即從後台調整，不需改程式碼
- 大多數商品留空即可（使用預設值），不增加日常操作負擔
- 未來新增非茶葉商品（禮盒、茶具）可直接填入自訂重量

### D4：國際地址採自由文字輸入

**選擇**: 國家用下拉選單，其餘欄位自由文字輸入
**理由**: 各國地址格式不同（美國有 ZIP+4、英國有 postcode、日本有都道府県），過度驗證只會造成用戶放棄結帳。僅驗證必填欄位不為空。

**shipping_address JSONB 新格式**:
```typescript
{
  type: "international",
  country: "JP",           // ISO 3166-1 alpha-2
  countryName: "Japan",
  state: "Tokyo",
  city: "Shibuya",
  addressLine1: "1-2-3 Shibuya",
  addressLine2: "Apt 401",  // optional
  postalCode: "150-0002"
}
```

### D5：國際訂單僅允許 PayPal 付款

**理由**: ECPay 僅限台灣信用卡、COD 不適用國際。國際訂單結帳頁只顯示 PayPal。

### D6：運費計算重構 — 前後端拆分

為避免前端 bundle 意外引入 Supabase server-side 程式碼，拆成兩個檔案：

**`src/lib/shipping-constants.ts`**（純常量 + 純函式，前後端共用）：
```typescript
export const DEFAULT_SPEC_WEIGHT_G: Record<string, number> = { "150g": 200, "75g": 120, "teabag": 150 };

// 取得單品配送重量：優先用商品自訂值，fallback 到預設
export function getItemWeightG(spec: string, product?: { shippingWeight150g?: number; shippingWeight75g?: number; shippingWeightTeabag?: number }): number

// 加總所有商品配送重量
export function calcTotalWeightG(items: { spec: string; quantity: number; product?: {...} }[]): number

export function calcDomesticFee(deliveryType: "home" | "cvs", subtotal: number): number
```

**`src/lib/shipping.ts`**（async 運費計算，僅後端，import from shipping-constants）：
```typescript
import { calcTotalWeightG, calcDomesticFee } from "./shipping-constants";

export async function calculateShippingFee(params: {
  deliveryType: DeliveryType;
  subtotal: number;
  countryCode?: string;
  items?: { spec: string; quantity: number; product?: {...} }[];
}): Promise<{ fee: number; zoneName?: string; estimatedDays?: string; totalWeightG?: number }>
```

- 國際訂單：用 `calcTotalWeightG()` 算總重（優先商品自訂值 > fallback），查 DB 取費率，超過 2000g 拋出錯誤
- 國內訂單：直接呼叫 `calcDomesticFee()`，不查 DB

現有 5 個 route 中的硬編碼運費邏輯全部替換為 `calculateShippingFee()`。

### D6a：前端即時運費計算

前端不能每次選國家都打 API 算運費。流程如下：

1. 結帳頁載入時，呼叫 `GET /api/shipping/countries` 取得完整國家清單（含 zone 的 base_fee、per_extra、estimated_days）
2. 快取在 React state 中
3. 使用者選國家時，前端直接用快取的費率 + `calcTotalWeightG()` 即時計算運費，零延遲
4. 提交訂單時，後端再用 `calculateShippingFee()` 做最終驗算（以後端為準）

### D7：結帳頁流程變化

```
配送地區選擇:
  [台灣境內]  →  宅配/超商 → 台灣地址表單 → ECPay/PayPal/COD
  [國際配送]  →  國家選單 → 國際地址表單 → 僅 PayPal
                          → 運費即時顯示（依國家+重量）
                          → 國際注意事項聲明
```

### D8：國際訂單注意事項

結帳頁在選擇國際配送時顯示：
- 進口關稅由收件人負擔
- 配送時間為預估，實際可能有所差異
- 退貨運費由買家負擔
- 部分國家可能有茶葉進口限制

### D9：國際電話號碼驗證

現有電話驗證 `^09\d{8}$` 僅允許台灣手機號碼，國際客人無法通過驗證。

**做法**:
- 台灣境內：維持現有 `^09\d{8}$` 驗證
- 國際配送：改用寬鬆驗證 `^\+?[\d\s\-()]{7,20}$`（允許 `+` 前綴、空格、連字號、括號，至少 7 碼）
- 不加國碼下拉選單（過度設計），國際客人自行填入完整號碼（如 `+81-90-1234-5678`）
- 後端同步放寬驗證：`MAX_LENGTHS.phone` 從 20 調大到 30

### D10：PayPal 訂單傳遞國際收件地址

國際訂單建立 PayPal Order 時，將收件地址帶入 PayPal API 的 `purchase_units[0].shipping` 欄位：

```typescript
shipping: {
  name: { full_name: customerName },
  address: {
    address_line_1: addressLine1,
    address_line_2: addressLine2,
    admin_area_2: city,        // city
    admin_area_1: state,       // state/province
    postal_code: postalCode,
    country_code: countryCode, // ISO 3166-1 alpha-2
  }
}
```

**理由**: PayPal Seller Protection 要求訂單包含收件地址。國際訂單若發生爭議（dispute），有地址記錄才能舉證已配送。

### D11：自動化測試策略

沿用現有 Vitest + Node 環境架構，新增 `src/__tests__/international/` 測試目錄。上線前跑 `npm run test` 一鍵驗證全部功能。

**測試檔案結構**：
```
src/__tests__/
├── paypal/                              現有 113 tests（重構後仍需全部通過）
└── international/                       新增
    ├── helpers.ts                       共用測試資料、mock 工具
    ├── shipping-calculator.test.ts      運費核心邏輯（純函式，不需 DB mock）
    ├── shipping-countries-api.test.ts   GET /api/shipping/countries
    ├── create-order-international.test.ts  POST /api/paypal/create-order 國際訂單
    ├── phone-validation.test.ts         國際電話號碼驗證
    └── integration-verification.test.ts 檔案存在、翻譯鍵、型別完整性
```

**測試分層**：

| 層級 | 檔案 | 測試數 | 說明 |
|------|------|--------|------|
| 純邏輯 | shipping-calculator | ~21 | SPEC_WEIGHT_G、calcTotalWeightG、calcDomesticFee、7 區費率、免運、超重、邊界值 |
| 純邏輯 | phone-validation | ~10 | 台灣格式、日本/美國/英國/澳洲國際格式、無效格式 |
| API 路由 | create-order-international | ~15 | 國際訂單建立、地址驗證、PayPal shipping 傳遞、超重拒絕、rollback |
| API 路由 | shipping-countries-api | ~6 | 國家清單回傳、is_active 過濾、費率資訊完整性 |
| 整合驗證 | integration-verification | ~15 | 檔案存在、翻譯鍵、型別定義、code pattern |
| 回歸 | 現有 PayPal 測試 | 113+ | 重構後不壞 |
| **合計** | | **~180+** | |

**Mock 策略**：
- `shipping-calculator.test.ts`：mock Supabase `from("shipping_zones"/"shipping_countries")` 回傳費率資料
- `create-order-international.test.ts`：沿用現有 `helpers.ts` 的 `mockSupabaseChain` 模式
- `phone-validation.test.ts`：純函式測試，不需 mock
- `integration-verification.test.ts`：檔案系統檢查 + 讀取翻譯 JSON

## Risks / Trade-offs

- **[ePacket 限重 2kg]** → 茶葉通常不超過（10 包 150g ≈ 2kg），但需在前端限制超重時提示
- **[美國費率未確認]** → 2026 年新制已擴大到所有國家，美國暫比照加拿大費率（起重 190/續重 30），上線後去郵局確認再調整
- **[運費表更新]** → ePacket 費率偶爾調整，需手動更新 DB，暫不做自動同步
