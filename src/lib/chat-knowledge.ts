import { supabase } from "./supabase";
import type { Product, ExperienceType } from "@/types";

// ── 快取 ─────────────────────────────────────────────────────────────────────

interface CachedData {
  products: Product[];
  experiences: ExperienceType[];
  timestamp: number;
}

let cache: CachedData | null = null;
const CACHE_TTL = 60_000; // 60 秒

async function getCachedData(): Promise<CachedData> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache;
  }

  const [productsRes, experiencesRes] = await Promise.all([
    supabase.from("products").select("*").eq("is_active", true).order("id"),
    supabase.from("experience_types").select("*").eq("is_active", true).order("id"),
  ]);

  const products: Product[] = (productsRes.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    nameEn: row.name_en,
    category: row.category,
    origin: row.origin,
    altitude: row.altitude,
    price: row.price,
    weight: row.weight,
    description: row.description,
    descriptionEn: row.description_en || "",
    originEn: row.origin_en || "",
    color: row.color,
    featured: row.featured,
    stockQuantity: row.stock_quantity ?? undefined,
    price75g: row.price_75g ?? undefined,
    priceTeaBag: row.price_tea_bag ?? undefined,
  }));

  const experiences: ExperienceType[] = (experiencesRes.data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    nameEn: row.name_en,
    price: row.price,
    durationHours: row.duration_hours,
    maxParticipants: row.max_participants,
    minParticipants: row.min_participants,
    requiresAdult: row.requires_adult,
    isActive: row.is_active,
  }));

  cache = { products, experiences, timestamp: Date.now() };
  return cache;
}

// ── 知識庫組合 ────────────────────────────────────────────────────────────────

function buildProductsKnowledge(products: Product[], locale: string): string {
  if (products.length === 0) return "";

  const lines = products.map((p) => {
    const name = locale === "en" ? (p.nameEn || p.name) : p.name;
    const desc = locale === "en" ? (p.descriptionEn || p.description) : p.description;
    const origin = locale === "en" ? (p.originEn || p.origin) : p.origin;
    const category = locale === "en"
      ? (p.category === "烏龍茶" ? "Oolong Tea" : "Black Tea")
      : p.category;

    let info = `- ${name}（${category}）：${desc}。產地：${origin}，海拔：${p.altitude}。`;
    info += `價格：NT$${p.price}/${p.weight}`;
    if (p.price75g) info += `、NT$${p.price75g}/75g`;
    if (p.priceTeaBag) info += `、NT$${p.priceTeaBag}/茶包15入`;
    if (p.stockQuantity === 0) info += locale === "en" ? "（Sold Out）" : "（已售完）";
    return info;
  });

  return lines.join("\n");
}

function buildExperiencesKnowledge(experiences: ExperienceType[], locale: string): string {
  if (experiences.length === 0) return "";

  const lines = experiences.map((e) => {
    const name = locale === "en" ? (e.nameEn || e.name) : e.name;
    const duration = locale === "en" ? `${e.durationHours} hours` : `${e.durationHours} 小時`;
    const people = locale === "en"
      ? `${e.minParticipants}-${e.maxParticipants} people`
      : `${e.minParticipants}-${e.maxParticipants} 人`;
    const adult = e.requiresAdult
      ? (locale === "en" ? "，Adults only (18+)" : "，限 18 歲以上")
      : "";

    return `- ${name}：NT$${e.price}/人，時長${duration}，${people}${adult}`;
  });

  return lines.join("\n");
}

function buildFAQ(locale: string): string {
  if (locale === "en") {
    return `- How to brew: Use 5g of tea leaves, 150ml of water at 90-95°C, steep for 60 seconds. Re-steep multiple times.
- Tea storage: Keep in a sealed, dry, cool place away from sunlight. Consume within 6 months after opening.
- Shipping: Orders ship within 2-3 business days via home delivery or convenience store pickup. Free shipping over NT$1500.
- Returns: Unopened products can be returned within 7 days. Opened food products cannot be returned per food safety regulations.
- Gift packaging: Gift box packaging is available. Please mention in the order notes.
- Location: Wu Jue Tea is located in Meishan Township, Chiayi County, Taiwan.`;
  }

  return `- 泡茶方式：取茶葉約 5g，以 90-95°C 熱水 150ml 沖泡，第一泡約 60 秒，可多次回沖。
- 茶葉保存：密封保存於乾燥陰涼處，避免日曬。開封後建議 6 個月內飲用完畢。
- 運送方式：下單後 2-3 個工作天內出貨，支援宅配到府或超商取貨。滿 NT$1500 免運費。
- 退換貨：未開封商品可於 7 天內退換。食品類商品一經開封恕無法退貨（食品衛生法規）。
- 送禮包裝：可提供禮盒包裝服務，請於訂單備註欄說明。
- 地點：霧抉茶位於台灣嘉義縣梅山鄉。`;
}

// ── 匯出 ──────────────────────────────────────────────────────────────────────

export async function buildKnowledgeBase(locale: string): Promise<string> {
  const { products, experiences } = await getCachedData();

  const productSection = buildProductsKnowledge(products, locale);
  const experienceSection = buildExperiencesKnowledge(experiences, locale);
  const faqSection = buildFAQ(locale);

  const sectionTitle = locale === "en"
    ? { products: "Products", experiences: "Tea Mountain Experiences", faq: "FAQ" }
    : { products: "商品資訊", experiences: "茶山體驗活動", faq: "常見問答" };

  return `【${sectionTitle.products}】
${productSection}

【${sectionTitle.experiences}】
${experienceSection}

【${sectionTitle.faq}】
${faqSection}`;
}
