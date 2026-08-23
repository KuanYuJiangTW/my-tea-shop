// ─── Product ──────────────────────────────────────────────────────────────────

export interface Product {
  id: number;
  name: string;
  nameEn: string;
  category: ProductCategory;
  origin: string;
  altitude: string;
  price: number;
  weight: string;
  description: string;
  descriptionEn: string;
  originEn: string;
  color: string;
  featured: boolean;
  image?: string;
  image2?: string;
  stockQuantity?: number;  // 150g 庫存
  price75g?: number;       // 75g 售價
  priceTeaBag?: number;    // 茶包 15包×3g 售價
  stock75g?: number;       // 75g 庫存
  stockTeaBag?: number;    // 茶包庫存
  shippingWeight150g?: number;   // 配送重量 150g 規格 (g)
  shippingWeight75g?: number;    // 配送重量 75g 規格 (g)
  shippingWeightTeabag?: number; // 配送重量 茶包規格 (g)
}

export type ProductCategory = "烏龍茶" | "紅茶";

/** 商品規格。原本這組字面值散在各處（CreateOrderRequest、shipping-constants、
 *  orders route 的白名單），組合功能需要在型別上談論規格，趁這次收斂成具名型別 */
export type ProductSpec = "150g" | "75g" | "teabag";

/** 組合成分：指向某商品的某個規格，以及每組需要幾件 */
export interface BundleItem {
  productId: number;
  productName: string;
  productNameEn: string;
  spec: ProductSpec;
  quantity: number;
  /** 該成分目前的庫存；undefined = 資料庫未設定，視同不限量（與 Product 的庫存欄位同語意） */
  stock?: number;
}

/**
 * 組合商品（品飲組）。
 *
 * **沒有自己的庫存欄位**：組合不預先打包，可售量一律由成分推導
 * （`calcBundleAvailable`）。存一份獨立庫存等於同一個事實有兩個來源，一定會不同步。
 */
export interface Bundle {
  id: number;
  slug: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  /** 組合定價，不由成分售價加總推導 */
  price: number;
  items: BundleItem[];
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  product: Product;
  quantity: number;
}

// ─── Checkout ─────────────────────────────────────────────────────────────────

export type PaymentMethod = "online" | "cod" | "stripe" | "paypal";
export type DeliveryType  = "home" | "cvs" | "international";
// OK 超商已被綠界停用（電子地圖回「OK超商暫停服務」），不再開放新訂單選取。
// 歷史訂單可能存有 "ok"，顯示用的名稱對應表仍需保留該鍵。
export type CvsCompany    = "seven" | "family" | "hilife";

export interface InternationalAddress {
  country:      string;
  countryName:  string;
  state:        string;
  city:         string;
  addressLine1: string;
  addressLine2: string;
  postalCode:   string;
}

export interface CheckoutForm {
  name:         string;
  email:        string;
  phone:        string;
  city:         string;
  address:      string;
  cvsCompany:   CvsCompany;
  cvsStoreId:   string;
  cvsStoreName: string;
  note:         string;
  internationalAddress: InternationalAddress;
}

// ─── Order ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending"    // 待付款
  | "paid"       // 已付款
  | "preparing"  // 備貨中
  | "shipped"    // 已出貨
  | "delivered"  // 已送達
  | "cancelled"; // 已取消

export interface OrderItem {
  productId:   number;
  productName: string;
  quantity:    number;
  unitPrice:   number;
  subtotal:    number;
}

export interface Order {
  id:            string;
  createdAt:     string;          // ISO 8601
  status:        OrderStatus;
  paymentMethod: PaymentMethod;
  deliveryType:  DeliveryType;
  items:         OrderItem[];
  subtotal:      number;
  shippingFee:   number;
  total:         number;
  customer: {
    name:  string;
    email: string;
    phone: string;
  };
  shippingAddress?: {
    city:    string;
    address: string;
  };
  cvsInfo?: {
    company:   CvsCompany;
    storeId?:  string;
    storeName: string;
  };
  note?:           string;
  ecpayTradeNo?:   string;        // 綠界交易編號（線上付款才有）
}

// ─── Coupon ───────────────────────────────────────────────────────────────────

export interface Coupon {
  id:             string;
  code:           string;
  source:         string;
  discountAmount: number;
  minOrderAmount: number;
  expiresAt:      string;
  createdAt:      string;
}

