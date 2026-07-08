import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    
    // Exchange the code for a Supabase session
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.user) {
      // Check if the user exists in our profiles table (by ID or by Email)
      const adminSupabase = await createAdminClient();
      
      let { data: profile } = await adminSupabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
        
      if (!profile && data.user.email) {
        // Fallback to searching by email (linking Google account)
        const { data: emailProfile } = await adminSupabase
          .from("profiles")
          .select("role")
          .eq("email", data.user.email)
          .single();
          
        profile = emailProfile;
      }
      
      if (!profile) {
        // User does not exist in profiles table.
        // Sign them out of Supabase Auth and redirect back to login with an error.
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=account_not_found`);
      }
      
      // If an explicit 'next' parameter is provided (e.g., for password update), prioritize it
      if (searchParams.has("next") && next.startsWith("/auth/")) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Redirect based on role
      if (profile.role === "admin") {
        return NextResponse.redirect(`${origin}/dashboard/admin`);
      } else if (profile.role === "collector") {
        return NextResponse.redirect(`${origin}/dashboard/collector`);
      } else if (profile.role === "contributor") {
        return NextResponse.redirect(`${origin}/dashboard/contributor`);
      }
      
      // Fallback redirect
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
