import { createAdminClient } from "@/lib/supabase/server";

/**
 * Normalizes any Ethiopian phone number into standard Ethiopian MSISDN (12 digits, digits only, e.g. "251911234567")
 */
export function normalizeEthiopianMsisdn(rawInput?: string | null): string | null {
  if (!rawInput) return null;
  const digits = rawInput.replace(/\D/g, "");
  if (!digits) return null;

  // If starts with 2510... (accidental 0 after country code), strip the extra 0
  if (digits.startsWith("2510") && digits.length === 13) {
    const p = digits.charAt(4);
    if (p === "9" || p === "7") {
      return `251${digits.slice(4)}`;
    }
  }

  // Starts with 251 (12 digits)
  if (digits.startsWith("251") && digits.length === 12) {
    const p = digits.charAt(3);
    if (p === "9" || p === "7") {
      return digits;
    }
  }

  // Starts with 0 (10 digits, e.g. 0911234567 or 0712345678)
  if (digits.startsWith("0") && digits.length === 10) {
    const p = digits.charAt(1);
    if (p === "9" || p === "7") {
      return `251${digits.slice(1)}`;
    }
  }

  // 9 digits without leading 0 (e.g. 911234567 or 712345678)
  if ((digits.startsWith("9") || digits.startsWith("7")) && digits.length === 9) {
    return `251${digits}`;
  }

  return null;
}

/**
 * Formats Ethiopian phone to E.164 (+251911234567)
 */
export function formatEthiopianPhone(rawInput?: string | null): string | null {
  const msisdn = normalizeEthiopianMsisdn(rawInput);
  if (!msisdn) return null;
  return `+${msisdn}`;
}

/**
 * Formats Ethiopian phone to local representation (0911234567)
 */
export function toLocalEthiopianPhone(rawInput?: string | null): string {
  const msisdn = normalizeEthiopianMsisdn(rawInput);
  if (!msisdn) return rawInput ? rawInput.replace(/\D/g, "") : "";
  return `0${msisdn.slice(3)}`;
}

/**
 * Cleans SMS text to GSM-7 compatible text to avoid carrier encoding drops and ensure single-part delivery
 */
export function cleanSmsText(text?: string | null): string {
  if (!text) return "";
  const amharicReplacements: [RegExp, string][] = [
    [/መስከረም|መስ/g, "Meskerem"],
    [/ጥቅምት|ጥቅ/g, "Tikimt"],
    [/ህዳር|ህዳ/g, "Hidar"],
    [/ታህሳስ|ታህ/g, "Tahsas"],
    [/ጥር/g, "Tir"],
    [/የካቲት|የካ/g, "Yekatit"],
    [/መጋቢት|መጋ/g, "Megabit"],
    [/ሚያዚያ|ሚያ/g, "Miazia"],
    [/ግንቦት|ግን/g, "Ginbot"],
    [/ሰኔ/g, "Sene"],
    [/ሐምሌ|ሀምሌ|ሐም/g, "Hamle"],
    [/ነሐሴ|ነሀሴ|ነሐ|ነሀ/g, "Nehase"],
    [/ጳጉሜ|ጳጉ/g, "Pagumen"],
    [/ቀን\s*/g, "Day "],
    [/ባለ\s*/g, "Bale "],
    [/ብር/g, "ETB"],
    [/ዕቁብ|እቁብ/g, "Equb"],
    [/ተቀማጭ/g, "Wub Digital Equb"],
    [/ውብ ዲጂታል እቁብ/g, "Wub Digital Equb"],
    [/ሰላም/g, "Selam"],
    [/ውድ ደንበኛ/g, "Dear Member"],
    [/እናመሰግናለን/g, "Thank you"],
  ];

  let result = text;
  for (const [pattern, replacement] of amharicReplacements) {
    result = result.replace(pattern, replacement);
  }

  // Remove non-ASCII characters to prevent carrier SMS corruption or encoding failure
  result = result.replace(/[^\x20-\x7E]/g, "");
  result = result.replace(/\s+/g, " ").trim();

  return result;
}