// ─── Points ───────────────────────────────────────────────────────────────────

export interface PointTransaction {
  id:          string;
  points:      number;
  type:        "earn" | "redeem";
  description: string | null;
  createdAt:   string;
}

// ─── API Request / Response ───────────────────────────────────────────────────

export interface CreateOrderRequest {
  customer: {
    name:  string;
    email: string;
    phone: string;
  };
  paymentMethod:   PaymentMethod;
  deliveryType:    DeliveryType;
  shippingAddress?: {
    city:    string;
    address: string;
  };
  internationalAddress?: InternationalAddress;
  cvsInfo?: {
    company:   CvsCompany;
    storeId?:  string;
    storeName: string;
  };
  /**
   * 訂單品項：單品或組合。
   *
   * 用 `bundleId` 有沒有值來分辨，不加 `kind` 欄位——既有的購物車與四條建單路徑
   * 都已經在傳單品的形狀，加辨識欄位等於要求所有舊呼叫端一起改。
   */
  items: (
    | { productId: number; quantity: number; spec?: ProductSpec; bundleId?: undefined }
    | { bundleId: number; quantity: number; productId?: undefined; spec?: undefined }
  )[];
  note?:        string;
  couponCode?:  string;
  pointsToUse?: number;
}

// ─── ECPay ────────────────────────────────────────────────────────────────────

export type EcpayCheckoutRequest = CreateOrderRequest;

export interface EcpayCheckoutResponse {
  ecpayUrl: string;
  params:   Record<string, string>;
}

// ─── Experience Booking ───────────────────────────────────────────────────────

export interface AvailabilityWindow {
  startDate: string;   // YYYY-MM-DD
  endDate:   string;   // YYYY-MM-DD，含當天
  note?:     string;
}

export interface ExperienceType {
  id:               number;
  slug:             string;
  name:             string;
  nameEn:           string;
  price:            number;
  durationHours:    number;
  maxParticipants:  number;
  minParticipants:  number;
  requiresAdult:    boolean;
  isActive:         boolean;

  // ── 客製開課請求的可申請性參數（experience-open-class-request）──
  // 全部選填：SQL 還沒執行時是 undefined，功能等同未上線
  acceptsRequests?:   boolean;
  requestMinSlots?:   number | null;
  requestLeadDays?:   number | null;
  requestStartTimes?: string[];      // 每款自己的時段白名單，不是全站常數

  // ── 排序與季節（見 openspec/changes/experience-seasonal-ordering）──
  // 全部選填：SQL 還沒執行時它們會是 undefined，排序安全地退回 id 順序
  sortOrder?:       number | null;
  pinnedUntil?:     string | null;          // YYYY-MM-DD，含當天
  windows?:         AvailabilityWindow[];   // 空陣列＝不分季節，不是「季節外」
}

export interface ExperienceSession {
  id:                  string;
  experienceTypeId:    number;
  sessionDate:         string;   // YYYY-MM-DD
  startTime:           string;   // HH:MM
  status:              SessionStatus;
  currentParticipants: number;
  waitlistCount:       number;
  cancelReason?:       string;
  experienceType?:     ExperienceType;

  // 核准開課請求時建立的場次先是 private（只有拿到專屬連結的人看得到），
  // 申請人付款後若非包場才轉 public 開放併團。既有場次一律 public
  visibility?:         SessionVisibility;
  createdFromRequestId?: string;
}

export type SessionStatus = 'open' | 'full' | 'cancelled';
export type SessionVisibility = 'public' | 'private';

export type BookingStatus = 'pending_payment' | 'confirmed' | 'cancelled' | 'completed';

export type RefundStatus = 'none' | 'pending' | 'processed';

export interface ExperienceBooking {
  id:                 string;
  sessionId:          string;
  userId?:            string;
  participantCount:   number;
  totalPrice:         number;
  status:             BookingStatus;
  bookerName:         string;
  bookerPhone:        string;
  bookerEmail:        string;
  dietaryNotes?:      string;
  adultConfirmed:     boolean;
  ecpayTradeNo?:      string;
  paidAt?:            string;
  cancelledAt?:       string;
  cancellationReason?: string;
  refundAmount?:      number;
  refundStatus:       RefundStatus;
  pointsUsed:         number;
  pointsDiscount:     number;
  participantsDueAt?: string;
  createdAt:          string;
  session?:           ExperienceSession;
  participants?:      BookingParticipant[];
}

