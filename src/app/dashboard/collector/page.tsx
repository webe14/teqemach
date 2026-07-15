import { getCurrentProfile } from "@/lib/actions/auth";
import { getCollectorStats } from "@/lib/actions/collector";
import CollectorDashboardClient from "./CollectorDashboardClient";

export const metadata = { title: "Collector Dashboard — Teqemach" };

export default async function CollectorDashboardPage() {
  // Use getCurrentProfile() — works for both Supabase Auth and custom cookie sessions
  const profile = await getCurrentProfile() as any;
  if (!profile) return null;

  const stats = await getCollectorStats(profile.id);

  return <CollectorDashboardClient stats={stats} />;
}
