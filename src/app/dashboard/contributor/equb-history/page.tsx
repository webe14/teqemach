import { Suspense } from "react";
import EqubHistoryClient from "./EqubHistoryClient";
import { Loader2 } from "lucide-react";
import { getCurrentProfile } from "@/lib/actions/auth";
import { getContributorStats } from "@/lib/actions/contributor";

export const metadata = {
  title: "Equb History | Teqemach",
};

export default async function EqubHistoryPage() {
  const currentProfile = await getCurrentProfile() as any;
  let stats: any = null;

  if (currentProfile?.id) {
    try {
      stats = await getContributorStats(currentProfile.id);
    } catch (e) {
      console.error("Failed to load stats:", e);
    }
  }

  // Mocking an active and finished equb for UI demonstration
  const activeEqubs = stats?.group ? [stats.group] : [
    {
      id: "active-1",
      name: "Daily Savings Equb",
      contribution_amount: 500,
      total_days: 30,
      frequency: "daily",
      status: "active",
      collector: { full_name: "Abebe Kebede" }
    }
  ];

  const finishedEqubs = [
    {
      id: "finished-1",
      name: "Weekly Corporate Equb",
      contribution_amount: 2000,
      total_days: 12,
      frequency: "weekly",
      status: "finished",
      collector: { full_name: "Chala Bekele" },
      completedDate: "23/04/2016"
    }
  ];

  return (
    <Suspense 
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <EqubHistoryClient activeEqubs={activeEqubs} finishedEqubs={finishedEqubs} />
    </Suspense>
  );
}
