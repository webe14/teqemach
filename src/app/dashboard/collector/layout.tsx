import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/actions/auth";
import { AppShell } from "@/components/layout/AppShell";

export default async function CollectorLayout({ children }: { children: React.ReactNode }) {
  // Works for both Supabase-Auth users and custom-cookie users
  const profile = await getCurrentProfile() as any;

  if (!profile) {
    redirect("/login");
  }

  const isAuthorized = Boolean(profile.isAdmin || profile.role === "collector" || profile.role === "admin");
  if (!isAuthorized) {
    redirect("/dashboard/contributor");
  }

  return (
    <AppShell 
      role={profile.role === "admin" ? "admin" : "collector"} 
      userName={profile.full_name ?? profile.email ?? "Collector"} 
      userId={profile.id}
      isAdmin={Boolean(profile.isAdmin || profile.role === "admin")}
    >
      {children}
    </AppShell>
  );
}
