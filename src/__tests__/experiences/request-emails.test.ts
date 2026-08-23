import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * 開課請求的五封信。
 *
 * 測的不是版型好不好看，是**內容有沒有把該講的講到**：
 *   - 確認信要有查詢編號與應付金額（成交條件不能等到要付款才第一次出現）
 *   - 核准信要有連結與期限（那封信的唯一任務就是讓他去付款）
 *   - 婉拒信一定要附可預約場次（不讓人空手離開）
 *   - digest **無項目時不寄**（每天一封「今天沒事」，兩週後就沒人看了）
 *   - locale 決定語言
 */

const sent: { to: string; subject: string; html: string }[] = [];

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: async (m: { to: string; subject: string; html: string }) => { sent.push(m); } };
  },
}));

const base = {
  requestNo: "R2608-7K3Q",
  token: "tok-abc",
  experienceName: "茶藝體驗",
  preferredDate: "2026-09-20",
  preferredStartTime: "14:00",
  headcount: 3,
  slots: 4,
  total: 3200,
  contactName: "小江",
  contactPhone: "0972619391",
  contactEmail: "guest@example.com",
  locale: "zh",
};

beforeEach(() => { sent.length = 0; });

describe("申請確認信", () => {
  it("含查詢編號、應付金額，並講明「這是申請不是預約」", async () => {
    const { sendRequestReceivedEmail } = await import("@/lib/email");
    await sendRequestReceivedEmail(base);
    const m = sent[0];
    expect(m.to).toBe("guest@example.com");
    expect(m.subject).toContain("R2608-7K3Q");
    expect(m.html).toContain("3,200");
    expect(m.html).toContain("不是預約");
    expect(m.html).toContain("兩個工作天");
    // 買斷名額制要在這裡就說清楚，不要等客訴才解釋
    expect(m.html).toContain("名額");
  });

  it("locale=en 時整封是英文", async () => {
    const { sendRequestReceivedEmail } = await import("@/lib/email");
    await sendRequestReceivedEmail({ ...base, locale: "en" });
    expect(sent[0].subject).toContain("Request received");
    expect(sent[0].html).toContain("two business days");
  });

  it("自助查詢連結帶 token，英文版走 /en", async () => {
    const { sendRequestReceivedEmail } = await import("@/lib/email");
    await sendRequestReceivedEmail(base);
    expect(sent[0].html).toContain("/experiences/request/tok-abc");
    sent.length = 0;
    await sendRequestReceivedEmail({ ...base, locale: "en" });
    expect(sent[0].html).toContain("/en/experiences/request/tok-abc");
  });
});

describe("核准信", () => {
  const approved = { ...base, sessionDate: "2026-09-20", sessionTime: "14:00", expiresAt: "2026-09-01 18:00" };

  it("有付款按鈕、期限與金額", async () => {
    const { sendRequestApprovedEmail } = await import("@/lib/email");
    await sendRequestApprovedEmail(approved);
    const m = sent[0];
    expect(m.html).toContain("/experiences/request/tok-abc");
    expect(m.html).toContain("2026-09-01 18:00");
    expect(m.html).toContain("3,200");
    expect(m.html).toContain("前往完成預約");
  });

  it("講清楚逾期會釋出——期限不是刁難", async () => {
    const { sendRequestApprovedEmail } = await import("@/lib/email");
    await sendRequestApprovedEmail(approved);
    expect(sent[0].html).toContain("釋出");
  });
});

describe("替代方案信", () => {
  it("每個選項都是可點的連結，不必回信打字", async () => {
    const { sendRequestAlternativeEmail } = await import("@/lib/email");
    await sendRequestAlternativeEmail({
      ...base,
      alternatives: [
        { id: "a1", date: "2026-09-21", time: "14:00", isExistingSession: false },
        { id: "a2", date: "2026-09-28", time: "10:00", isExistingSession: true },
      ],
    });
    const html = sent[0].html;
    expect(html).toContain("choose=a1");
    expect(html).toContain("choose=a2");
    expect(html).toContain("加入既有場次");
  });
});

describe("婉拒信", () => {
  it("有可預約場次時一定列出來——不讓人空手離開", async () => {
    const { sendRequestDeclinedEmail } = await import("@/lib/email");
    await sendRequestDeclinedEmail({
      ...base,
      reason: "那天已經排了其他行程",
      upcoming: [
        { date: "2026-09-26", time: "14:00", slug: "tea-ceremony" },
        { date: "2026-10-03", time: "14:00", slug: "tea-ceremony" },
      ],
    });
    const html = sent[0].html;
    expect(html).toContain("那天已經排了其他行程");
    expect(html).toContain("2026-09-26");
    expect(html).toContain("/experiences/tea-ceremony");
  });

  it("沒有場次時改邀請另約，不是只說抱歉", async () => {
    const { sendRequestDeclinedEmail } = await import("@/lib/email");
    await sendRequestDeclinedEmail({ ...base, upcoming: [] });
    expect(sent[0].html).toContain("一起找別的時間");
  });
});

describe("業主待審彙整", () => {
  const item = {
    requestNo: "R2608-7K3Q", experienceName: "茶藝體驗",
    date: "2026-09-20", time: "14:00", headcount: 3, waitingHours: 30,
  };

  it("無項目時不寄——每天一封「今天沒事」，兩週後就沒人看了", async () => {
    const { sendAdminRequestDigest } = await import("@/lib/email");
    await sendAdminRequestDigest([]);
    expect(sent).toHaveLength(0);
  });

  it("有項目時列出筆數、等待時數，並提醒對客人的承諾", async () => {
    const { sendAdminRequestDigest } = await import("@/lib/email");
    await sendAdminRequestDigest([item, { ...item, requestNo: "R2608-ZZZZ", waitingHours: 60 }]);
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toContain("2 筆");
    expect(sent[0].html).toContain("已等 30 小時");
    expect(sent[0].html).toContain("已等 60 小時");
    expect(sent[0].html).toContain("兩個工作天內回覆");
  });
});

describe("HTML 逸出", () => {
  it("客人填的內容不會變成標籤", async () => {
    const { sendRequestReceivedEmail } = await import("@/lib/email");
    await sendRequestReceivedEmail({ ...base, requestNo: "<script>alert(1)</script>" });
    expect(sent[0].html).not.toContain("<script>alert(1)</script>");
    expect(sent[0].html).toContain("&lt;script&gt;");
  });
});
