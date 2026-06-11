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
 * Convert a Gregorian date to Ethiopian Calendar date.
 */
export function toEthiopian(gregorianDate: Date): EthiopianDate {
  const jdn = gregorianToJDN(
    gregorianDate.getFullYear(),
    gregorianDate.getMonth() + 1,
    gregorianDate.getDate()
  );
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
  gregorian.setDate(gregorian.getDate() + days);
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

/**
 * Parse a string "DD/MM/YYYY" in Ethiopian calendar to EthiopianDate.
 */
export function parseEthiopianDate(str: string): EthiopianDate | null {
  const parts = str.split("/");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (month < 1 || month > 13) return null;
  if (day < 1 || day > getDaysInEthiopianMonth(year, month)) return null;
  return { year, month, day };
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
  return new Date(year, month - 1, day);
}
