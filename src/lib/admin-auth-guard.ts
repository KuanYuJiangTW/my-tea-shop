import { timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { computeAdminToken } from "./admin-token";

type RouteHandler = (req: NextRequest, ctx?: unknown) => Promise<Response>;

export function withAdminAuth(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, ctx?: unknown): Promise<Response> => {
    const cookieStore = await cookies();
    const session = cookieStore.get("admin_session")?.value;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!session || !adminPassword) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const expected = computeAdminToken(adminPassword);
    let isValid = false;
    try {
      isValid =
        session.length === expected.length &&
        timingSafeEqual(Buffer.from(session), Buffer.from(expected));
    } catch {
      isValid = false;
    }

    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return handler(req, ctx);
  };
}
