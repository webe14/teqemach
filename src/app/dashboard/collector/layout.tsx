import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/actions/auth";
import { AppShell } from "@/components/layout/AppShell";

export default async function CollectorLayout({ children }: { children: React.ReactNode }) {
  // Works for both Supabase-Auth users and custom-cookie users
  const profile = await getCurrentProfile() as any;

  if (!profile || profile.role !== "collector") redirect("/login");

  return (
    <AppShell role="collector" userName={profile.full_name ?? profile.email ?? "Collector"} userId={profile.id}>
      {children}
    </AppShell>
  );
}
