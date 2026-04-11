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
  color: string;
  featured: boolean;
  image?: string;
  image2?: string;
  stockQuantity?: number;  // 150g 庫存
  price75g?: number;       // 75g 售價
  priceTeaBag?: number;    // 茶包 15包×3g 售價
  stock75g?: number;       // 75g 庫存
  stockTeaBag?: number;    // 茶包庫存
}

export type ProductCategory = "烏龍茶" | "紅茶";

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  product: Product;
  quantity: number;
}

// ─── Checkout ─────────────────────────────────────────────────────────────────

export type PaymentMethod = "online" | "cod";
export type DeliveryType  = "home" | "cvs";
export type CvsCompany    = "seven" | "family" | "hilife" | "ok";

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
  cvsInfo?: {
    company:   CvsCompany;
    storeId?:  string;
    storeName: string;
  };
  items: {
    productId: number;
    quantity:  number;
    spec?:     "150g" | "75g" | "teabag";
  }[];
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
}

export type SessionStatus = 'open' | 'full' | 'cancelled';

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
