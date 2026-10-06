import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { queueAndDispatchSms, formatEthiopianPhone } from "@/lib/sms-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const adminClient = await createAdminClient();
    const { data: jobs, error } = await adminClient
      .from("sms_jobs")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, jobs: jobs || [] },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { jobId, status = "sent", gatewayId } = body;

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    const adminClient = await createAdminClient();
    const updates: any = {
      status,
      gateway_id: gatewayId || "teqemach-gateway",
    };
    if (status === "sent") {
      updates.sent_at = new Date().toISOString();
    } else if (status === "failed") {
      updates.failed_at = new Date().toISOString();
    }

    const { error } = await adminClient
      .from("sms_jobs")
      .update(updates)
      .eq("id", jobId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, message, type } = body;

    if (!phone || !message) {
      return NextResponse.json(
        { error: "Phone and message are required" },
        { status: 400 }
      );
    }

    console.log(`[SMS Notification] [Type: ${type || "general"}]`);
    console.log(`To: ${phone}`);
    console.log(`Message: "${message}"`);
    console.log("-----------------------------------------");

    const result = await queueAndDispatchSms({
      phone,
      message,
      type: type || "general",
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to dispatch SMS" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      provider: result.provider,
      recipient: result.formattedPhone || phone,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("SMS API route error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

