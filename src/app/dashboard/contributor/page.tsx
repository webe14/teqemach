import { getCurrentProfile } from "@/lib/actions/auth";
import { getContributorStats } from "@/lib/actions/contributor";
import { getCurrentEthiopianDate, addDaysToEthiopian, formatEthiopianDate } from "@/lib/ethiopian-calendar";
import ContributorDashboardClient from "./ContributorDashboardClient";

export const metadata = { title: "My Dashboard — Teqemach" };

export default async function ContributorDashboardPage() {
  // Use getCurrentProfile() — works for both Supabase Auth and custom cookie sessions
  const profile = await getCurrentProfile() as any;
  if (!profile) return null;

  const stats = await getContributorStats(profile.id);

  // Compute next cycle date (Ethiopian Calendar)
  const today = getCurrentEthiopianDate();
  const nextCycle = addDaysToEthiopian(today, stats.daysRemaining > 0 ? 1 : 0);
  const nextCycleStr = formatEthiopianDate(nextCycle, "en");
  const todayStr = formatEthiopianDate(today, "en");

  const group = stats.group as { contribution_amount: number; total_days: number; frequency: string } | null | undefined;

  return (
    <ContributorDashboardClient 
      stats={stats} 
      todayStr={todayStr} 
      nextCycleStr={nextCycleStr} 
      group={group} 
    />
  );
}
