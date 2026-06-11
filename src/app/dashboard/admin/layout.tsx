import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin-secure");

  const { data: profile } = (await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()) as any;

  if (profile?.role !== "admin") redirect("/login");

  return (
    <AppShell role="admin" userName={profile?.full_name ?? user.email ?? "Admin"}>
      {children}
    </AppShell>
  );
}
