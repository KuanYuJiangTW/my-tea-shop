import { supabase } from "@/lib/supabase";
import {
  calcRequestSlots,
  calcRequestTotal,
  canTransition,
  generateRequestToken,
} from "@/lib/experience-requests";
import { sendRequestApprovedEmail } from "@/lib/email";
import type { ExperienceRequestStatus } from "@/types";

/**
 * 核准開課請求的服務層。
 *
 * 抽出來是因為**三個入口共用同一條流程**：後台按核准、後台整組核准、以及
 * 客人自己選了替代方案。三份實作遲早會長歪，尤其是「衝突檢查」這種容易被
 * 漏掉的一步。
 */

/** 核准後專屬連結的有效期。與 design.md D1 的兩層期限一致 */
export const TOKEN_TTL_HOURS = 48;

export type ApproveFailure =
  | { ok: false; code: "not-found" }
  | { ok: false; code: "bad-status"; status: ExperienceRequestStatus }
  | { ok: false; code: "conflict"; session: { id: string; status: string; availableSpots: number } }
  | { ok: false; code: "db"; message: string };

export type ApproveResult =
  | { ok: true; sessionId: string; token: string; expiresAt: string; slots: number; total: number }
  | ApproveFailure;

interface RequestRow {
  id: string; request_no: string; status: ExperienceRequestStatus;
  experience_type_id: number; preferred_date: string; preferred_start_time: string;
  headcount: number; is_private: boolean; contact_name: string;
  contact_phone: string; contact_email: string; locale: string; token: string;
  experience_types: {
    name: string; price: number; max_participants: number;
    request_min_slots: number | null;
  } | null;
}

const REQUEST_FIELDS =
  "id, request_no, status, experience_type_id, preferred_date, preferred_start_time, " +
  "headcount, is_private, contact_name, contact_phone, contact_email, locale, token, " +
  "experience_types(name, price, max_participants, request_min_slots)";

/**
 * 核准一筆請求：建場次 → 發專屬連結 → 寄核准信。
 *
 * 場次先建成 `visibility = 'private'`——只有拿到連結的人看得到。這樣不必做
 * 名額保留（seat hold），也不會跟既有的 `current_participants` 計算打架
 * （design.md D4）。申請人付款後若非包場才轉 public 開放併團。
 *
 * `overrideDate` / `overrideTime` 供「客人選了替代方案」使用——那時要開的
 * 是替代的日期，不是他原本申請的那一天。
 */
