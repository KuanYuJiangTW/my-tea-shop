import OrderingClient from "./OrderingClient";

export default function AdminExperienceOrderingPage() {
  return (
    <div className="p-6 md:p-8 min-h-screen bg-[#F9F6F1]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-tea-text font-serif">排序與季節</h1>
        <p className="text-sm text-tea-text-light mt-0.5">
          季節中的體驗會自動排到第一張，季節結束自動退回——你只要維護季節日期，排序自己會動
        </p>
      </div>
      <OrderingClient />
    </div>
  );
}
