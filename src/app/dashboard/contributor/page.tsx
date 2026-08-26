import { getCurrentProfile } from "@/lib/actions/auth";
import { getContributorStats, getPublicEqubGroups } from "@/lib/actions/contributor";
import { getCurrentEthiopianDate, addDaysToEthiopian, formatEthiopianDate } from "@/lib/ethiopian-calendar";
import ContributorDashboardClient from "./ContributorDashboardClient";

export const metadata = { title: "My Dashboard — Teqemach" };
export const revalidate = 30; // Cache page data for 30 seconds

export default async function ContributorDashboardPage() {
  const currentProfile = await getCurrentProfile() as any;
  
  const profile = currentProfile || {
    id: "test-contributor-id",
    full_name: "Webshet W.",
    email: "webshet@example.com",
    role: "contributor"
  };

  let stats: any = { amountSaved: 12500, daysRemaining: 14, paidCycles: 16, totalCycles: 30, group: { contribution_amount: 500, total_days: 30, frequency: "daily" } };
  
  if (currentProfile?.id) {
    try {
      stats = await getContributorStats(currentProfile.id);
    } catch (e) {
      console.error("Failed to load contributor stats:", e);
    }
  }


  const groupsRes = await getPublicEqubGroups();

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
      userName={profile?.full_name || profile?.email?.split('@')[0] || "Webshet W."}
      userId={profile?.id}
      allGroups={groupsRes.data || []}
    />
  );
}


