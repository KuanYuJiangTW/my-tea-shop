import { describe, it, expect, vi, beforeEach } from "vitest";
import { createChainMock } from "./helpers/supabase-mock";
import { NextRequest } from "next/server";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

// Import handlers
import { GET } from "@/app/api/admin/campaigns/[id]/history/route";
import { PATCH, DELETE } from "@/app/api/admin/campaigns/[id]/route";

function makeReq(method: string, body?: unknown) {
  const opts: RequestInit = { method };
  if (body) {
    opts.headers = { "Content-Type": "application/json" };
    opts.body = JSON.stringify(body);
  }
  return new NextRequest("http://localhost/api/admin/campaigns/test-id", opts);
}

const params = { params: Promise.resolve({ id: "camp-1" }) };

beforeEach(() => vi.clearAllMocks());

describe("campaign audit log", () => {
  // 7.2
  it("GET history → 回傳 audit log 陣列", async () => {
    const logs = [
      { id: "l1", action: "update", changed_fields: ["name"], changed_at: "2026-01-01" },
    ];
    mockFrom.mockReturnValue(createChainMock(logs, null));

    const res = await GET(makeReq("GET"), params);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].action).toBe("update");
  });

  // 7.3
  it("PATCH 修改 → 寫入 audit log", async () => {
    const existing = { id: "camp-1", name: "舊名稱", multiplier: 2, ends_at: "2099-12-31T00:00:00Z", is_active: true };
    const insertMock = vi.fn().mockResolvedValue({ error: null });

    let callIdx = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "points_campaigns") {
        callIdx++;
        if (callIdx === 1) return createChainMock(existing, null); // select existing
        return createChainMock({ ...existing, name: "新名稱" }, null); // update
      }
      if (table === "campaign_audit_log") return { insert: insertMock };
      return createChainMock(null, null);
    });

    const res = await PATCH(makeReq("PATCH", { name: "新名稱" }), params);
    expect(res.status).toBe(200);
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      campaign_id: "camp-1",
      action: "update",
      changed_fields: expect.arrayContaining(["name"]),
    }));
  });

  // 7.4
  it("DELETE 停用 → 寫入 audit log (deactivate)", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "points_campaigns") return createChainMock(null, null);
      if (table === "campaign_audit_log") return { insert: insertMock };
      return createChainMock(null, null);
    });

    const res = await DELETE(makeReq("DELETE", {}), params);
    expect(res.status).toBe(200);
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      action: "deactivate",
      changed_fields: ["is_active"],
    }));
  });

  // 7.5
  it("無歷史 → 回傳空陣列", async () => {
    mockFrom.mockReturnValue(createChainMock([], null));
    const res = await GET(makeReq("GET"), params);
    const json = await res.json();
    expect(json).toEqual([]);
  });
});
