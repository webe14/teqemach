/**
 * Ethiopian Banking SMS Message Parser
 * Parses SMS messages from CBE (Commercial Bank of Ethiopia), Telebirr, CBE Birr, and other Ethiopian Banks
 * Extracts:
 * - Transaction Reference / ID (e.g. FT2609028881, MP26090212345, etc.)
 * - Transferred / Paid Amount (numeric ETB)
 * - Date & Time
 * - Sender & Receiver Details
 */

export interface ParsedSmsResult {
  isValid: boolean;
  bankType: "CBE" | "TELEBIRR" | "CBE_BIRR" | "OTHER" | "UNKNOWN";
  amount: number | null;
  currency: string;
  txnRef: string | null;
  dateStr: string | null;
  accountOrPhone: string | null;
  receiverName: string | null;
  rawText: string;
  error?: string;
}

export interface PaymentValidationResult {
  isMatch: boolean;
  status: "perfect_match" | "overpaid" | "underpaid" | "no_amount" | "no_ref";
  parsedAmount: number;
  expectedAmount: number;
  daysPaid: number;
  message: string;
}

export function parseEthiopianBankSms(text: string): ParsedSmsResult {
  if (!text || typeof text !== "string" || !text.trim()) {
    return {
      isValid: false,
      bankType: "UNKNOWN",
      amount: null,
      currency: "ETB",
      txnRef: null,
      dateStr: null,
      accountOrPhone: null,
      receiverName: null,
      rawText: "",
      error: "Empty SMS message",
    };
  }

  const raw = text.trim();
  const lower = raw.toLowerCase();

  // 1. Detect Bank Type
  let bankType: ParsedSmsResult["bankType"] = "UNKNOWN";
  if (lower.includes("cbe") || lower.includes("commercial bank") || lower.includes("የኢትዮጵያ ንግድ ባንክ") || /ft\d{8,}/i.test(raw)) {
    bankType = "CBE";
  } else if (lower.includes("telebirr") || lower.includes("ቴሌብር") || /mp\d{8,}/i.test(raw)) {
    bankType = "TELEBIRR";
  } else if (lower.includes("cbebirr") || lower.includes("cbe birr") || lower.includes("ሲቢኢ ብር")) {
    bankType = "CBE_BIRR";
  } else if (lower.includes("boa") || lower.includes("awash") || lower.includes("dashen") || lower.includes("bank") || lower.includes("ባንክ")) {
    bankType = "OTHER";
  }

  // 2. Extract Amount
  let amount: number | null = null;

  // Normalize text: handle dot used as thousands separator if followed by 3 digits
  const normalizedRaw = raw.replace(/(\d+)\.(\d{3})\.(\d{2})/g, "$1$2.$3");

  // Patterns for amount matching (supporting ETB 17,500.00, ETB 17500, 17500.00, 17,500 ብር, etc.):
  const amountRegexes = [
    /(?:ETB|Birr|ብር)\s*:?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i,
    /([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\s*(?:ETB|Birr|ብር)/i,
    /(?:transferred|paid|debited|amount|received|ገንዘብ|የተከፈለው|ያስቀመጡት)\s*:?\s*(?:ETB|ብር)?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i,
    /(?:ETB|ብር)?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\s*(?:has been|transferred|credited|debited|ተላልፏል)/i,
  ];

  for (const regex of amountRegexes) {
    const match = normalizedRaw.match(regex);
    if (match && match[1]) {
      const cleanNum = match[1].replace(/,/g, "");
      const parsed = parseFloat(cleanNum);
      if (!isNaN(parsed) && parsed > 0) {
        amount = parsed;
        break;
      }
    }
  }

  // Fallback amount check: look for prominent money format like 500.00, 17500.00, 1000.00, etc.
  if (amount === null) {
    const fallbackMatch = normalizedRaw.match(/\b([1-9][0-9]{0,2}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[1-9][0-9]*(?:\.[0-9]{1,2})?)\b/);
    if (fallbackMatch && fallbackMatch[1]) {
      const parsed = parseFloat(fallbackMatch[1].replace(/,/g, ""));
      if (!isNaN(parsed) && parsed > 0) {
        amount = parsed;
      }
    }
  }

  // 3. Extract Transaction ID / Reference (Txn ID)
  let txnRef: string | null = null;

  // Comprehensive Ethiopian Banking Reference regexes
  const refRegexes = [
    /(?:transaction\s*number|transaction\s*num|txn\s*number|txn\s*num|transaction\s*id|txn\s*id|txn\s*ref|trans\s*ref|ref\s*no|reference\s*no|ref|የዝውውር\s*ቁጥር|የግብይት\s*ቁጥር|ቁጥር)\s*[:=\-\s]\s*([a-zA-Z0-9_-]{5,30})/i,
    /(?:by\s+transaction\s+(?:number|id|ref|no))\s+([a-zA-Z0-9_-]{5,30})/i,
    /\b(FT[0-9A-Z]{8,20})\b/i, // CBE FT Code
    /\b(MP[0-9A-Z]{8,20})\b/i, // Telebirr MP Code
    /\b(CB[0-9A-Z]{8,20})\b/i, // CBE Birr Code
    /\b(TXN[0-9A-Z]{6,20})\b/i,
    /\b([A-Z0-9]{8,18})\b/, // General Telebirr transaction code like DHH0US24Ir
  ];

  for (const regex of refRegexes) {
    const match = raw.match(regex);
    if (match && match[1]) {
      const candidate = match[1].trim().toUpperCase();
      // Skip pure amount words
      if (!/^(ETB|BIRR|USD|EUR|[0-9\.]+)$/i.test(candidate)) {
        txnRef = candidate;
        break;
      }
    }
  }

  // 4. Extract Date / Time
  let dateStr: string | null = null;
  const dateRegexes = [
    /(?:on|date|ቀን)\s*:?\s*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4}(?:\s+[0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?(?:\s*[AP]M)?)?)/i,
    /([0-9]{4}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{1,2}(?:\s+[0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?)?)/,
    /([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/,
  ];

  for (const regex of dateRegexes) {
    const match = raw.match(regex);
    if (match && match[1]) {
      dateStr = match[1].trim();
      break;
    }
  }

  // 5. Extract Account or Phone
  let accountOrPhone: string | null = null;
  const accMatch = raw.match(/(?:to\s*account|to\s*acc|account|ወደ\s*ሂሳብ|ወደ\s*አካውንት)\s*:?\s*([0-9]{8,18})/i);
  if (accMatch && accMatch[1]) {
    accountOrPhone = accMatch[1];
  } else {
    const phoneMatch = raw.match(/(?:\+?251|0)(9|7)[0-9]{8}/);
    if (phoneMatch) {
      accountOrPhone = phoneMatch[0];
    }
  }

  // 6. Extract Receiver Name if present in parentheses or after to
  let receiverName: string | null = null;
  const nameMatch = raw.match(/\(([^)]{3,35})\)/);
  if (nameMatch && nameMatch[1] && !/ft\d|mp\d|\d{5,}/i.test(nameMatch[1])) {
    receiverName = nameMatch[1].trim();
  }

  const isValid = (amount !== null && amount > 0) || !!txnRef || raw.length > 5;

  return {
    isValid,
    bankType,
    amount,
    currency: "ETB",
    txnRef: txnRef || null,
    dateStr: dateStr || null,
    accountOrPhone,
    receiverName,
    rawText: raw,
  };
}

export function validatePaymentWithSms(
  parsed: ParsedSmsResult,
  expectedDailyRate: number,
  selectedDays: number
): PaymentValidationResult {
  const expectedAmount = expectedDailyRate * selectedDays;
  const parsedAmount = parsed.amount || 0;

  if (parsedAmount > 0) {
    if (parsedAmount === expectedAmount) {
      return {
        isMatch: true,
        status: "perfect_match",
        parsedAmount,
        expectedAmount,
        daysPaid: selectedDays,
        message: `ትክክለኛ መጠን (ETB ${parsedAmount.toLocaleString()})! ለ ${selectedDays} ቀን ክፍያ ዝግጁ ነው። (Verified exact match!)`,
      };
    }

    if (parsedAmount > expectedAmount) {
      const calculatedDays = expectedDailyRate > 0 ? Math.floor(parsedAmount / expectedDailyRate) : selectedDays;
      return {
        isMatch: false,
        status: "overpaid",
        parsedAmount,
        expectedAmount,
        daysPaid: selectedDays,
        message: `የተከፈለው መጠን (ETB ${parsedAmount.toLocaleString()}) ከተመረጡት ${selectedDays} ቀናት ጠቅላላ ክፍያ (ETB ${expectedAmount.toLocaleString()}) ይበልጣል! የቀናትን ብዛት ${calculatedDays} ቢያደርጉ ይሸፍናል። (Amount cannot be greater than total payable: ETB ${parsedAmount.toLocaleString()} > ETB ${expectedAmount.toLocaleString()})`,
      };
    }

    if (parsedAmount < expectedAmount) {
      return {
        isMatch: false,
        status: "underpaid",
        parsedAmount,
        expectedAmount,
        daysPaid: selectedDays,
        message: `የተከፈለው መጠን (ETB ${parsedAmount.toLocaleString()}) ለተመረጡት ${selectedDays} ቀናት ከሚያስፈልገው (ETB ${expectedAmount.toLocaleString()}) ያንሳል! (Amount is less than total payable: ETB ${parsedAmount.toLocaleString()} < ETB ${expectedAmount.toLocaleString()})`,
      };
    }
  }

  if (parsed.txnRef) {
    return {
      isMatch: true,
      status: "perfect_match",
      parsedAmount: expectedAmount,
      expectedAmount,
      daysPaid: selectedDays,
      message: `የዝውውር ቁጥር (${parsed.txnRef}) ተገኝቷል። ለማረጋገጥ ዝግጁ ነው።`,
    };
  }

  return {
    isMatch: true,
    status: "perfect_match",
    parsedAmount: expectedAmount,
    expectedAmount,
    daysPaid: selectedDays,
    message: "የኤስኤምኤስ ጽሑፍ ተለጥፏል። ክፍያዎን ማረጋገጥ ይችላሉ።",
  };
}
