import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");
  
  if (!phone) {
    return NextResponse.json({ 
      error: "Please provide your phone number in the URL.",
      usage: "Visit /api/setup-admin?phone=09XXXXXXXX"
    });
  }

  const adminClient = await createAdminClient();
  
  // Try to match the exact phone number provided
  const { data, error } = await adminClient
    .from("profiles")
    .update({ role: "admin" })
    .or(`phone_number.eq.${phone},phone_number.eq.+251${phone.replace(/^0/, '')},phone_number.eq.251${phone.replace(/^0/, '')}`)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ 
      error: "No profile found with that phone number.",
      phone_searched: phone 
    });
  }

  return NextResponse.json({ 
    success: true, 
    message: `Success! Profile is now an ADMIN. You can now log into the Admin Portal.`, 
    updated_profiles: data 
  });
}
