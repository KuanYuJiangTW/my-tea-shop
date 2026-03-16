"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ResultContent() {
  const params  = useSearchParams();
  const success = params.get("RtnCode") === "1";
  const tradeNo = params.get("MerchantTradeNo");
  const rtnMsg  = params.get("RtnMsg");

  return (
    <div className="min-h-screen bg-tea-cream-light flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {success ? (
          <>
            <div className="w-20 h-20 bg-tea-green-mist rounded-full flex items-center justify-center mx-auto mb-6">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
                stroke="#7D9B84" strokeWidth="2" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="font-serif text-3xl font-bold text-tea-text mb-3">付款成功！</h2>
            <p className="text-tea-text-light mb-2">感謝您的訂購，我們將盡快為您備貨。</p>
            {tradeNo && (
              <p className="text-xs text-tea-text-light mb-2">
                訂單編號：<span className="font-mono font-medium">{tradeNo}</span>
              </p>
            )}
            <p className="text-tea-text-light text-sm mb-10">確認信將寄至您的電子郵件，請耐心等候。</p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
                stroke="#f87171" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <h2 className="font-serif text-3xl font-bold text-tea-text mb-3">付款未完成</h2>
            <p className="text-tea-text-light mb-10">{rtnMsg || "付款流程未完成，請重新嘗試。"}</p>
          </>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/"
            className="bg-tea-green hover:bg-tea-green-dark text-white px-8 py-3.5 rounded-full font-medium transition-colors">
            回到首頁
          </Link>
          {!success && (
            <Link href="/cart"
              className="border border-tea-green text-tea-green hover:bg-tea-green hover:text-white px-8 py-3.5 rounded-full font-medium transition-colors">
              返回購物車
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResultClient() {
  return (
    <Suspense>
      <ResultContent />
    </Suspense>
  );
}
