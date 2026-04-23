import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildKnowledgeBase } from "@/lib/chat-knowledge";

export const maxDuration = 30;

// 測試端點：GET /api/chat 檢查模組是否正常載入
export async function GET() {
  try {
    const hasKey = !!process.env.GEMINI_API_KEY;
    return NextResponse.json({ ok: true, hasGeminiKey: hasKey });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

// ── 速率限制（記憶體內，每分鐘 10 則/IP）──────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  // 清理已過期的項目（順便清理，不用 setInterval）
  if (rateLimitMap.size > 100) {
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

// ── System Prompt ─────────────────────────────────────────────────────────────

const LINE_URL = process.env.NEXT_PUBLIC_LINE_OFFICIAL_URL || "";

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
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const startTime = Date.now();

  // 速率限制
  if (!checkRateLimit(ip)) {
    console.log(`[chat] ${new Date().toISOString()} | ip=${ip} | status=429`);
    return NextResponse.json(
      { error: "目前訊息量較多，請稍後再試。" },
      { status: 429 }
    );
  }

  // 檢查 API Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[chat] GEMINI_API_KEY not configured");
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

    // 建立 Gemini client
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemPrompt,
    });

    // 組合對話歷史
    const history = recentMessages.slice(0, -1).map((m) => ({
      role: m.role === "user" ? "user" as const : "model" as const,
      parts: [{ text: m.content }],
    }));

    const lastMessage = recentMessages[recentMessages.length - 1].content;

    const chat = model.startChat({ history });
    const result = await chat.sendMessageStream(lastMessage);

    // 串流回應
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
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
