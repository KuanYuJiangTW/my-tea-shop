"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";

// ── 手機鍵盤高度偵測 ─────────────────────────────────────────────────────────

function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const onResize = () => {
      const diff = window.innerHeight - vv.height;
      setKeyboardHeight(diff > 50 ? diff : 0);
    };

    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  return keyboardHeight;
}

// ── 手機 FAB 顯示控制（滾過 hero 後常駐顯示）────────────────────────────────

function useMobileFabVisibility() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const threshold = window.innerHeight * 0.85;

    const onScroll = () => {
      setVisible(window.scrollY >= threshold);
    };

    if (window.scrollY >= threshold) setVisible(true);

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return visible;
}

// ── 響應式裝置偵測 ───────────────────────────────────────────────────────────

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "model";
  content: string;
  timestamp?: number;
}

const STORAGE_KEY = "wujuetea_chat";
const THROTTLE_MS = 2000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getQuickQuestionGroup(pathname: string): "home" | "products" | "experiences" {
  if (pathname.startsWith("/products") || pathname.startsWith("/en/products")) return "products";
  if (pathname.startsWith("/experiences") || pathname.startsWith("/en/experiences")) return "experiences";
  return "home";
}

function loadMessages(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMessages(messages: ChatMessage[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch { /* quota exceeded — ignore */ }
}

function formatTime(ts?: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

// ── LINE contact button renderer ──────────────────────────────────────────────

function renderMessageContent(text: string, lineLabel: string) {
  const parts = text.split(/\[LINE_CONTACT\]\((.*?)\)/);
  if (parts.length === 1) return <span className="whitespace-pre-wrap">{text}</span>;

  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (i % 2 === 1 && part) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-[#06C755] hover:bg-[#05b34d] text-white text-xs font-medium rounded-lg transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.070 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
              </svg>
              {lineLabel}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChatWidget() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("chat");

  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastSentAt, setLastSentAt] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [showLabel, setShowLabel] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const touchStartY = useRef(0);

  const keyboardHeight = useKeyboardHeight();
  const mobileFabVisible = useMobileFabVisibility();
  const isMobile = useIsMobile();

  // 隱藏在 admin 頁面
  if (pathname.startsWith("/admin")) return null;

  // ── 開啟 / 關閉動畫 ────────────────────────────────────────────────────────

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsVisible(true));
    });
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => setIsOpen(false), 200);
  }, []);

  // ── 清除對話 ───────────────────────────────────────────────────────────────

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleClearChat = useCallback(() => {
    if (window.confirm(t("clearConfirm"))) {
      setMessages([]);
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [t]);

  // ── 下滑關閉（手機）────────────────────────────────────────────────────────

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientY - touchStartY.current;
    if (diff > 80) handleClose();
  }, [handleClose]);

  // ── textarea 自動增高 ──────────────────────────────────────────────────────

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 80) + "px";
  }, []);

  // 初始化：從 sessionStorage 載入
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    setMessages(loadMessages());
    setInitialized(true);
  }, []);

  // 儲存到 sessionStorage
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (initialized) saveMessages(messages);
  }, [messages, initialized]);

  // 自動捲動到底
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // 開啟時 focus 輸入框（手機不自動 focus 避免鍵盤彈出）
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (isOpen && !isMobile) inputRef.current?.focus();
  }, [isOpen, isMobile]);

  // 手機開啟時鎖定背景滾動
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isOpen, isMobile]);

  // 浮動按鈕文字標籤 4 秒後收起
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!showLabel) return;
    const timer = setTimeout(() => setShowLabel(false), 4000);
    return () => clearTimeout(timer);
  }, [showLabel]);

  // 監聽從漢堡選單開啟聊天的事件
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const handler = () => handleOpen();
    window.addEventListener("open-chat-widget", handler);
    return () => window.removeEventListener("open-chat-widget", handler);
  }, [handleOpen]);

  // ── 送出訊息 ──────────────────────────────────────────────────────────────

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const now = Date.now();
    if (now - lastSentAt < THROTTLE_MS) return;
    setLastSentAt(now);

    const userMsg: ChatMessage = { role: "user", content: text.trim(), timestamp: now };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setIsStreaming(true);

    const aiMsg: ChatMessage = { role: "model", content: "", timestamp: Date.now() };

    try {
      abortRef.current = new AbortController();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          locale,
        }),
        signal: abortRef.current.signal,
      });

      if (res.status === 429) {
        aiMsg.content = t("errorRateLimit");
        setMessages([...newMessages, aiMsg]);
        setIsStreaming(false);
        return;
      }

      if (!res.ok || !res.body) {
        aiMsg.content = t("errorGeneral");
        setMessages([...newMessages, aiMsg]);
        setIsStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages([...newMessages, { ...aiMsg, content: accumulated }]);
      }

      aiMsg.content = accumulated;
      setMessages([...newMessages, aiMsg]);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        aiMsg.content = t("errorGeneral");
        setMessages([...newMessages, aiMsg]);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [isStreaming, lastSentAt, messages, locale, t]);

  // ── 快捷問題 ──────────────────────────────────────────────────────────────

  const group = getQuickQuestionGroup(pathname);
  const quickQuestions = [
    t(`quickQuestions.${group}.q1`),
    t(`quickQuestions.${group}.q2`),
    t(`quickQuestions.${group}.q3`),
  ];

  const isFirstOpen = messages.length === 0;

  // ── Keyboard ──────────────────────────────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* 浮動按鈕 */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className={`fixed right-4 z-50 bg-tea-green hover:bg-tea-green-dark text-white shadow-lg flex items-center gap-2 transition-all duration-300 hover:scale-105 bottom-20 md:bottom-6 ${
            showLabel ? "rounded-full px-4 py-2.5 md:px-5 md:py-3" : "rounded-full w-11 h-11 md:w-14 md:h-14 justify-center"
          } ${
            mobileFabVisible ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0 pointer-events-none"
          } md:!translate-y-0 md:!opacity-100 md:!pointer-events-auto`}
          aria-label={t("title")}
        >
          {/* 茶葉 + 對話氣泡組合圖示 */}
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none" className="flex-shrink-0 md:w-6 md:h-6">
            <path d="M22 10a2 2 0 01-2 2H8l-4 4V4a2 2 0 012-2h14a2 2 0 012 2z" fill="white" opacity="0.9"/>
            <path d="M17 8C17 8 13 12 13 17C13 19.76 15.24 22 18 22C20.76 22 23 19.76 23 17C23 12 19 8 19 8" fill="white" opacity="0.7" stroke="white" strokeWidth="0.5"/>
            <path d="M18 12C18 12 15.5 15 15.5 18C15.5 19.38 16.62 20.5 18 20.5C19.38 20.5 20.5 19.38 20.5 18C20.5 15 18 12 18 12Z" fill="rgba(125,155,132,0.4)"/>
          </svg>
          {showLabel && (
            <span className="text-sm font-medium whitespace-nowrap">{t("fabLabel")}</span>
          )}
        </button>
      )}

      {/* 對話視窗 */}
      {isOpen && (
        <div
          className={`fixed z-50 right-0 bottom-0 md:right-4 md:bottom-4 w-full md:w-[420px] h-[100dvh] md:h-[580px] bg-white md:rounded-2xl shadow-2xl border border-tea-green-pale flex flex-col overflow-hidden md:origin-bottom-right transition-all duration-200 ease-out ${
            isVisible
              ? "opacity-100 translate-y-0 md:scale-100"
              : "opacity-0 translate-y-full md:translate-y-4 md:scale-95"
          }`}
          style={isMobile && keyboardHeight > 0 ? { height: `calc(100dvh - ${keyboardHeight}px)` } : undefined}
        >
          {/* Drag handle — 手機版下滑關閉 */}
          <div
            className="md:hidden flex justify-center pt-2 pb-0 bg-tea-green cursor-grab active:cursor-grabbing"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="w-10 h-1 rounded-full bg-white/40" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-tea-green text-white rounded-t-none md:rounded-t-2xl flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <svg width="20" height="20" viewBox="0 0 34 34" fill="none">
                <path d="M17 4C17 4 8 11 8 20C8 24.97 12.03 29 17 29C21.97 29 26 24.97 26 20C26 11 17 4 17 4Z" fill="white" opacity="0.85"/>
                <path d="M17 9C17 9 12 15 12 20C12 22.76 14.24 25 17 25C19.76 25 22 22.76 22 20C22 15 17 9 17 9Z" fill="white" opacity="0.5"/>
              </svg>
              <div className="flex flex-col">
                <span className="font-medium text-sm leading-tight">{t("title")}</span>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-300" />
                  <span className="text-[10px] text-white/70 leading-tight">{t("statusOnline")}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              {/* 清除對話按鈕 */}
              {messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                  aria-label={t("clearChat")}
                  title={t("clearChat")}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 6h18" />
                    <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                  </svg>
                </button>
              )}
              {/* 關閉按鈕 */}
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                aria-label="Close chat"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-tea-cream-light/30">
            {/* 歡迎訊息 + 引導卡片 */}
            {isFirstOpen && (
              <>
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-tea-green-mist flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="14" height="14" viewBox="0 0 34 34" fill="none">
                      <path d="M17 4C17 4 8 11 8 20C8 24.97 12.03 29 17 29C21.97 29 26 24.97 26 20C26 11 17 4 17 4Z" fill="#7D9B84" opacity="0.85"/>
                    </svg>
                  </div>
                  <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-tl-md bg-white border border-tea-green-pale text-sm text-tea-text leading-relaxed">
                    <span className="whitespace-pre-wrap">{t("welcome")}</span>
                  </div>
                </div>
                {/* 引導卡片式快捷問題 */}
                <div className="flex flex-col gap-2 mt-2 px-1">
                  {quickQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="w-full text-left px-4 py-3 text-sm bg-white hover:bg-tea-green-mist text-tea-text rounded-xl border border-tea-green-pale transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* 對話紀錄 */}
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "model" && (
                  <div className="w-7 h-7 rounded-full bg-tea-green-mist flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="14" height="14" viewBox="0 0 34 34" fill="none">
                      <path d="M17 4C17 4 8 11 8 20C8 24.97 12.03 29 17 29C21.97 29 26 24.97 26 20C26 11 17 4 17 4Z" fill="#7D9B84" opacity="0.85"/>
                    </svg>
                  </div>
                )}
                <div className={`max-w-[80%] flex flex-col gap-0.5 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`px-3 py-2 md:px-3 md:py-2 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-tea-green text-white rounded-tr-md"
                        : "bg-white border border-tea-green-pale text-tea-text rounded-tl-md"
                    }`}
                  >
                    {msg.role === "model"
                      ? renderMessageContent(msg.content, t("contactLine"))
                      : <span className="whitespace-pre-wrap">{msg.content}</span>
                    }
                  </div>
                  {msg.timestamp && (
                    <span className="text-[10px] text-tea-text-light/40 px-1">
                      {formatTime(msg.timestamp)}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* 打字指示器 */}
            {isStreaming && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-tea-green-mist flex items-center justify-center flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 34 34" fill="none">
                    <path d="M17 4C17 4 8 11 8 20C8 24.97 12.03 29 17 29C21.97 29 26 24.97 26 20C26 11 17 4 17 4Z" fill="#7D9B84" opacity="0.85"/>
                  </svg>
                </div>
                <div className="px-3 py-2 rounded-2xl rounded-tl-md bg-white border border-tea-green-pale">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-tea-green/40 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 bg-tea-green/40 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-tea-green/40 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 快捷問題（對話進行中常駐） */}
          {!isStreaming && !isFirstOpen && (
            <div className="relative flex-shrink-0">
              <div className="px-3 py-1.5 flex gap-1.5 overflow-x-auto border-t border-tea-green-pale bg-white no-scrollbar">
                {quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="px-3 py-1.5 text-xs bg-tea-cream-light hover:bg-tea-green-mist text-tea-text rounded-full border border-tea-green-pale transition-colors whitespace-nowrap flex-shrink-0"
                  >
                    {q}
                  </button>
                ))}
              </div>
              {/* 右側漸層提示：暗示可橫向捲動 */}
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none" />
            </div>
          )}

          {/* 輸入區 */}
          <div className="px-3 py-2 border-t border-tea-green-pale bg-white flex-shrink-0" style={{ paddingBottom: isMobile && keyboardHeight === 0 ? "calc(0.5rem + env(safe-area-inset-bottom))" : undefined }}>
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={t("placeholder")}
                rows={1}
                className="flex-1 resize-none text-sm px-3 py-2 rounded-xl border border-tea-green-pale bg-tea-cream-light/50 focus:outline-none focus:ring-1 focus:ring-tea-green placeholder-tea-text-light/50 max-h-20"
                style={{ fontSize: "16px" }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={isStreaming || !input.trim()}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-tea-green hover:bg-tea-green-dark disabled:opacity-40 text-white transition-all active:scale-90 flex-shrink-0"
                aria-label={t("send")}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
