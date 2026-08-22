import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { buildKnowledgeBase } from "@/lib/chat-knowledge";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export const maxDuration = 30;

// 健康檢查端點
export async function GET() {
  return NextResponse.json({ ok: true, provider: "groq" });
}

// ── 速率限制（持久化）──────────────────────────────────────────────────────────
// 1) 每 IP 每分鐘 10 則；2) 全站每日總量上限，避免有心人輪換 IP 刷爆 Groq 額度。
const PER_IP_MAX = 10;
const PER_IP_WINDOW_MS = 60_000;
const DAILY_GLOBAL_MAX = Number(process.env.CHAT_DAILY_LIMIT ?? 1000);
const DAY_MS = 24 * 60 * 60 * 1000;

// ── System Prompt ─────────────────────────────────────────────────────────────

const LINE_URL = process.env.NEXT_PUBLIC_LINE_TEA_URL || "";

function buildSystemPrompt(knowledge: string, locale: string): string {
  if (locale === "en") {
    return `You are Wu Jue Tea's tea consultant assistant. You help customers with tea-related questions only.

Rules:
- ONLY answer based on the information provided below. Do NOT make up information.
- If you're not sure or the question is outside your scope, politely say you don't know and suggest contacting us via LINE.
- When suggesting LINE contact, always include this exact format: [LINE_CONTACT](${LINE_URL})
- Keep responses concise and friendly (under 200 words).
- You are a tea expert. Share brewing tips, flavor profiles, and pairing suggestions when relevant.
- Do NOT handle order inquiries, returns, refunds, or account issues.
- Always respond in English.

${knowledge}`;
  }

  return `你是霧抉茶的茶葉顧問小幫手，專門協助客人解答茶葉相關問題。

規則：
- 只根據以下提供的資料回答，不要編造資訊。
- 如果不確定或問題超出範圍，請禮貌地說不知道，並建議客人透過 LINE 聯繫我們。
- 當建議聯繫 LINE 時，務必使用此格式：[LINE_CONTACT](${LINE_URL})
- 回覆簡潔友善，控制在 200 字以內。
- 你是茶葉專家，可以分享泡茶技巧、風味描述、搭配建議。
- 不處理訂單查詢、退換貨、退款、帳號等問題。
- 一律使用繁體中文回覆。

${knowledge}`;
}

// ── POST /api/chat ────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const startTime = Date.now();

  // 每 IP 速率限制
  if (!(await rateLimit(`chat:${ip}`, PER_IP_MAX, PER_IP_WINDOW_MS))) {
    console.log(`[chat] ${new Date().toISOString()} | ip=${ip} | status=429`);
    return NextResponse.json(
      { error: "目前訊息量較多，請稍後再試。" },
      { status: 429 }
    );
  }

  // 全站每日總量上限（防止輪換 IP 刷爆 API 額度）
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD（UTC）
  if (!(await rateLimit(`chat:global:${today}`, DAILY_GLOBAL_MAX, DAY_MS))) {
    console.warn(`[chat] ${new Date().toISOString()} | 全站每日上限已達 ${DAILY_GLOBAL_MAX}`);
    return NextResponse.json(
      { error: "今日客服服務量已達上限，請改用 LINE 聯繫我們。" },
      { status: 429 }
    );
  }

  // 檢查 API Key
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("[chat] GROQ_API_KEY not configured");
    return NextResponse.json(
      { error: "服務暫時無法使用，請稍後再試。" },
      { status: 503 }
    );
  }

  // 解析請求
  let messages: ChatMessage[];
  let locale: string;
  try {
    const body = await req.json();
    messages = body.messages;
    locale = body.locale || "zh";

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages is required" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // 截取最近 10 則
  const recentMessages = messages.slice(-10);

  try {
    // 組合知識庫與 system prompt
    const knowledge = await buildKnowledgeBase(locale);
    const systemPrompt = buildSystemPrompt(knowledge, locale);

    // 建立 Groq client
    const groq = new Groq({ apiKey });

    // 組合對話歷史（Groq 用 OpenAI 格式：system / user / assistant）
    const groqMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...recentMessages.map((m) => ({
        role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
        content: m.content,
      })),
    ];

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: groqMessages,
      stream: true,
      max_tokens: 1024,
      temperature: 0.7,
    });

    // 串流回應
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of completion) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch (err) {
          console.error("[chat] Stream error:", err);
        } finally {
          controller.close();
          const duration = Date.now() - startTime;
          console.log(
            `[chat] ${new Date().toISOString()} | ip=${ip} | locale=${locale} | status=200 | duration=${duration}ms`
          );
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[chat] ${new Date().toISOString()} | ip=${ip} | locale=${locale} | status=503 | duration=${duration}ms | error=`, err);

    const errorMsg = locale === "en"
      ? "Sorry, the service is temporarily unavailable. Please try again later or contact us via LINE."
      : "抱歉，服務暫時無法使用，請稍後再試或透過 LINE 聯繫我們。";

    return NextResponse.json({ error: errorMsg }, { status: 503 });
  }
}
