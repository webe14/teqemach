"use strict";
/**
 * Ethiopian Calendar (EC) Utilities
 * Handles conversion between Ethiopian Calendar and Gregorian Calendar.
 * Ethiopian Calendar is ~7-8 years behind Gregorian and has 13 months.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toEthiopian = toEthiopian;
exports.toGregorian = toGregorian;
exports.formatEthiopianDate = formatEthiopianDate;
exports.gregorianToEthiopianString = gregorianToEthiopianString;
exports.getEthiopianMonths = getEthiopianMonths;
exports.getCurrentEthiopianDate = getCurrentEthiopianDate;
exports.getDaysInEthiopianMonth = getDaysInEthiopianMonth;
exports.isEthiopianLeapYear = isEthiopianLeapYear;
exports.addDaysToEthiopian = addDaysToEthiopian;
exports.ethiopianDaysDiff = ethiopianDaysDiff;
exports.parseEthiopianDate = parseEthiopianDate;
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
function toEthiopian(gregorianDate) {
    const jdn = gregorianToJDN(gregorianDate.getFullYear(), gregorianDate.getMonth() + 1, gregorianDate.getDate());
    return jdnToEthiopian(jdn);
}
/**
 * Convert an Ethiopian Calendar date to a Gregorian Date object.
 */
function toGregorian(ec) {
    const jdn = ethiopianToJDN(ec.year, ec.month, ec.day);
    return jdnToGregorian(jdn);
}
/**
 * Format an Ethiopian date as a localized string.
 */
function formatEthiopianDate(ec, locale = "en") {
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
function gregorianToEthiopianString(date, locale = "en") {
    const ec = toEthiopian(date);
    return formatEthiopianDate(ec, locale);
}
/**
 * Get list of Ethiopian month names.
 */
function getEthiopianMonths(locale = "en") {
    return locale === "am" ? ETHIOPIAN_MONTHS_AM : ETHIOPIAN_MONTHS_EN;
}
/**
 * Get current Ethiopian date.
 */
function getCurrentEthiopianDate() {
    return toEthiopian(new Date());
}
/**
 * Get days in a given Ethiopian month/year.
 */
function getDaysInEthiopianMonth(year, month) {
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
function isEthiopianLeapYear(year) {
    return year % 4 === 3;
}
/**
 * Add days to an Ethiopian date, returning a new EthiopianDate.
 */
function addDaysToEthiopian(ec, days) {
    const gregorian = toGregorian(ec);
    gregorian.setDate(gregorian.getDate() + days);
    return toEthiopian(gregorian);
}
/**
 * Calculate the difference in days between two Ethiopian dates.
 */
function ethiopianDaysDiff(from, to) {
    const fromG = toGregorian(from);
    const toG = toGregorian(to);
    const diff = toG.getTime() - fromG.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}
/**
 * Parse a string "DD/MM/YYYY" in Ethiopian calendar to EthiopianDate.
 */
function parseEthiopianDate(str) {
    const parts = str.split("/");
    if (parts.length !== 3)
        return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year))
        return null;
    if (month < 1 || month > 13)
        return null;
    if (day < 1 || day > getDaysInEthiopianMonth(year, month))
        return null;
    return { year, month, day };
}
// ─── Internal Julian Day Number helpers ───────────────────────────────────────
function gregorianToJDN(year, month, day) {
    const a = Math.floor((14 - month) / 12);
    const y = year + 4800 - a;
    const m = month + 12 * a - 3;
    return (day +
        Math.floor((153 * m + 2) / 5) +
        365 * y +
        Math.floor(y / 4) -
        Math.floor(y / 100) +
        Math.floor(y / 400) -
        32045);
}
function ethiopianToJDN(year, month, day) {
    return (Math.floor((11 * year + 142) / 4) +
        (month - 1) * 30 +
        day +
        1723856);
}
function jdnToEthiopian(jdn) {
    const r = (jdn - 1723856) % 1461;
    const n = r % 365 + 365 * Math.floor(r / 1460);
    const year = Math.floor((jdn - 1723856) / 1461) * 4 + Math.floor(r / 365) - Math.floor(r / 1460);
    const month = Math.floor(n / 30) + 1;
    const day = (n % 30) + 1;
    return { year, month, day };
}
function jdnToGregorian(jdn) {
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
