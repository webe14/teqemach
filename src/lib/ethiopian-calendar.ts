/**
 * Ethiopian Calendar (EC) Utilities
 * Handles conversion between Ethiopian Calendar and Gregorian Calendar.
 * Ethiopian Calendar is ~7-8 years behind Gregorian and has 13 months.
 */

export interface EthiopianDate {
  year: number;
  month: number;
  day: number;
}

const ETHIOPIAN_MONTHS_EN = [
  "Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit",
  "Megabit", "Miazia", "Ginbot", "Sene", "Hamle", "Nehase", "Pagumen",
];

const ETHIOPIAN_MONTHS_AM = [
  "መስከረም", "ጥቅምት", "ህዳር", "ታህሳስ", "ጥር", "የካቲት",
  "መጋቢት", "ሚያዚያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ",
];

const DAYS_OF_WEEK_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_OF_WEEK_AM = ["እሑድ", "ሰኞ", "ማክሰኞ", "ረቡዕ", "ሐሙስ", "ዓርብ", "ቅዳሜ"];

/**
 * Helper to extract Gregorian year, month, day in East Africa Time (UTC+3 / Africa/Addis_Ababa).
 * This ensures consistency across both local and UTC server environments.
 */
function getGregorianPartsInEAT(date: Date): { year: number; month: number; day: number } {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Addis_Ababa",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
    const parts = formatter.formatToParts(date);
    const year = parseInt(parts.find((p) => p.type === "year")?.value || "0", 10);
    const month = parseInt(parts.find((p) => p.type === "month")?.value || "0", 10);
    const day = parseInt(parts.find((p) => p.type === "day")?.value || "0", 10);
    if (year && month && day) {
      return { year, month, day };
    }
  } catch {
    // Fallback if Intl.DateTimeFormat is unavailable or timeZone option fails
  }

  // Fallback: manually add 3 hours (UTC+3) to UTC time
  const eatTime = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  return {
    year: eatTime.getUTCFullYear(),
    month: eatTime.getUTCMonth() + 1,
    day: eatTime.getUTCDate(),
  };
}

/**
 * Convert a Gregorian date to Ethiopian Calendar date.
 * Uses East Africa Time (UTC+3) to ensure accuracy across server and client timezones.
 */
export function toEthiopian(gregorianDate: Date): EthiopianDate {
  const { year, month, day } = getGregorianPartsInEAT(gregorianDate);
  const jdn = gregorianToJDN(year, month, day);
  return jdnToEthiopian(jdn);
}

/**
 * Convert an Ethiopian Calendar date to a Gregorian Date object.
 */
export function toGregorian(ec: EthiopianDate): Date {
  const jdn = ethiopianToJDN(ec.year, ec.month, ec.day);
  return jdnToGregorian(jdn);
}

/**
 * Format an Ethiopian date as a localized string.
 */
export function formatEthiopianDate(
  ec: EthiopianDate,
  locale: "en" | "am" = "en"
): string {
  const months = locale === "am" ? ETHIOPIAN_MONTHS_AM : ETHIOPIAN_MONTHS_EN;
  const monthName = months[ec.month - 1] ?? "";
  if (locale === "am") {
    return `${ec.day} ${monthName} ${ec.year}`;
  }
  return `${monthName} ${ec.day}, ${ec.year}`;
}

/**
 * Format a Gregorian date directly to Ethiopian display string.
 */
export function gregorianToEthiopianString(
  date: Date,
  locale: "en" | "am" = "en"
): string {
  const ec = toEthiopian(date);
  return formatEthiopianDate(ec, locale);
}

/**
 * Get list of Ethiopian month names.
 */
export function getEthiopianMonths(locale: "en" | "am" = "en"): string[] {
  return locale === "am" ? ETHIOPIAN_MONTHS_AM : ETHIOPIAN_MONTHS_EN;
}

/**
 * Get current Ethiopian date.
 */
export function getCurrentEthiopianDate(): EthiopianDate {
  return toEthiopian(new Date());
}

/**
 * Get days in a given Ethiopian month/year.
 */
export function getDaysInEthiopianMonth(year: number, month: number): number {
  if (month === 13) {
    // Pagumen: 5 days normally, 6 in Ethiopian leap year
    return isEthiopianLeapYear(year) ? 6 : 5;
  }
  return 30;
}

/**
 * Check if an Ethiopian year is a leap year.
 * Ethiopian leap year occurs every 4 years (year % 4 === 3).
 */
export function isEthiopianLeapYear(year: number): boolean {
  return year % 4 === 3;
}

/**
 * Add days to an Ethiopian date, returning a new EthiopianDate.
 */
export function addDaysToEthiopian(ec: EthiopianDate, days: number): EthiopianDate {
  const gregorian = toGregorian(ec);
  gregorian.setUTCDate(gregorian.getUTCDate() + days);
  return toEthiopian(gregorian);
}

/**
 * Calculate the difference in days between two Ethiopian dates.
 */