export interface BookingParticipant {
  id:                   string;
  bookingId:            string;
  isPrimary:            boolean;
  name:                 string;
  idNumber:             string;
  dateOfBirth:          string;   // YYYY-MM-DD
  emergencyContactName:  string;
  emergencyContactPhone: string;
}

export interface CreateBookingRequest {
  sessionId:        string;
  participantCount: number;
  bookerName:       string;
  bookerPhone:      string;
  dietaryNotes?:    string;
  adultConfirmed?:  boolean;
}

export interface AddParticipantRequest {
  bookingId:            string;
  isPrimary?:           boolean;
  name:                 string;
  idNumber:             string;
  dateOfBirth:          string;
  emergencyContactName:  string;
  emergencyContactPhone: string;
}

// ─── Experience Review ────────────────────────────────────────────────────────

export interface ExperienceReview {
  id:               string;
  bookingId:        string;
  userId:           string;
  experienceTypeId: number;
  rating:           number;
  comment:          string | null;
  isVisible:        boolean;
  createdAt:        string;
}

// ─── Waitlist ─────────────────────────────────────────────────────────────────

export type WaitlistStatus = 'waiting' | 'notified' | 'confirmed' | 'expired' | 'cancelled';

export interface WaitlistEntry {
  id:               string;
  sessionId:        string;
  userId?:          string;
  bookerName:       string;
  bookerPhone:      string;
  bookerEmail:      string;
  participantCount: number;
  dietaryNotes?:    string;
  adultConfirmed:   boolean;
  status:           WaitlistStatus;
  notifiedAt?:      string;
  confirmDeadline?: string;
  createdAt:        string;
}

// ─── Contact Form ─────────────────────────────────────────────────────────────

export type ContactSubject = "product" | "order" | "wholesale" | "visit" | "other";
export type ContactStatus  = "idle" | "submitting" | "success" | "error";

export interface ContactForm {
  name:    string;
  email:   string;
  subject: ContactSubject | "";
  message: string;
}

// ─── 客製開課請求（openspec/changes/experience-open-class-request）───────────

/**
 * 狀態機（design.md D5）。`converted` 是終局——請求已變成一筆真實預約，
 * `sessionId` 與 `bookingId` 都填上。統計漏斗（送出 → 核准 → 成交）直接查
 * 這張表就有。
 */
export type ExperienceRequestStatus =
  | 'pending'              // 待審
  | 'approved'             // 已核准，等申請人用專屬連結完成付款
  | 'alternative_offered'  // 業主提了替代方案，等申請人選
  | 'declined'             // 婉拒
  | 'expired'              // 連結逾期或替代方案逾期未回應
  | 'withdrawn'            // 申請人自己撤回
  | 'converted';           // 已成為真實預約

export interface ExperienceRequest {
  id:                 string;
  requestNo:          string;   // 人可讀的查詢編號，可以在電話裡念
  experienceTypeId:   number;
  preferredDate:      string;   // YYYY-MM-DD
  preferredStartTime: string;   // HH:MM
  altDate?:           string;
  altStartTime?:      string;
  headcount:          number;
  isPrivate:          boolean;

  contactName:        string;
  contactPhone:       string;
  contactEmail:       string;
  contactLine?:       string;
  contactPreference?: string;
  contactTime?:       string;
  note?:              string;

  userId?:            string;
  locale:             string;
  status:             ExperienceRequestStatus;

  /** 自助查詢／撤回／選替代方案／預約共用。不可猜，且不會出現在客人端以外的地方 */
  token:              string;
  tokenExpiresAt?:    string;

  sessionId?:         string;
  bookingId?:         string;

  /** 只有管理員看得到。MUST NOT 出現在客人端回應或信件 */
  adminNote?:         string;
  declineReason?:     string;
  reviewedAt?:        string;
  reviewedBy?:        string;
  createdAt:          string;

  experienceType?:    ExperienceType;
}

export interface ExperienceRequestAlternative {
  id:                 string;
  requestId:          string;
  altDate:            string;
  altStartTime:       string;
  /** 有值代表「請客人加入這一場」，而不是為他另開一場 */
  existingSessionId?: string;
  sortOrder:          number;
}

/** 公休／黑名單日期。只擋新請求，不影響既有場次與預約 */
export interface ExperienceBlackoutDate {
  id:           string;
  blackoutDate: string;
  reason?:      string;
}
