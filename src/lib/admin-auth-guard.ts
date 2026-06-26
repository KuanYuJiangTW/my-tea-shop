import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { validateAdminSession } from "./admin-token";
import { getClientIp } from "./rate-limit";
import { supabase } from "./supabase";

type RouteHandler = (req: NextRequest, ctx?: unknown) => Promise<Response>;

export function withAdminAuth(handler: RouteHandler, action?: string): RouteHandler {
  return async (req: NextRequest, ctx?: unknown): Promise<Response> => {
    const cookieStore = await cookies();
    const session = cookieStore.get("admin_session")?.value;

    if (!session || !(await validateAdminSession(session))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const res = await handler(req, ctx);

    // 非同步寫入審計日誌（不阻塞回應，僅記錄寫入操作）
    if (action && res.ok) {
      const ip = getClientIp(req);
      // 從 URL 路徑末段提取 resource_id（數字 ID 或 UUID）
      const pathParts = req.nextUrl.pathname.split("/");
      const lastPart = pathParts[pathParts.length - 1];
      const resourceId =
        /^\d+$/.test(lastPart) || /^[0-9a-f-]{36}$/i.test(lastPart)
          ? lastPart
          : undefined;

      supabase
        .from("admin_audit_logs")
        .insert({ action, resource_id: resourceId ?? null, ip })
        .then(({ error }) => {
          if (error) console.error("[audit] 寫入失敗:", error.message);
        });
    }

    return res;
  };
}
