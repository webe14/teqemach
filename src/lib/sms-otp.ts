import { createAdminClient } from "@/lib/supabase/server";

export function formatEthiopianPhone(rawInput: string): string | null {
  if (!rawInput) return null;
  const digits = rawInput.replace(/\D/g, "");
  
  if (digits.startsWith("251") && (digits.length === 12)) {
    const prefix = digits.charAt(3);
    if (prefix === "9" || prefix === "7") {
      return `+${digits}`;
    }
  } else if (digits.startsWith("0") && digits.length === 10) {
    const prefix = digits.charAt(1);
    if (prefix === "9" || prefix === "7") {
      return `+251${digits.slice(1)}`;
    }
  } else if ((digits.startsWith("9") || digits.startsWith("7")) && digits.length === 9) {
    return `+251${digits}`;
  }
  
  return null;
}

export function toLocalEthiopianPhone(rawInput: string): string {
  if (!rawInput) return "";
  const digits = rawInput.replace(/\D/g, "");
  
  if (digits.startsWith("251") && digits.length === 12) {
    return `0${digits.slice(3)}`;
  } else if (digits.startsWith("0") && digits.length === 10) {
    return digits;
  } else if ((digits.startsWith("9") || digits.startsWith("7")) && digits.length === 9) {
    return `0${digits}`;
  }
  
  return rawInput;
}

export interface PaymentSmsDetails {
  contributorName: string;
  totalAmount: number;
  ratePerCycle?: number;
  groupName?: string;
  ethiopianDateStr: string;
  selectedDatesStr?: string;
  daysCount: number;
  collectorName?: string;
}

export function buildPaymentConfirmationSms({
  contributorName,
  totalAmount,
  ratePerCycle,
  groupName,
  ethiopianDateStr,
  selectedDatesStr,
  daysCount,
}: PaymentSmsDetails): string {
  const typeText = ratePerCycle ? `ባለ ${ratePerCycle}` : (groupName || "እቁብ");
  const datesText = selectedDatesStr ? ` (${selectedDatesStr})` : "";
  const nameDisplay = contributorName ? ` ${contributorName}` : "";

  return `ውብ እቁብ: ሰላም${nameDisplay}፤ የ ${totalAmount.toLocaleString()} ብር (${typeText}) ክፍያዎ ለ ${daysCount} ቀናት${datesText} በቀን ${ethiopianDateStr} ተመዝግቧል። እናመሰግናለን!`;
}

export function cleanSmsText(text?: string | null): string {
  if (!text) return "";
  const amharicReplacements: [RegExp, string][] = [
    [/መስከረም|መስ/g, "Mes"],
    [/ጥቅምት|ጥቅ/g, "Tik"],
    [/ህዳር|ህዳ/g, "Hid"],
    [/ታህሳስ|ታህ/g, "Tah"],
    [/ጥር/g, "Tir"],
    [/የካቲት|የካ/g, "Yek"],
    [/መጋቢት|መጋ/g, "Meg"],
    [/ሚያዚያ|ሚያ/g, "Mia"],
    [/ግንቦት|ግን/g, "Gin"],
    [/ሰኔ/g, "Sene"],
    [/ሐምሌ|ሀምሌ|ሐም/g, "Ham"],
    [/ነሐሴ|ነሀሴ|ነሐ|ነሀ/g, "Neh"],
    [/ጳጉሜ|ጳጉ/g, "Pagu"],
    [/ቀን\s*/g, "Day "],
    [/ባለ\s*/g, "Bale "],
    [/ብር/g, "ETB"],
    [/ዕቁብ|እቁብ/g, "Equb"],
    [/ተቀማጭ/g, "Wub Digital Equb"],
    [/ውብ ዲጂታል እቁብ/g, "Wub Digital Equb"],
  ];

  let result = text;
  for (const [pattern, replacement] of amharicReplacements) {
    result = result.replace(pattern, replacement);
  }

  // Remove any remaining non-ASCII characters to guarantee single-part 7-bit GSM delivery
  result = result.replace(/[^\x20-\x7E]/g, "");
  result = result.replace(/\s+/g, " ").trim();

  return result;
}

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

    // Queue SMS job in sms_jobs for the phone gateway
    const { error: smsError } = await adminClient.from("sms_jobs").insert({
      type: "otp",
      recipient: formattedPhone,
      message: `Your Wub Digital Equb verification code is: ${otpCode}. Valid for 5 minutes. Do not share this code.`,
      status: "pending",
      attempts: 0,
      max_attempts: 3,
    });

    if (smsError) {
      console.error("Error queuing SMS job:", smsError);
      return { success: false, error: "Failed to dispatch verification SMS. Please try again." };
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
