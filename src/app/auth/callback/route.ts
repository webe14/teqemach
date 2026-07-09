import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/login'
  const role = searchParams.get('role')

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
        // Automatically create a profile for new Google sign-ups or Email confirmed users
        await adminClient.from("profiles").insert({
          id: authData.user.id,
          full_name: authData.user.user_metadata?.full_name || authData.user.user_metadata?.fullName || authData.user.email?.split('@')[0] || "User",
          email: authData.user.email,
          role: (role === "collector" || role === "contributor") ? role : "admin",
          phone_number: "",
          password: "supabase_auth"
        });
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
