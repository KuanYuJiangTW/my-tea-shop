import AdminSidebar from "../AdminSidebar";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-tea-cream overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
