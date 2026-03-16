import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";

export default async function AdminLoginPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminPassword && session === Buffer.from(adminPassword).toString("base64")) {
    redirect("/admin/dashboard");
  }

  return <LoginForm />;
}
