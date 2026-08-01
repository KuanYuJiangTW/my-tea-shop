import type { CvsCompany } from "@/types";

/**
 * 超商店到店可用性（綠界 C2C）
 *
 * OK 超商已停用：綠界電子地圖對 OKMARTC2C 一律回
 * 「OK超商暫停服務(若有寄件需求，請使用711、全家、萊爾富)」，
 * 不分 IsCollection 帶 N 或 Y（2026-08-01 對正式環境實測）。
 * 歷史訂單仍可能存有 "ok"，故各處顯示用的名稱對應表要保留它。
 */
export const CVS_COMPANIES: readonly CvsCompany[] = ["seven", "family", "hilife"];

/**
 * 支援代收貨款（貨到付款）的超商——目前三家皆可。
 *
 * 代收金額是賣家在綠界後台建物流單時填的，門市櫃台不經手；
 * 走進萊爾富櫃台自己填單的散客店到店不代收，那是另一種服務，不適用於此。
 * 2026-08-01 對綠界測試環境（官方 C2C 測試特店 2000933）實測：
 * HILIFEC2C + IsCollection=Y 建單成立。
 *
 * 這個清單刻意與 CVS_COMPANIES 分開：超商的代收支援度變動過
 * （OK 就整個停掉了），日後某家停止代收時只需改這裡一行。
 */
export const CVS_COD_COMPANIES: readonly CvsCompany[] = ["seven", "family", "hilife"];

/** 綠界物流子類型（C2C 店到店） */
export const CVS_SUBTYPE: Record<CvsCompany, string> = {
  seven:  "UNIMARTC2C",
  family: "FAMIC2C",
  hilife: "HILIFEC2C",
};

export function isValidCvs(company: string): company is CvsCompany {
  return (CVS_COMPANIES as readonly string[]).includes(company);
}

export function cvsSupportsCod(company: string): boolean {
  return (CVS_COD_COMPANIES as readonly string[]).includes(company);
}