export function ethiopianDaysDiff(from: EthiopianDate, to: EthiopianDate): number {
  const fromG = toGregorian(from);
  const toG = toGregorian(to);
  const diff = toG.getTime() - fromG.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

const SHORT_ETHIOPIAN_MONTHS_AM = [
  "መስ", "ጥቅ", "ህዳ", "ታህ", "ጥር", "የካ",
  "መጋ", "ሚያ", "ግን", "ሰኔ", "ሐም", "ነሐ", "ጳጉ",
];

const SHORT_ETHIOPIAN_MONTHS_EN = [
  "Mes", "Tik", "Hid", "Tah", "Tir", "Yek",
  "Meg", "Mia", "Gin", "Sene", "Ham", "Neh", "Pagu",
];

/**
 * Format a Date as short Ethiopian "Month Day" (e.g. "መስ 2" or "Mes 2").
 */
export function formatShortEthiopianDate(
  date: Date,
  locale: "am" | "en" = "am"
): string {
  const ec = toEthiopian(date);
  const months = locale === "am" ? SHORT_ETHIOPIAN_MONTHS_AM : SHORT_ETHIOPIAN_MONTHS_EN;
  const monthName = months[ec.month - 1] ?? "";
  return `${monthName} ${ec.day}`;
}

/**
 * Compute the expected Date for a cycle given start date and frequency.
 */
export function getCycleDate(
  cycleNumber: number,
  startDate: Date | string,
  frequency: "daily" | "weekly" | "monthly" = "daily"
): Date {
  const d = new Date(startDate);
  const n = Math.max(0, cycleNumber - 1);
  switch (frequency) {
    case "weekly":
      d.setDate(d.getDate() + n * 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + n);
      break;
    case "daily":
    default:
      d.setDate(d.getDate() + n);
      break;
  }
  return d;
}

export interface CycleSummaryInput {
  cycleNumbers: number[];
  startDate: Date | string;
  frequency?: "daily" | "weekly" | "monthly";
  totalDays?: number;
  totalPaidCyclesCount: number;
}

/**
 * Generate formatted cycle dates for Bot (individual dates list) and SMS (interval range)
 * and remaining days / date range for both.
 */
export function formatCycleDatesSummary({
  cycleNumbers,
  startDate,
  frequency = "daily",
  totalDays = 365,
  totalPaidCyclesCount,
}: CycleSummaryInput) {
  const sorted = [...cycleNumbers].sort((a, b) => a - b);
  const start = new Date(startDate);

  // 1. Bot Selected Dates: List of all selected dates, e.g. "መስ 2, መስ 3, መስ 4"
  const botDatesList = sorted.map((c) => {
    const d = getCycleDate(c, start, frequency);
    return formatShortEthiopianDate(d, "am");
  });
  const botSelectedDates = botDatesList.length > 0 ? botDatesList.join(", ") : "0 ቀናት";

  // 2. SMS Selected Dates: Interval range, e.g. "Mes 2 - Mes 20"
  const firstCycle = sorted[0] || 1;
  const lastCycle = sorted[sorted.length - 1] || 1;
  const smsStart = formatShortEthiopianDate(getCycleDate(firstCycle, start, frequency), "en");
  const smsEnd = formatShortEthiopianDate(getCycleDate(lastCycle, start, frequency), "en");
  const smsSelectedDates = sorted.length <= 1 ? smsStart : `${smsStart} - ${smsEnd}`;

  // 3. Paid Days for both Bot and SMS (total days completed so far)
  const botPaidText = totalPaidCyclesCount === 1 ? "1 ቀን" : `${totalPaidCyclesCount} ቀናት`;
  const smsPaidText = totalPaidCyclesCount === 1 ? "1 day" : `${totalPaidCyclesCount} days`;

  // 4. Remaining Days (if needed)
  const remainingCount = Math.max(0, totalDays - totalPaidCyclesCount);
  const botRemainingText = remainingCount === 1 ? "1 ቀን" : `${remainingCount} ቀናት`;
  const smsRemainingText = remainingCount === 1 ? "1 day" : `${remainingCount} days`;

  return {
    botSelectedDates,
    smsSelectedDates,
    botPaidText,
    smsPaidText,
    botRemainingText,
    smsRemainingText,
    totalPaidCyclesCount,
    remainingCount,
  };
}

/**
 * Parse a string "DD/MM/YYYY" in Ethiopian calendar to EthiopianDate.
 */
export function parseEthiopianDate(str: string): EthiopianDate | null {
  if (!str) return null;

  // 1. Try DD/MM/YYYY format
  if (str.includes("/")) {
    const parts = str.split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (
        !isNaN(day) && 
        !isNaN(month) && 
        !isNaN(year) && 
        month >= 1 && 
        month <= 13 && 
        day >= 1 && 
        day <= getDaysInEthiopianMonth(year, month)
      ) {
        return { year, month, day };
      }
    }
  }

  // 2. Fallback: try parsing as ISO/Gregorian date and converting
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return toEthiopian(d);
    }
  } catch {
    // Ignore
  }

  return null;
}

// ─── Internal Julian Day Number helpers ───────────────────────────────────────

function gregorianToJDN(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

function ethiopianToJDN(year: number, month: number, day: number): number {
  // Correct formula: inverse of jdnToEthiopian
  // Verified: EC 2018/10/01 → JDN 2461200 → Gregorian 2026-06-08 ✓
  return 1723856 + 365 * year + Math.floor(year / 4) + 30 * (month - 1) + day - 1;
}

function jdnToEthiopian(jdn: number): EthiopianDate {
  const r = (jdn - 1723856) % 1461;
  const n = r % 365 + 365 * Math.floor(r / 1460);
  const year = Math.floor((jdn - 1723856) / 1461) * 4 + Math.floor(r / 365) - Math.floor(r / 1460);
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;
  return { year, month, day };
}

function jdnToGregorian(jdn: number): Date {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor(146097 * b / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor(1461 * d / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
}
