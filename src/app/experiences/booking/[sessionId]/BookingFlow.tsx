"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Clock, Calendar, ChevronRight, AlertCircle } from "lucide-react";
import { ExperienceSession, ExperienceType } from "@/types";
import { ExperienceContent } from "@/lib/experiences";

interface Props {
  session:    ExperienceSession & { experienceType: ExperienceType };
  userEmail:  string | null;
  content?:   ExperienceContent | null;
}

type Step = 1 | 2;

const REFUND_POLICY = [
  { label: "活動前 7 天以上", value: "全額退款",  color: "text-tea-green" },
  { label: "活動前 3–6 天",   value: "退款 50%",  color: "text-amber-600" },
  { label: "活動前 1–2 天",   value: "退款 20%",  color: "text-amber-600" },
  { label: "24 小時內",        value: "不退款",    color: "text-red-500" },
];

export default function BookingFlow({ session, userEmail }: Props) {
  const router = useRouter();
  const exp    = session.experienceType;

  const available = exp.maxParticipants - session.currentParticipants;
  const isFull    = available <= 0;

  const [step, setStep]           = useState<Step>(1);
  const [count, setCount]         = useState(Math.max(exp.minParticipants, 1));
  const [adultConfirmed, setAdult]= useState(false);
  const [name,  setName]          = useState("");
  const [phone, setPhone]         = useState("");
  const [diet,  setDiet]          = useState("");
  const [agreed, setAgreed]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error,  setError]        = useState("");

  // 候補模式
  const [waitlistCount, setWaitlistCount] = useState(1);
  const [waitlistDone, setWaitlistDone]   = useState(false);

  const totalPrice = exp.price * count;
  const dateLabel  = new Date(session.sessionDate + "T00:00:00").toLocaleDateString("zh-TW", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });

  const handleJoinWaitlist = async () => {
    if (!name.trim())  return setError("請填寫姓名");
    if (!phone.trim()) return setError("請填寫手機號碼");
    if (exp.requiresAdult && !adultConfirmed) return setError("請確認所有參加者均已年滿 18 歲");

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/waitlist", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId:        session.id,
          participantCount: waitlistCount,
          bookerName:       name.trim(),
          bookerPhone:      phone.trim(),
          dietaryNotes:     diet.trim() || undefined,
          adultConfirmed,
        }),
      });

      if (res.status === 401) {
        router.push(`/auth/login?redirect=/experiences/booking/${session.id}`);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "加入候補失敗，請稍後再試");
        return;
      }

      setWaitlistDone(true);
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim())  return setError("請填寫姓名");
    if (!phone.trim()) return setError("請填寫手機號碼");
    if (!agreed)       return setError("請同意退款政策");
    if (exp.requiresAdult && !adultConfirmed) return setError("請確認所有參加者均已年滿 18 歲");

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/bookings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId:        session.id,
          participantCount: count,
          bookerName:       name.trim(),
          bookerPhone:      phone.trim(),
          dietaryNotes:     diet.trim() || undefined,
          adultConfirmed,
        }),
      });

      if (res.status === 401) {
        router.push(`/auth/login?redirect=/experiences/booking/${session.id}`);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "預約失敗，請稍後再試");
        return;
      }

      // 導向 ECPay 付款（複用現有金流）
      const payRes = await fetch("/api/ecpay/experience-checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: data.bookingId }),
      });
      const payData = await payRes.json();

      if (!payRes.ok) {
        setError(payData.error ?? "無法建立付款，請稍後再試");
        return;
      }

      // 建立隱藏表單送出到 ECPay
      const form = document.createElement("form");
      form.method = "POST";
      form.action = payData.ecpayUrl;
      Object.entries(payData.params as Record<string, string>).forEach(([k, v]) => {
        const input = document.createElement("input");
        input.type  = "hidden";
        input.name  = k;
        input.value = v;
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* 場次摘要 */}
      <div className="bg-white rounded-2xl p-6 border border-tea-green-pale/50 shadow-sm mb-6">
        <p className="text-tea-green text-xs tracking-widest uppercase mb-1">{exp.nameEn}</p>
        <h2 className="font-serif text-2xl font-bold text-tea-text mb-4">{exp.name}</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-2 text-tea-text-light">
            <Calendar className="w-4 h-4 text-tea-green mt-0.5 shrink-0" />
            <div>
              <div className="text-xs mb-0.5">日期</div>
              <div className="font-medium text-tea-text">{dateLabel}</div>
            </div>
          </div>
          <div className="flex items-start gap-2 text-tea-text-light">
            <Clock className="w-4 h-4 text-tea-green mt-0.5 shrink-0" />
            <div>
              <div className="text-xs mb-0.5">時間</div>
              <div className="font-medium text-tea-text">{session.startTime.slice(0, 5)}</div>
            </div>
          </div>
          <div className="flex items-start gap-2 text-tea-text-light">
            <Users className="w-4 h-4 text-tea-green mt-0.5 shrink-0" />
            <div>
              <div className="text-xs mb-0.5">剩餘名額</div>
              <div className="font-medium text-tea-text">{available} / {exp.maxParticipants}</div>
            </div>
          </div>
        </div>
        {session.currentParticipants < exp.minParticipants && (
          <div className="mt-4 flex items-center gap-2 bg-amber-50 rounded-xl p-3 text-xs text-amber-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            目前 {session.currentParticipants} 人，需滿 {exp.minParticipants} 人才開課。人數不足時活動前 3 天通知取消並全額退款。
          </div>
        )}
      </div>

      {/* 額滿：候補模式 */}
      {isFull && !waitlistDone && (
        <div className="bg-white rounded-2xl p-6 border border-tea-green-pale/50 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-amber-600 bg-amber-50 rounded-xl p-3 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            此場次已額滿，您可以加入候補候位。有人取消時我們會第一時間 Email 通知您。
          </div>
          <h3 className="font-serif text-lg font-bold text-tea-text mb-5">加入候補</h3>

          {/* 候補人數 */}
          <div className="flex items-center gap-6 mb-5">
            <button onClick={() => setWaitlistCount(c => Math.max(1, c - 1))} disabled={waitlistCount <= 1}
              className="w-10 h-10 rounded-full border-2 border-tea-green text-tea-green font-bold text-xl hover:bg-tea-green hover:text-white transition-colors disabled:opacity-30">−</button>
            <span className="text-3xl font-bold text-tea-text w-8 text-center">{waitlistCount}</span>
            <button onClick={() => setWaitlistCount(c => Math.min(exp.maxParticipants, c + 1))} disabled={waitlistCount >= exp.maxParticipants}
              className="w-10 h-10 rounded-full border-2 border-tea-green text-tea-green font-bold text-xl hover:bg-tea-green hover:text-white transition-colors disabled:opacity-30">+</button>
            <span className="text-sm text-tea-text-light">人</span>
          </div>

          {/* 姓名電話 */}
          <div className="space-y-4 mb-5">
            <div>
              <label className="block text-sm font-medium text-tea-text mb-1.5">姓名 <span className="text-red-500">*</span></label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="請輸入真實姓名"
                className="w-full border border-tea-green-pale rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tea-green/30 focus:border-tea-green" />
            </div>
            <div>
              <label className="block text-sm font-medium text-tea-text mb-1.5">手機號碼 <span className="text-red-500">*</span></label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="09XX-XXX-XXX"
                className="w-full border border-tea-green-pale rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tea-green/30 focus:border-tea-green" />
            </div>
            {exp.requiresAdult && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={adultConfirmed} onChange={e => setAdult(e.target.checked)} className="mt-0.5 accent-tea-green w-4 h-4 shrink-0" />
                <span className="text-sm text-tea-text-light">我確認所有參加者均已年滿 <strong className="text-tea-text">18 歲</strong></span>
              </label>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm mb-4 bg-red-50 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
          <button onClick={handleJoinWaitlist} disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3.5 rounded-full font-medium transition-colors disabled:opacity-50">
            {loading ? "處理中…" : "加入候補"}
          </button>
        </div>
      )}

      {/* 候補成功 */}
      {isFull && waitlistDone && (
        <div className="bg-white rounded-2xl p-8 border border-tea-green-pale/50 shadow-sm text-center">
          <div className="text-4xl mb-4">🎋</div>
          <h3 className="font-serif text-xl font-bold text-tea-text mb-2">已加入候補！</h3>
          <p className="text-sm text-tea-text-light mb-6">有名額釋出時，我們會立即寄 Email 通知您，請於 24 小時內確認。</p>
          <button onClick={() => router.push("/account?tab=bookings")} className="text-sm text-tea-green hover:underline">查看我的候補記錄</button>
        </div>
      )}

      {/* Step 1：選人數 */}
      {!isFull && step === 1 && (
        <div className="bg-white rounded-2xl p-6 border border-tea-green-pale/50 shadow-sm">
          <h3 className="font-serif text-lg font-bold text-tea-text mb-6">選擇參加人數</h3>

          {/* 人數選擇器 */}
          <div className="flex items-center gap-6 mb-6">
            <button
              onClick={() => setCount(c => Math.max(1, c - 1))}
              className="w-10 h-10 rounded-full border-2 border-tea-green text-tea-green font-bold text-xl hover:bg-tea-green hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={count <= 1}
            >
              −
            </button>
            <span className="text-3xl font-bold text-tea-text w-8 text-center">{count}</span>
            <button
              onClick={() => setCount(c => Math.min(available, c + 1))}
              className="w-10 h-10 rounded-full border-2 border-tea-green text-tea-green font-bold text-xl hover:bg-tea-green hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={count >= available}
            >
              +
            </button>
            <span className="text-sm text-tea-text-light">人</span>
          </div>

          {/* 費用試算 */}
          <div className="bg-tea-green-mist rounded-xl p-4 mb-6">
            <div className="flex justify-between text-sm text-tea-text-light mb-1">
              <span>NT$ {exp.price.toLocaleString()} × {count} 人</span>
              <span>NT$ {totalPrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-tea-text text-lg">
              <span>總金額</span>
              <span>NT$ {totalPrice.toLocaleString()}</span>
            </div>
          </div>

          {/* 18+ 確認（茶果酒） */}
          {exp.requiresAdult && (
            <label className="flex items-start gap-3 mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={adultConfirmed}
                onChange={e => setAdult(e.target.checked)}
                className="mt-0.5 accent-tea-green w-4 h-4 shrink-0"
              />
              <span className="text-sm text-tea-text-light">
                我確認所有參加者均已年滿 <strong className="text-tea-text">18 歲</strong>（本體驗含酒精）
              </span>
            </label>
          )}

          {/* 退款政策摘要 */}
          <div className="border-t border-tea-green-pale pt-5 mb-6">
            <h4 className="text-sm font-medium text-tea-text mb-3">取消退款政策</h4>
            <div className="space-y-1.5">
              {REFUND_POLICY.map(p => (
                <div key={p.label} className="flex justify-between text-xs text-tea-text-light">
                  <span>{p.label}</span>
                  <span className={`font-medium ${p.color}`}>{p.value}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-tea-text-light/70 mt-2">
              如需改期請聯絡客服，由我們協助處理。
            </p>
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={exp.requiresAdult && !adultConfirmed}
            className="w-full bg-tea-green hover:bg-tea-green-dark text-white py-3.5 rounded-full font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            填寫訂購資料
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 2：訂購人資料 */}
      {!isFull && step === 2 && (
        <div className="bg-white rounded-2xl p-6 border border-tea-green-pale/50 shadow-sm">
          <button
            onClick={() => setStep(1)}
            className="text-sm text-tea-text-light hover:text-tea-green mb-5 flex items-center gap-1"
          >
            ← 返回
          </button>
          <h3 className="font-serif text-lg font-bold text-tea-text mb-6">訂購人資料</h3>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-tea-text mb-1.5">
                姓名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="請輸入真實姓名"
                className="w-full border border-tea-green-pale rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tea-green/30 focus:border-tea-green"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-tea-text mb-1.5">
                手機號碼 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="09XX-XXX-XXX"
                className="w-full border border-tea-green-pale rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tea-green/30 focus:border-tea-green"
              />
            </div>

            {userEmail && (
              <div>
                <label className="block text-sm font-medium text-tea-text mb-1.5">Email</label>
                <input
                  type="email"
                  value={userEmail}
                  disabled
                  className="w-full border border-tea-green-pale rounded-xl px-4 py-2.5 text-sm bg-tea-green-mist text-tea-text-light"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-tea-text mb-1.5">
                特殊需求（選填）
              </label>
              <div className="flex gap-4 mb-2">
                {["素食", "對茶類過敏"].map(opt => (
                  <label key={opt} className="flex items-center gap-1.5 text-sm text-tea-text-light cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-tea-green"
                      checked={diet.includes(opt)}
                      onChange={e => {
                        if (e.target.checked) setDiet(d => d ? `${d}、${opt}` : opt);
                        else setDiet(d => d.replace(`、${opt}`, "").replace(opt, "").replace(/^、|、$/, ""));
                      }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
              <input
                type="text"
                value={diet}
                onChange={e => setDiet(e.target.value)}
                placeholder="其他需求請直接輸入"
                className="w-full border border-tea-green-pale rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tea-green/30 focus:border-tea-green"
              />
            </div>
          </div>

          {/* 同意退款政策 */}
          <label className="flex items-start gap-3 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 accent-tea-green w-4 h-4 shrink-0"
            />
            <span className="text-sm text-tea-text-light">
              我已閱讀並同意上述<strong className="text-tea-text">取消退款政策</strong>
            </span>
          </label>

          {/* 費用確認 */}
          <div className="bg-tea-green-mist rounded-xl p-4 mb-5 flex justify-between items-center">
            <span className="text-sm text-tea-text-light">{exp.name} × {count} 人</span>
            <span className="font-bold text-tea-text text-lg">NT$ {totalPrice.toLocaleString()}</span>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm mb-4 bg-red-50 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-tea-green hover:bg-tea-green-dark text-white py-3.5 rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "處理中…" : `前往付款 NT$ ${totalPrice.toLocaleString()}`}
          </button>

          <p className="text-center text-xs text-tea-text-light mt-3">
            付款後需填寫參加者詳細資料（含身分證、緊急聯絡人）
          </p>
        </div>
      )}
    </div>
  );
}
