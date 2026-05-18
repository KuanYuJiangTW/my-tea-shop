import { vi } from "vitest";
import { NextRequest } from "next/server";

// ── 0.1 createChainMock ─────────────────────────────────────────────────

type ChainResult = { data: unknown; error: unknown; count?: number };

export function createChainMock(
  data: unknown = null,
  error: unknown = null,
): Record<string, ReturnType<typeof vi.fn>> & { _result: ChainResult } {
  const result: ChainResult = { data, error, count: Array.isArray(data) ? data.length : 0 };

  const chain: Record<string, unknown> = { _result: result };
  const methods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "gt", "lt", "gte", "lte",
    "is", "in", "or", "not", "filter",
    "order", "limit", "range",
  ];

  // All chainable methods return the chain itself
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }

  // Terminal methods resolve the result
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);

  // Make chain thenable so `await supabase.from(...).select(...).eq(...)` works
  (chain as Record<string, unknown>).then = (
    resolve: (v: ChainResult) => void,
    reject?: (e: unknown) => void,
  ) => Promise.resolve(result).then(resolve, reject);

  return chain as Record<string, ReturnType<typeof vi.fn>> & { _result: ChainResult };
}

// ── 0.2 createTableRouter ───────────────────────────────────────────────

type TableConfig = Record<string, { data?: unknown; error?: unknown }>;

export function createTableRouter(config: TableConfig) {
  const mockFrom = vi.fn().mockImplementation((table: string) => {
    const entry = config[table];
    if (entry) return createChainMock(entry.data ?? null, entry.error ?? null);
    // Default: empty success
    return createChainMock(null, null);
  });

  return mockFrom;
}

// ── 0.3 createCronRequest ───────────────────────────────────────────────

export function createCronRequest(secret?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (secret) {
    headers["authorization"] = `Bearer ${secret}`;
  }
  return new NextRequest("http://localhost/api/cron/test", { headers });
}
