import { Suspense } from "react";
import EqubHistoryClient from "./EqubHistoryClient";
import { Loader2 } from "lucide-react";
import { getCurrentProfile } from "@/lib/actions/auth";
import { getContributorStats } from "@/lib/actions/contributor";

export const metadata = {
  title: "Equb History | Wub Digital Equb",
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

  // Fetch all active equbs for contributor
  const activeEqubs = stats?.groups?.length 
    ? stats.groups 
    : (stats?.group ? [stats.group] : []);

  const finishedEqubs: any[] = [];

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
