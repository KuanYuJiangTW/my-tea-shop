import RequestsClient from "./RequestsClient";

export default function AdminExperienceRequestsPage() {
  return (
    <div className="p-6 md:p-8 min-h-screen bg-[#F9F6F1]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-tea-text font-serif">開課請求</h1>
        <p className="text-sm text-tea-text-light mt-0.5">
          客人指定日期申請開課。核准會自動建立場次並寄出 48 小時的專屬預約連結。
        </p>
      </div>
      <RequestsClient />
    </div>
  );
}
