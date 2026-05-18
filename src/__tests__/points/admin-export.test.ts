import { describe, it, expect, vi, beforeEach } from "vitest";
import { createChainMock } from "./helpers/supabase-mock";
import { NextRequest } from "next/server";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

import { GET } from "@/app/api/admin/points-export/route";

function makeReq(params?: Record<string, string>) {
  const url = new URL("http://localhost/api/admin/points-export");
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

beforeEach(() => vi.clearAllMocks());

describe("points-export API", () => {
  // 6.2
  it("無 userId 匯出全部 → CSV + BOM", async () => {
    mockFrom.mockReturnValue(createChainMock([
      { id: "t1", user_id: "u1", points: 100, type: "earn", description: "消費回饋", admin_note: null, multiplier: 1, created_at: "2026-01-01", expires_at: "2027-01-01", is_flagged: false },
    ], null));

    const res = await GET(makeReq());
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    const body = await res.text();
    expect(body).toContain("ID,");
  });

  // 6.3
  it("帶 userId → 查詢包含 eq", async () => {
    const chain = createChainMock([], null);
    mockFrom.mockReturnValue(chain);

    await GET(makeReq({ userId: "u123" }));
    expect(chain.eq).toHaveBeenCalledWith("user_id", "u123");
  });

  // 6.4
  it("CSV header 包含所有欄位", async () => {
    mockFrom.mockReturnValue(createChainMock([], null));
    const res = await GET(makeReq());
    const body = await res.text();
    const header = body.replace("\uFEFF", "").split("\n")[0];
    for (const col of ["ID", "用戶ID", "點數", "類型", "說明", "管理備註", "倍率", "建立時間", "到期時間", "異常標記"]) {
      expect(header).toContain(col);
    }
  });

  // 6.5
  it("DB 錯誤 → 500", async () => {
    mockFrom.mockReturnValue(createChainMock(null, { message: "query failed" }));
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });
});
