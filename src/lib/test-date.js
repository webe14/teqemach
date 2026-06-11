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
function jdnToEthiopian(jdn) {
    const r = (jdn - 1723856) % 1461;
    const n = r % 365 + 365 * Math.floor(r / 1460);
    const year = Math.floor((jdn - 1723856) / 1461) * 4 + Math.floor(r / 365) - Math.floor(r / 1460);
    const month = Math.floor(n / 30) + 1;
    const day = (n % 30) + 1;
    return { year, month, day };
}
const jdn = gregorianToJDN(2026, 6, 8);
console.log("JDN for 2026-06-08:", jdn);
console.log("EC for JDN:", jdnToEthiopian(jdn));
