import InterestClient from "./InterestClient";

export default function AdminExperienceInterestPage() {
  return (
    <div className="p-6 md:p-8 min-h-screen bg-[#F9F6F1]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-tea-text font-serif">想來但沒訂到</h1>
        <p className="text-sm text-tea-text-light mt-0.5">
          翻完月曆卻沒有合適日期的人留下的聯絡方式。這不是預約，需要你主動聯絡。
        </p>
      </div>
      <InterestClient />
    </div>
  );
}
