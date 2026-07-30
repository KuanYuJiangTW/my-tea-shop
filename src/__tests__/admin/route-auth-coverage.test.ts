import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative, sep } from "path";

// 靜態掃描：確保 /api/admin/** 每個 route handler 都由 withAdminAuth 包裹。
//
// 背景：授權原本只靠 src/proxy.ts 的 middleware 攔截，middleware 一旦被繞過
// （Next.js 有多筆此類 CVE），沒有內層檢查的路由就直接裸奔。這條測試讓「忘了包」
// 在 CI 就爆，而不是等下一次資安稽核。

const ADMIN_API_DIR = join(process.cwd(), "src", "app", "api", "admin");

// 登入流程本身必須公開——此時使用者尚未持有 admin_session。
// 這兩支各自有防護：密碼驗證＋限流、TOTP 驗證＋簽章 pending token＋限流。
const PUBLIC_BY_DESIGN = [
  join("auth", "route.ts"),
  join("auth", "2fa", "route.ts"),
];

function collectRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectRouteFiles(full));
    else if (entry === "route.ts") out.push(full);
  }
  return out;
}

const HTTP_METHODS = ["GET", "POST", "PATCH", "PUT", "DELETE", "HEAD", "OPTIONS"];

describe("/api/admin/** 授權覆蓋率", () => {
  const files = collectRouteFiles(ADMIN_API_DIR);

  it("掃描到的 route 檔案數量合理（防呆：路徑寫錯會掃到 0 個而假性通過）", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  for (const file of files) {
    const rel = relative(ADMIN_API_DIR, file);
    if (PUBLIC_BY_DESIGN.includes(rel)) continue;

    it(`${rel.split(sep).join("/")} 的所有 handler 都經過 withAdminAuth`, () => {
      const src = readFileSync(file, "utf8");

      const unwrapped = HTTP_METHODS.filter((m) => {
        // 裸 handler：export async function GET(...) / export function GET(...)
        const bare = new RegExp(`export\\s+(async\\s+)?function\\s+${m}\\s*\\(`);
        // 已包裹：export const GET = withAdminAuth(...)
        const wrapped = new RegExp(`export\\s+const\\s+${m}\\s*=\\s*withAdminAuth\\s*\\(`);
        return bare.test(src) || (new RegExp(`export\\s+const\\s+${m}\\s*=`).test(src) && !wrapped.test(src));
      });

      expect(unwrapped, `未受保護的 handler：${unwrapped.join(", ")}`).toEqual([]);
    });
  }

  it("PUBLIC_BY_DESIGN 名單裡的檔案確實存在（防止名單腐爛成免死金牌）", () => {
    for (const rel of PUBLIC_BY_DESIGN) {
      expect(files.some((f) => relative(ADMIN_API_DIR, f) === rel), `${rel} 不存在`).toBe(true);
    }
  });
});
