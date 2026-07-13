import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getCollectorsWithGroups } from "@/lib/actions/auth";

export async function GET() {
  const result = await getCollectorsWithGroups();
  
  return NextResponse.json(result);
}
