import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data: countries, error: countriesError } = await supabase
    .from("shipping_countries")
    .select("country_code, country_name, country_name_en, zone_code, is_active")
    .eq("is_active", true)
    .order("country_name_en");

  if (countriesError) {
    return NextResponse.json({ error: "Failed to fetch countries" }, { status: 500 });
  }

  const { data: zones, error: zonesError } = await supabase
    .from("shipping_zones")
    .select("zone_code, zone_name, zone_name_en, base_fee, per_extra, estimated_days_min, estimated_days_max")
    .eq("is_active", true);

  if (zonesError) {
    return NextResponse.json({ error: "Failed to fetch zones" }, { status: 500 });
  }

  const zoneMap = new Map(zones.map((z: { zone_code: string }) => [z.zone_code, z]));

  const result = countries.map((c: { country_code: string; country_name: string; country_name_en: string; zone_code: string }) => {
    const zone = zoneMap.get(c.zone_code) as { base_fee: number; per_extra: number; estimated_days_min: number; estimated_days_max: number; zone_name: string; zone_name_en: string } | undefined;
    return {
      countryCode: c.country_code,
      countryName: c.country_name,
      countryNameEn: c.country_name_en,
      zoneCode: c.zone_code,
      zoneName: zone?.zone_name_en ?? c.zone_code,
      baseFee: zone?.base_fee ?? 0,
      perExtra: zone?.per_extra ?? 0,
      estimatedDaysMin: zone?.estimated_days_min ?? 7,
      estimatedDaysMax: zone?.estimated_days_max ?? 14,
    };
  });

  return NextResponse.json(result);
}
