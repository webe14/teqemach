import { NextResponse } from "next/server";

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

    // SMS Ethiopia integration if configured
    const smsEthiopiaApiKey = process.env.SMSETHIOPIA_API_KEY;

    if (smsEthiopiaApiKey) {
      try {
        // Format phone to 251... standard for SMS Ethiopia (digits only, no + prefix)
        let cleanedPhone = phone.replace(/[\s\-\(\)\+]/g, "");
        if (cleanedPhone.startsWith("0")) {
          cleanedPhone = "251" + cleanedPhone.slice(1);
        } else if (cleanedPhone.length === 9 && (cleanedPhone.startsWith("9") || cleanedPhone.startsWith("7"))) {
          cleanedPhone = "251" + cleanedPhone;
        }

        console.log(`Sending SMS Ethiopia to ${cleanedPhone}`);

        const response = await fetch("https://smsethiopia.et/api/sms/send", {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "KEY": smsEthiopiaApiKey,
          },
          body: JSON.stringify({
            msisdn: cleanedPhone,
            text: message,
          }),
        });

        const resData = await response.json().catch(() => ({}));
        if (!response.ok) {
          console.error("SMS Ethiopia failed:", resData);
          return NextResponse.json(
            { 
              success: false, 
              error: resData.detail || resData.message || "SMS Ethiopia failed to send", 
              details: resData 
            },
            { status: response.status }
          );
        } else {
          console.log("SMS Ethiopia sent successfully:", resData);
          return NextResponse.json({
            success: true,
            provider: "smsethiopia",
            recipient: cleanedPhone,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (smsError: any) {
        console.error("Failed to send via SMS Ethiopia:", smsError);
        return NextResponse.json(
          { success: false, error: smsError.message || "Failed to communicate with SMS Ethiopia API" },
          { status: 500 }
        );
      }
    }

    // Return success to the client regardless of real network outcome (fallback to mock simulation)
    return NextResponse.json({
      success: true,
      provider: "simulator",
      messageId: `msg_${Math.random().toString(36).substring(2, 11)}`,
      recipient: phone,
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
