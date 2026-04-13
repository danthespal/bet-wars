import { redirect } from "next/navigation";
import { AuthForm } from "@/features/auth/ui/AuthForm";
import { getServerSession } from "@/features/auth/server/session";

export default async function RegisterPage() {
  const session = await getServerSession();

  if (session) {
    redirect(session.role === "admin" ? "/admin" : "/play");
  }

  return <AuthForm mode="register" />;
}
