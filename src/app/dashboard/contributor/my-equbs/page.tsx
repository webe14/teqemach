import { Suspense } from "react";
import MyEqubsClient from "./MyEqubsClient";
import { Loader2 } from "lucide-react";
import { getCurrentProfile } from "@/lib/actions/auth";
import { getContributorStats } from "@/lib/actions/contributor";

export const metadata = {
  title: "My Equb | Wub Digital Equb",
};

export default async function MyEqubsPage() {
  const currentProfile = await getCurrentProfile() as any;
  const profile = currentProfile || {
    id: "test-contributor-id",
    full_name: "Webshet W.",
    email: "webshet@example.com",
    role: "contributor"
  };

  let stats: any = null;
  
  if (currentProfile?.id) {
    try {
      stats = await getContributorStats(currentProfile.id);
    } catch (e) {
      console.error("Failed to load contributor stats:", e);
    }
  }

  return (
    <Suspense 
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <MyEqubsClient 
        userName={profile?.full_name || "Webshet W."} 
        group={stats?.group} 
        groups={stats?.groups || []}
      />
    </Suspense>
  );
}