export interface PaymentSmsDetails {
  contributorName: string;
  totalAmount: number;
  ratePerCycle?: number;
  groupName?: string;
  ethiopianDateStr: string;
  selectedDatesStr?: string;
  daysCount: number;
  paidDays?: number | string;
  remainingDays?: number | string;
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
  paidDays,
  remainingDays,
}: PaymentSmsDetails): string {
  const typeText = ratePerCycle ? `Bale ${ratePerCycle}` : (cleanSmsText(groupName) || "Equb");
  const cleanDates = selectedDatesStr ? cleanSmsText(selectedDatesStr) : "";
  const datesText = cleanDates ? ` (${cleanDates})` : "";
  const cleanDate = cleanSmsText(ethiopianDateStr);
  const cleanName = cleanSmsText(contributorName || "");
  const nameDisplay = cleanName.length > 0 ? ` ${cleanName}` : "";
  const cleanPaid = paidDays !== undefined && paidDays !== null ? cleanSmsText(String(paidDays)) : "";
  const cleanRemaining = remainingDays !== undefined && remainingDays !== null ? cleanSmsText(String(remainingDays)) : "";
  const statusText = cleanPaid ? `, Total Paid: ${cleanPaid}` : cleanRemaining ? `, Remaining: ${cleanRemaining}` : "";

  return `Wub Digital Equb: Selam${nameDisplay}, your payment of ETB ${totalAmount.toLocaleString()} for ${typeText} (${daysCount} days${datesText})${statusText} on ${cleanDate} is confirmed. Thank you!`;
}

export interface DispatchSmsOptions {
  phone: string;
  message: string;
  type?: "otp" | "payment_confirmation" | "broadcast" | "general";
  forceQueueOnly?: boolean;
}

export interface DispatchSmsResult {
  success: boolean;
  jobId?: string;
  provider?: "smsethiopia" | "gateway" | "simulator";
  formattedPhone?: string;
  error?: string;
}

/**
 * Centralized, reliable SMS dispatcher:
 * 1. Normalizes Ethiopian phone numbers accurately (+251 and 251 formats).
 * 2. Cleans text for single-part GSM delivery.
 * 3. Attempts direct dispatch if SMSETHIOPIA_API_KEY is configured with failover endpoints.
 * 4. Always inserts/updates job in sms_jobs table so local gateway/testing apps can also process it.
 */
export async function queueAndDispatchSms({
  phone,
  message,
  type = "general",
  forceQueueOnly = false,
}: DispatchSmsOptions): Promise<DispatchSmsResult> {
  try {
    const formattedPhone = formatEthiopianPhone(phone);
    const msisdn = normalizeEthiopianMsisdn(phone);

    if (!formattedPhone || !msisdn) {
      console.warn(`[SMS Service] Invalid Ethiopian phone number provided: "${phone}"`);
      return {
        success: false,
        error: `Invalid Ethiopian phone number: ${phone}. Expected 09... or 07... or +2519...`,
      };
    }

    const cleanMessage = cleanSmsText(message);
    const adminClient = await createAdminClient();

    let directSent = false;
    let providerName: "smsethiopia" | "gateway" | "simulator" = "gateway";
    let apiError: string | undefined = undefined;

    const smsEthiopiaApiKey = process.env.SMSETHIOPIA_API_KEY;

    // If SMS Ethiopia API key is available and not forced to queue only, attempt direct HTTP dispatch
    if (smsEthiopiaApiKey && !forceQueueOnly) {
      const endpoints = [
        "https://smsethiopia.et/api/sms/send",
        "https://smsethiopia.com/api/sms/send",
      ];

      for (const endpoint of endpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json",
              "KEY": smsEthiopiaApiKey,
            },
            body: JSON.stringify({
              msisdn: msisdn,
              text: cleanMessage,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            directSent = true;
            providerName = "smsethiopia";
            console.log(`[SMS Service] Direct SMS successfully delivered via ${endpoint} to ${msisdn}`);
            break;
          } else {
            const errData = await response.json().catch(() => ({}));
            apiError = errData.detail || errData.message || `HTTP ${response.status}`;
            console.warn(`[SMS Service] ${endpoint} returned error:`, apiError);
          }
        } catch (fetchErr: any) {
          apiError = fetchErr.message || "Network timeout/error";
          console.warn(`[SMS Service] Connection to ${endpoint} failed:`, apiError);
        }
      }
    }

    // Always record the job in sms_jobs table:
    // - status = "sent" if direct API sent successfully
    // - status = "pending" for your phone gateway application to pick up and test/send!
    const jobPayload: Record<string, any> = {
      type,
      recipient: formattedPhone,
      message: cleanMessage,
      status: directSent ? "sent" : "pending",
      sent_at: directSent ? new Date().toISOString() : null,
      attempts: directSent ? 1 : 0,
      max_attempts: 3,
    };

    const { data: jobData, error: jobError } = await adminClient
      .from("sms_jobs")
      .insert(jobPayload)
      .select("id")
      .maybeSingle();

    if (jobError) {
      console.error("[SMS Service] Failed to record in sms_jobs table:", jobError);
    }

    return {
      success: true,
      jobId: jobData?.id,
      provider: providerName,
      formattedPhone,
      error: directSent ? undefined : apiError,
    };
  } catch (err: any) {
    console.error("[SMS Service] queueAndDispatchSms exception:", err);
    return {
      success: false,
      error: err.message || "Failed to process SMS dispatch",
    };
  }
}
