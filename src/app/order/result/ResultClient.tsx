"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useAuth } from "@/context/AuthContext";

function ResultContent() {
  const params      = useSearchParams();
  const success     = params.get("RtnCode") === "1";
  const { user }    = useAuth();
  const tradeNo     = params.get("MerchantTradeNo");
  const rtnMsg      = params.get("RtnMsg");
  const isBooking   = tradeNo?.startsWith("B") ?? false;

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

            {isBooking ? (
              <>
                <h2 className="font-serif text-3xl font-bold text-tea-text mb-3">預約成功！</h2>
                <p className="text-tea-text-light mb-2">感謝您的預約，我們期待在茶園與您相見。</p>
                {tradeNo && (
                  <p className="text-xs text-tea-text-light mb-2">
                    預約編號：<span className="font-mono font-medium">{tradeNo}</span>
                  </p>
                )}
                {user?.email ? (
                  <p className="text-tea-text-light text-sm mb-4">確認信已寄至 {user.email}，請記得查收。</p>
                ) : (
                  <p className="text-sm text-amber-600 mb-4">
                    如需 Email 預約確認，請前往{" "}
                    <Link href="/account" className="underline font-medium">會員中心</Link>
                    {" "}綁定並驗證信箱。
                  </p>
                )}
                <div className="bg-[#F0F6F1] rounded-2xl px-6 py-4 text-left mb-10">
                  <p className="text-sm font-semibold text-tea-text mb-2">接下來請記得：</p>
                  <ul className="space-y-1.5 text-sm text-tea-text-light">
                    <li className="flex items-start gap-2">
                      <span className="text-tea-green mt-0.5">①</span>
                      查收確認信，內含預約詳情與補填連結
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-tea-green mt-0.5">②</span>
                      活動前 5 天內補填所有參加者的身分證、生日及緊急聯絡人
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-tea-green mt-0.5">③</span>
                      活動當天請於開始前 15 分鐘到達茶園
                    </li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                <h2 className="font-serif text-3xl font-bold text-tea-text mb-3">付款成功！</h2>
                <p className="text-tea-text-light mb-2">感謝您的訂購，我們將盡快為您備貨。</p>
                {tradeNo && (
                  <p className="text-xs text-tea-text-light mb-2">
                    訂單編號：<span className="font-mono font-medium">{tradeNo}</span>
                  </p>
                )}
                {user?.email ? (
                  <p className="text-tea-text-light text-sm mb-10">確認信將寄至 {user.email}，請耐心等候。</p>
                ) : (
                  <p className="text-sm text-amber-600 mb-10">
                    如需 Email 訂單通知，請前往{" "}
                    <Link href="/account" className="underline font-medium">會員中心</Link>
                    {" "}綁定並驗證信箱。
                  </p>
                )}
              </>
            )}
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
          {isBooking && success ? (
            <>
              <Link href="/account?tab=bookings"
                className="bg-tea-green hover:bg-tea-green-dark text-white px-8 py-3.5 rounded-full font-medium transition-colors">
                查看我的預約
              </Link>
              <Link href="/experiences"
                className="border border-tea-green text-tea-green hover:bg-tea-green hover:text-white px-8 py-3.5 rounded-full font-medium transition-colors">
                瀏覽更多體驗
              </Link>
            </>
          ) : (
            <>
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
            </>
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
