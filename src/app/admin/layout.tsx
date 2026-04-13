import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/features/auth/server/session";
import { AccountMenu } from "@/features/auth/ui/AccountMenu";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "admin") {
    redirect("/unauthorized");
  }

  return (
    <div>
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 text-sm text-slate-600">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-medium text-slate-900 hover:text-slate-700">
              Home
            </Link>
            <Link href="/play" className="hover:text-slate-900">
              Play
            </Link>
            <Link href="/admin/tools" className="hover:text-slate-900">
              Admin tools
            </Link>
          </div>
          <AccountMenu email={session.email} role={session.role} />
        </div>
      </nav>
      {children}
    </div>
  );
}