export async function approveRequest(
  requestId: string,
  opts: { overrideDate?: string; overrideTime?: string; reviewedBy?: string } = {},
): Promise<ApproveResult> {
  const { data, error } = await supabase
    .from("experience_requests")
    .select(REQUEST_FIELDS)
    .eq("id", requestId)
    .single();

  if (error || !data) return { ok: false, code: "not-found" };
  const req = data as unknown as RequestRow;

  if (!canTransition(req.status, "approved")) {
    return { ok: false, code: "bad-status", status: req.status };
  }

  const date = opts.overrideDate ?? req.preferred_date;
  const time = opts.overrideTime ?? req.preferred_start_time;

  // 衝突檢查：這個時段已經有場次的話**不要再建一個**。
  // 讓 UNIQUE 約束丟錯誤是很糟的體驗，而且「請客人加入既有場次」本來就是
  // 更好的結果——那一場可能還有位子，併團對雙方都好。
  const { data: existing } = await supabase
    .from("experience_sessions")
    .select("id, status, current_participants")
    .eq("experience_type_id", req.experience_type_id)
    .eq("session_date", date)
    .eq("start_time", time)
    .maybeSingle();

  if (existing) {
    const max = req.experience_types?.max_participants ?? 20;
    return {
      ok: false,
      code: "conflict",
      session: {
        id: existing.id as string,
        status: existing.status as string,
        availableSpots: max - (existing.current_participants as number),
      },
    };
  }

  const { data: session, error: sessionError } = await supabase
    .from("experience_sessions")
    .insert({
      experience_type_id:      req.experience_type_id,
      session_date:            date,
      start_time:              time,
      status:                  "open",
      visibility:              "private",
      created_from_request_id: req.id,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return { ok: false, code: "db", message: sessionError?.message ?? "建立場次失敗" };
  }

  // 換一把新 token：核准前那把已經寄給客人做查詢用，核准後這把帶付款期限。
  // 沿用同一把會讓「查詢連結」與「付款連結」的有效期混在一起
  const token     = generateRequestToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 3600_000).toISOString();

  const { error: updateError } = await supabase
    .from("experience_requests")
    .update({
      status:           "approved",
      session_id:       session.id,
      token,
      token_expires_at: expiresAt,
      reviewed_at:      new Date().toISOString(),
      reviewed_by:      opts.reviewedBy ?? null,
    })
    .eq("id", req.id);

  if (updateError) {
    return { ok: false, code: "db", message: updateError.message };
  }

  const type = req.experience_types;
  const shape = {
    price:           type?.price ?? 0,
    maxParticipants: type?.max_participants ?? 20,
    requestMinSlots: type?.request_min_slots ?? null,
  };
  const slots = calcRequestSlots(shape, req.headcount);
  const total = calcRequestTotal(shape, slots, date);

  try {
    await sendRequestApprovedEmail({
      requestNo:          req.request_no,
      token,
      experienceName:     type?.name ?? "",
      preferredDate:      date,
      preferredStartTime: time,
      headcount:          req.headcount,
      slots,
      total,
      contactName:        req.contact_name,
      contactPhone:       req.contact_phone,
      contactEmail:       req.contact_email,
      locale:             req.locale,
      sessionDate:        date,
      sessionTime:        time,
      expiresAt:          expiresAt.slice(0, 16).replace("T", " "),
    });
  } catch (err) {
    // best-effort：信寄不出去不該讓已經建好的場次與核准狀態回滾，
    // 那會讓後台顯示「未核准」但資料庫已經有一個孤兒場次
    console.error("[request-review] sendRequestApprovedEmail failed:", err);
  }

  return { ok: true, sessionId: session.id as string, token, expiresAt, slots, total };
}

/**
 * 撤銷核准：回收沒有任何確認預約的場次，token 失效，狀態回 pending。
 *
 * 已經有 confirmed 預約時**不能撤**——那要走既有的場次取消與退款流程，
 * 不是把請求狀態改一改就算。
 */
export async function revokeApproval(requestId: string): Promise<
  { ok: true } | { ok: false; code: "not-found" | "bad-status" | "has-booking" | "db"; message?: string }
> {
  const { data, error } = await supabase
    .from("experience_requests")
    .select("id, status, session_id")
    .eq("id", requestId)
    .single();

  if (error || !data) return { ok: false, code: "not-found" };
  if (!canTransition(data.status as ExperienceRequestStatus, "pending")) {
    return { ok: false, code: "bad-status" };
  }

  if (data.session_id) {
    const { count } = await supabase
      .from("experience_bookings")
      .select("id", { count: "exact", head: true })
      .eq("session_id", data.session_id)
      .eq("status", "confirmed");

    if ((count ?? 0) > 0) return { ok: false, code: "has-booking" };

    await supabase.from("experience_sessions").delete().eq("id", data.session_id);
  }

  const { error: updateError } = await supabase
    .from("experience_requests")
    .update({ status: "pending", session_id: null, token_expires_at: null })
    .eq("id", requestId);

  if (updateError) return { ok: false, code: "db", message: updateError.message };
  return { ok: true };
}

/**
 * 付款完成後的收尾：請求轉 `converted`，非包場的場次轉 `public` 開放併團。
 *
 * **這支從綠界回調裡被呼叫，所以整支包在 try/catch 內、永遠不丟例外。**
 * 回調必須回 `1|OK` 給綠界，否則它會一直重送、客人的付款狀態會亂——
 * 開課請求的收尾再重要，也不能擋住金流的主線。失敗只留 log，後台仍可手動處理。
 *
 * 沒有對應的 approved 請求時直接跳過（一般預約走的就是這條路）。
 */
