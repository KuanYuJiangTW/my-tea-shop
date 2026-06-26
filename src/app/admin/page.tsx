import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import { validateAdminSession } from "@/lib/admin-token";

export default async function AdminLoginPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;

  if (session && (await validateAdminSession(session))) {
    redirect("/admin/dashboard");
  }

  return <LoginForm />;
}
