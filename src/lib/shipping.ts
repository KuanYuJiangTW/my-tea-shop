import { supabase } from "./supabase";
import {
  calcTotalWeightG,
  calcDomesticFee,
  INTERNATIONAL_FREE_SHIPPING_THRESHOLD,
  EPACKET_MAX_WEIGHT_G,
  type WeightItem,
} from "./shipping-constants";

export { calcTotalWeightG, calcDomesticFee } from "./shipping-constants";
export { DEFAULT_SPEC_WEIGHT_G, getItemWeightG, INTERNATIONAL_FREE_SHIPPING_THRESHOLD, EPACKET_MAX_WEIGHT_G } from "./shipping-constants";
export type { WeightItem } from "./shipping-constants";

// ─── Types ────────────────────────────────────────────────────────────────

type DeliveryType = "home" | "cvs" | "international";

interface ShippingFeeParams {
  deliveryType: DeliveryType;
  subtotal: number;
  countryCode?: string;
  items?: WeightItem[];
}

interface ShippingFeeResult {
  fee: number;
  zoneName?: string;
  estimatedDays?: string;
  totalWeightG?: number;
}

// ─── Main ─────────────────────────────────────────────────────────────────

export async function calculateShippingFee(params: ShippingFeeParams): Promise<ShippingFeeResult> {
  const { deliveryType, subtotal } = params;

  // 國內訂單
  if (deliveryType === "home" || deliveryType === "cvs") {
    return { fee: calcDomesticFee(deliveryType, subtotal) };
  }

  // 國際訂單
  const { countryCode, items } = params;
  if (!countryCode) throw new Error("Country code is required for international shipping");

  // 查詢國家與區域費率
  const { data: country, error: countryError } = await supabase
    .from("shipping_countries")
    .select("country_name, country_name_en, zone_code")
    .eq("country_code", countryCode)
    .eq("is_active", true)
    .single();

  if (countryError || !country) {
    throw new Error("Unsupported country");
  }

  const { data: zone, error: zoneError } = await supabase
    .from("shipping_zones")
    .select("zone_name, zone_name_en, base_fee, per_extra, estimated_days_min, estimated_days_max")
    .eq("zone_code", country.zone_code)
    .eq("is_active", true)
    .single();

  if (zoneError || !zone) {
    throw new Error("Shipping zone not found");
  }

  // 計算總重
  const totalWeightG = items ? calcTotalWeightG(items) : 0;
  if (totalWeightG > EPACKET_MAX_WEIGHT_G) {
    throw new Error("Exceeds 2kg weight limit");
  }

  // 免運檢查
  if (subtotal >= INTERNATIONAL_FREE_SHIPPING_THRESHOLD) {
    return {
      fee: 0,
      zoneName: zone.zone_name_en,
      estimatedDays: `${zone.estimated_days_min}-${zone.estimated_days_max}`,
      totalWeightG,
    };
  }

  // 計算運費：base + ceil((weight - 100) / 100) * perExtra
  const weight = Math.max(totalWeightG, 100); // 最低 100g
  const extraUnits = Math.ceil((weight - 100) / 100);
  const fee = zone.base_fee + extraUnits * zone.per_extra;

  return {
    fee,
    zoneName: zone.zone_name_en,
    estimatedDays: `${zone.estimated_days_min}-${zone.estimated_days_max}`,
    totalWeightG,
  };
}