export async function convertRequestOnPayment(sessionId: string | null | undefined, bookingId: string) {
  if (!sessionId) return;
  try {
    const { data: request } = await supabase
      .from("experience_requests")
      .select("id, is_private, status")
      .eq("session_id", sessionId)
      .eq("status", "approved")
      .maybeSingle();

    if (!request) return;   // 一般預約，不是來自開課請求

    await supabase
      .from("experience_requests")
      .update({ status: "converted", booking_id: bookingId })
      .eq("id", request.id);

    if (!request.is_private) {
      await supabase
        .from("experience_sessions")
        .update({ visibility: "public" })
        .eq("id", sessionId);
    }
  } catch (err) {
    console.error("[request-review] convertRequestOnPayment failed:", err);
  }
}

/**
 * 整組核准：同一體驗、同一日期、同一時段的多筆請求**只建一個場次**，
 * 但每一筆各自拿到自己的 token 與核准信。
 *
 * 這是這個功能最直接的獲利點——三筆各 2、3、2 人的請求擠在同一天，散著看
 * 是三筆待審，聚起來是一場滿團。若讓業主一筆一筆按，第二筆就會撞上衝突
 * 檢查，然後他得自己想辦法把人湊到同一場。
 *
 * 第一筆走完整的 approveRequest（含衝突檢查與建場次），其餘幾筆直接掛到
 * 同一個 session_id。
 */
export async function approveGroup(requestIds: string[]): Promise<{
  ok: boolean; sessionId?: string; approved: number; failed: { id: string; code: string }[];
}> {
  if (requestIds.length === 0) return { ok: false, approved: 0, failed: [] };

  const first = await approveRequest(requestIds[0]);
  if (!first.ok) {
    return { ok: false, approved: 0, failed: [{ id: requestIds[0], code: first.code }] };
  }

  const failed: { id: string; code: string }[] = [];
  let approved = 1;

  for (const id of requestIds.slice(1)) {
    const { data } = await supabase
      .from("experience_requests")
      .select(REQUEST_FIELDS)
      .eq("id", id)
      .single();

    const req = data as unknown as RequestRow | null;
    if (!req) { failed.push({ id, code: "not-found" }); continue; }
    if (!canTransition(req.status, "approved")) { failed.push({ id, code: "bad-status" }); continue; }

    const token     = generateRequestToken();
    const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 3600_000).toISOString();

    const { error } = await supabase
      .from("experience_requests")
      .update({
        status:           "approved",
        session_id:       first.sessionId,
        token,
        token_expires_at: expiresAt,
        reviewed_at:      new Date().toISOString(),
      })
      .eq("id", id);

    if (error) { failed.push({ id, code: "db" }); continue; }
    approved += 1;

    const type  = req.experience_types;
    const shape = {
      price:           type?.price ?? 0,
      maxParticipants: type?.max_participants ?? 20,
      requestMinSlots: type?.request_min_slots ?? null,
    };
    // 併團時每一筆只付自己的人數，不必各自扛最低名額——最低名額是「開一場」
    // 的門檻，這一場已經因為第一筆而開成了
    const slots = Math.min(req.headcount, shape.maxParticipants);
    const total = calcRequestTotal(shape, slots, req.preferred_date);

    try {
      await sendRequestApprovedEmail({
        requestNo: req.request_no, token,
        experienceName: type?.name ?? "",
        preferredDate: req.preferred_date, preferredStartTime: req.preferred_start_time,
        headcount: req.headcount, slots, total,
        contactName: req.contact_name, contactPhone: req.contact_phone,
        contactEmail: req.contact_email, locale: req.locale,
        sessionDate: req.preferred_date, sessionTime: req.preferred_start_time,
        expiresAt: expiresAt.slice(0, 16).replace("T", " "),
      });
    } catch (err) {
      console.error("[request-review] group approve email failed:", err);
    }
  }

  return { ok: true, sessionId: first.sessionId, approved, failed };
}
