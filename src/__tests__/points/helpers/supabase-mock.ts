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

// ── 0.1b createSelectAwareChainMock ─────────────────────────────────────

/**
 * 依 `select()` 指定的欄位裁切回傳資料，模擬 Supabase 的真實行為。
 *
 * `createChainMock` 不管 select 什麼都回傳完整物件，於是「select 忘了取某個
 * 欄位、後面的程式卻讀它」這類 bug 在測試裡完全隱形——`points-expiry-notify`
 * 的 7 天標記就是這樣漏掉的：查詢沒 select `id`，標記段卻用 `t.id` 組主鍵清單，
 * 線上恆為空陣列而 update 從未執行，測試卻一路綠燈。
 *
 * 需要驗證「查詢欄位與後續使用是否對得上」時用這支。
 */
export function createSelectAwareChainMock(
  rows: Record<string, unknown>[] | null,
  error: unknown = null,
): Record<string, ReturnType<typeof vi.fn>> {
  let selectedCols: string[] | null = null;

  const project = (): Record<string, unknown>[] | null => {
    if (!rows) return null;
    if (!selectedCols) return rows;
    return rows.map((r) => {
      const out: Record<string, unknown> = {};
      for (const c of selectedCols as string[]) if (c in r) out[c] = r[c];
      return out;
    });
  };

  const chain: Record<string, unknown> = {};
  const methods = [
    "insert", "update", "delete", "upsert",
    "eq", "neq", "gt", "lt", "gte", "lte",
    "is", "in", "or", "not", "filter",
    "order", "limit", "range",
  ];
  for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain);

  chain.select = vi.fn().mockImplementation((cols?: string) => {
    if (typeof cols === "string" && cols.trim() !== "*") {
      selectedCols = cols.split(",").map((s) => s.trim());
    }
    return chain;
  });

  chain.single = vi.fn().mockImplementation(async () => {
    const d = project();
    return { data: Array.isArray(d) ? d[0] ?? null : d, error };
  });
  chain.maybeSingle = chain.single;

  (chain as Record<string, unknown>).then = (
    resolve: (v: ChainResult) => void,
    reject?: (e: unknown) => void,
  ) => {
    const data = project();
    return Promise.resolve({
      data,
      error,
      count: Array.isArray(data) ? data.length : 0,
    }).then(resolve, reject);
  };

  /** 測試用：讀回這次查詢實際 select 了哪些欄位 */
  chain._selectedCols = () => selectedCols;

  return chain as Record<string, ReturnType<typeof vi.fn>>;
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
