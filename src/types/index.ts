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
  stockQuantity?: number;
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
    storeName: string;
  };
  note?:           string;
  ecpayTradeNo?:   string;        // 綠界交易編號（線上付款才有）
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
    storeName: string;
  };
  items: {
    productId:  number;
    name:       string;
    quantity:   number;
    unitPrice:  number;
  }[];
  shippingFee:  number;
  totalAmount:  number;
  note?:        string;
}

// ─── ECPay ────────────────────────────────────────────────────────────────────

export type EcpayCheckoutRequest = CreateOrderRequest;

export interface EcpayCheckoutResponse {
  ecpayUrl: string;
  params:   Record<string, string>;
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
