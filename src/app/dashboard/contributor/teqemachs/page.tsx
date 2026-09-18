import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/actions/auth";
import { getPublicEqubGroups, getContributorJoinedGroupIds } from "@/lib/actions/contributor";
import TeqemachsClient from "./TeqemachsClient";

export const metadata = { title: "Explore Equbs — Wub Digital Equb" };

export default async function TeqemachsPage() {
  const currentProfile = (await getCurrentProfile()) as any;
  const profile = currentProfile;

  const [groupsRes, joinedRes] = await Promise.all([
    getPublicEqubGroups(),
    profile?.id ? getContributorJoinedGroupIds(profile.id) : Promise.resolve({ data: [] }),
  ]);

  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading Equbs...</div>}>
      <TeqemachsClient 
        userName={profile?.full_name || profile?.email?.split('@')[0] || "Webshet W."}
        userId={profile?.id}
        allGroups={groupsRes.data || []}
        joinedGroupIds={joinedRes?.data || []}
      />
    </Suspense>
  );
}

