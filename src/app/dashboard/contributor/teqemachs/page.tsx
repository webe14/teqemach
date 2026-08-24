import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/actions/auth";
import { getPublicEqubGroups } from "@/lib/actions/contributor";
import TeqemachsClient from "./TeqemachsClient";

export const metadata = { title: "Explore Teqemachs — Teqemach" };

export default async function TeqemachsPage() {
  const currentProfile = await getCurrentProfile() as any;
  const profile = currentProfile || {
    id: "test-contributor-id",
    full_name: "Webshet W.",
    email: "webshet@example.com",
    role: "contributor"
  };

  const groupsRes = await getPublicEqubGroups();

  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading Teqemachs...</div>}>
      <TeqemachsClient 
        userName={profile?.full_name || profile?.email?.split('@')[0] || "Webshet W."}
        userId={profile?.id}
        allGroups={groupsRes.data || []}
      />
    </Suspense>
  );
}

