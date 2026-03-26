import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import { computeAdminToken } from "@/lib/admin-token";

export default async function AdminLoginPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminPassword && session && session === computeAdminToken(adminPassword)) {
    redirect("/admin/dashboard");
  }

  return <LoginForm />;
}
