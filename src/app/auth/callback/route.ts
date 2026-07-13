import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/login'
  const role = searchParams.get('role')
  const collectorId = searchParams.get('collectorId')
  const groupId = searchParams.get('groupId')

  if (code) {
    const supabase = await createClient()
    const { data: authData, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && authData.user) {
      // Check if user already has a profile
      const adminClient = await createAdminClient();
      const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("id")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (!existingProfile) {
        const isContributor = role === "contributor";
        const status = isContributor ? "pending" : "active";
        
        // Automatically create a profile for new Google sign-ups
        const { data: newProfile } = await adminClient.from("profiles").insert({
          id: authData.user.id,
          full_name: authData.user.user_metadata?.full_name || authData.user.user_metadata?.fullName || authData.user.email?.split('@')[0] || "User",
          email: authData.user.email,
          role: (role === "collector" || role === "contributor") ? role : "admin",
          status,
          phone_number: "",
          password: "supabase_auth",
          collector_id: collectorId || null
        }).select("id, full_name, email").single();

        if (isContributor && collectorId && groupId && newProfile) {
          // Create group membership
          await adminClient.from("group_memberships").insert({
            contributor_id: newProfile.id,
            group_id: groupId,
            collector_id: collectorId,
          });

          // Fetch group name for the notification
          const { data: group } = await adminClient
            .from("equb_groups")
            .select("name")
            .eq("id", groupId)
            .single();

          // Create notification for the collector
          await adminClient.from("notifications").insert({
            user_id: collectorId,
            type: "contributor_request",
            title: "New Contributor Request",
            message: `${newProfile.full_name} wants to join ${group?.name ?? "your group"}.`,
            data: {
              contributor_id: newProfile.id,
              contributor_name: newProfile.full_name,
              contributor_email: newProfile.email,
              group_id: groupId,
              group_name: group?.name ?? null,
            },
          });
        }
      }

      // If pending, we should probably still redirect them to login so they see the pending message
      // Because middleware will intercept /dashboard/contributor anyway and redirect to login?error=account_pending
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
