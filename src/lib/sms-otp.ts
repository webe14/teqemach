export {
  formatEthiopianPhone,
  toLocalEthiopianPhone,
  normalizeEthiopianMsisdn,
  cleanSmsText,
  buildPaymentConfirmationSms,
  queueAndDispatchSms,
} from "./sms-service";
export type { PaymentSmsDetails, DispatchSmsOptions, DispatchSmsResult } from "./sms-service";

import { formatEthiopianPhone, queueAndDispatchSms } from "./sms-service";
import { createAdminClient } from "@/lib/supabase/server";

export async function findProfileByPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits || digits.length < 9) return null;
  const suffix = digits.slice(-9);

  const adminClient = await createAdminClient();

  const variants = [
    `+251${suffix}`,
    `251${suffix}`,
    `0${suffix}`,
    suffix,
  ];
  const conditions = variants.map((v) => `phone_number.eq.${v}`).join(",");
  const { data: exactMatches } = await adminClient
    .from("profiles")
    .select("id, phone_number, full_name, role, email")
    .or(conditions);

  if (exactMatches && exactMatches.length > 0) {
    return exactMatches[0];
  }

  // Fallback for numbers formatted with spaces
  const { data: allProfiles } = await adminClient
    .from("profiles")
    .select("id, phone_number, full_name, role, email")
    .not("phone_number", "is", null);

  if (allProfiles) {
    const matched = allProfiles.find((p) => {
      const pDigits = (p.phone_number || "").replace(/\D/g, "");
      return pDigits.endsWith(suffix) || (pDigits.length >= 9 && suffix.endsWith(pDigits));
    });
    if (matched) return matched;
  }

  return null;
}

export async function sendRegistrationOtp({
  phone,
  email,
}: {
  phone: string;
  email?: string;
}): Promise<{ success: boolean; error?: string; formattedPhone?: string }> {
  try {
    const formattedPhone = formatEthiopianPhone(phone);
    if (!formattedPhone) {
      return {
        success: false,
        error: "Please enter a valid Ethiopian phone number (e.g. 0912345678 or 0712345678).",
      };
    }

    const adminClient = await createAdminClient();

    // Check if email already registered
    if (email && email.trim()) {
      const { data: existingEmail } = await adminClient
        .from("profiles")
        .select("id")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (existingEmail) {
        return { success: false, error: "An account with this email already exists." };
      }
    }

    // Check if phone already registered across all formats
    const existingPhone = await findProfileByPhone(phone);
    if (existingPhone) {
      return { success: false, error: "An account with this phone number already exists. Please log in." };
    }

    // Generate secure 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // Store in sms_otp_verifications table
    await adminClient.from("sms_otp_verifications").insert({
      phone_number: formattedPhone,
      otp_code: otpCode,
      expires_at: expiresAt,
      is_verified: false,
    });

    // Queue & dispatch SMS for testing application and/or direct SMS API
    const dispatchRes = await queueAndDispatchSms({
      phone: formattedPhone,
      message: `Your Wub Digital Equb verification code is: ${otpCode}. Valid for 5 minutes. Do not share this code.`,
      type: "otp",
    });

    if (!dispatchRes.success) {
      return { success: false, error: dispatchRes.error || "Failed to dispatch verification SMS. Please try again." };
    }

    return { success: true, formattedPhone };
  } catch (err: any) {
    console.error("sendRegistrationOtp exception:", err);
    return { success: false, error: err.message || "Failed to send verification SMS." };
  }
}

export async function verifyRegistrationOtp({
  phone,
  code,
}: {
  phone: string;
  code: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const formattedPhone = formatEthiopianPhone(phone);
    if (!formattedPhone) {
      return { success: false, error: "Invalid phone number format." };
    }

    const adminClient = await createAdminClient();

    // Check for valid unexpired OTP
    const { data: records, error } = await adminClient
      .from("sms_otp_verifications")
      .select("id, expires_at, is_verified")
      .eq("phone_number", formattedPhone)
      .eq("otp_code", code.trim())
      .eq("is_verified", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !records || records.length === 0) {
      return { success: false, error: "Invalid verification code. Please check and try again." };
    }

    const record = records[0];
    if (new Date(record.expires_at) < new Date()) {
      return { success: false, error: "Verification code has expired. Please request a new one." };
    }

    // Mark as verified
    await adminClient
      .from("sms_otp_verifications")
      .update({ is_verified: true })
      .eq("id", record.id);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Verification failed." };
  }
}
