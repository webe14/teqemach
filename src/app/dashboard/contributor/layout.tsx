import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/actions/auth";
import { AppShell } from "@/components/layout/AppShell";

export default async function ContributorLayout({ children }: { children: React.ReactNode }) {
  // Works for both Supabase-Auth users and custom-cookie users
  const profile = await getCurrentProfile() as any;

  if (!profile) redirect("/login");

  const isAdmin = Boolean(profile.isAdmin || profile.role === "admin" || profile.role === "collector");

  return (
    <AppShell 
      role="contributor" 
      userName={profile.full_name ?? profile.email ?? "Contributor"}
      userId={profile.id}
      isAdmin={isAdmin}
    >
      {children}
    </AppShell>
  );
}
