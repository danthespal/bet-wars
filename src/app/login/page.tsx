import { redirect } from "next/navigation";
import { AuthForm } from "@/features/auth/ui/AuthForm";
import { getServerSession } from "@/features/auth/server/session";

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getServerSession();
  const { next } = await searchParams;

  if (session) {
    redirect(next && next.startsWith("/") ? next : session.role === "admin" ? "/admin" : "/play");
  }

  return <AuthForm mode="login" nextPath={next} />;
}
