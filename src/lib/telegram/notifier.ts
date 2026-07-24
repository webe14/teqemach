import { telegramBot } from "./telegram";

export class TelegramNotifier {
  static async sendContributionConfirmation(chatId: string | number, data: {
    contributorName: string;
    amount: number | string;
    groupName: string;
    contributionDate: string;
    selectedDates: string;
    totalSelected: number;
    collectorName: string;
  }) {
    const text = `✅ <b>Contribution Recorded</b>

ሰላም ${data.contributorName},

ተቀማጭዎ በተሳካ ሁኔታ ተመዝግቧል

<b>ያስቀመጡት ብር መጠን:</b> ETB ${data.amount}
<b>የተቀማጩ አይነት:</b> ${data.groupName}
<b>የተመዘገበበት ቀን:</b> ${data.contributionDate}
<b>የተመረጡ ቀናት:</b> ${data.selectedDates}
<b>የቀናት ብዛት:</b> ${data.totalSelected}
<b>ተቀማጭ ሰብሳቢዎ:</b> ${data.collectorName}

በዚህ ዘመናዊ የተቀማጭ Bot ስለተጠቀሙ እናመሰግናለን!! ተጨማሪ መረጃ ለማየት ከፈለጉ mini app ውስጥ በመግባት መመልከት ይችላሉ።`;

    await telegramBot.sendMessage(chatId, text);
  }

  static async sendCollectorConfirmation(chatId: string | number, data: {
    contributorName: string;
    amount: number | string;
    groupName: string;
    contributionDate: string;
    selectedDates: string;
    totalSelected: number;
  }) {
    const text = `📥 <b>Collection Successful</b>

የመዘገቡት ተቀማጭ በተሳካ ሁኔታ ተመዝግቧል።

<b>ስም:</b> ${data.contributorName}
<b>ያስቀመጡት ብር መጠን:</b> ETB ${data.amount}
<b>የተቀማጩ አይነት:</b> ${data.groupName}
<b>የተመዘገበበት ቀን:</b> ${data.contributionDate}
<b>የተመረጡ ቀናት:</b> ${data.selectedDates}
<b>የቀናት ብዛት:</b> ${data.totalSelected}

አዋጭዎ መልእክቱ ይደርሰዋል።`;

    await telegramBot.sendMessage(chatId, text);
  }

  static async sendOTP(chatId: string | number, otpCode: string, expiryMinutes = 10) {
    const text = `🔐 <b>Teqemach Verification Code</b>

Your verification code is: <b>${otpCode}</b>

This code expires in ${expiryMinutes} minutes.
<i>Do not share this code with anyone.</i>`;

    await telegramBot.sendMessage(chatId, text);
  }

  static async sendMorningReminder(chatId: string | number, data: { name: string, groupName: string }) {
    const text = `🌅 <b>Good morning, ${data.name}!</b>

Don't forget today's contribution for your group <b>${data.groupName}</b>.`;

    await telegramBot.sendMessage(chatId, text);
  }

  static async sendMissedReminder(chatId: string | number, data: { name: string, groupName: string, daysMissed: number, collectorName: string }) {
    const text = `⚠️ <b>Missed Contribution</b>

Hello ${data.name},
You have not contributed to <b>${data.groupName}</b> for ${data.daysMissed} days. 
Please contact your collector (${data.collectorName}) to catch up on your payments.`;

    await telegramBot.sendMessage(chatId, text);
  }

  static async sendDailyReport(chatId: string | number, data: { date: string, totalContributions: number, totalAmount: number, contributorsPaid: number, totalContributors: number, missing: number, topGroup: string, topGroupAmount: number }) {
    const text = `📊 <b>Daily Report — ${data.date}</b>

<b>Total Contributions:</b> ${data.totalContributions}
<b>Total Amount:</b> ETB ${data.totalAmount.toLocaleString()}
<b>Contributors Paid:</b> ${data.contributorsPaid}/${data.totalContributors}
<b>Missing:</b> ${data.missing}

<b>Top Group:</b> ${data.topGroup} (ETB ${data.topGroupAmount.toLocaleString()})`;

    await telegramBot.sendMessage(chatId, text);
  }

  static async sendWeeklyReport(chatId: string | number, data: { dateRange: string, weeklyTotal: number, totalContributors: number, completionRate: number, topCollectors: {name: string, amount: number}[], groupsNeedingAttention: {name: string, rate: number}[] }) {
    let text = `📈 <b>Weekly Report — ${data.dateRange}</b>

<b>Weekly Total:</b> ETB ${data.weeklyTotal.toLocaleString()}
<b>Total Contributors:</b> ${data.totalContributors}
<b>Completion Rate:</b> ${data.completionRate}%

🏆 <b>Top Collectors:</b>
${data.topCollectors.map((c, i) => `${i + 1}. ${c.name} — ETB ${c.amount.toLocaleString()}`).join('\n')}

⚠️ <b>Groups Needing Attention:</b>
${data.groupsNeedingAttention.length > 0 ? data.groupsNeedingAttention.map(g => `- ${g.name} (${g.rate}% completion)`).join('\n') : "None!"}`;

    await telegramBot.sendMessage(chatId, text);
  }

  static async sendBroadcast(chatId: string | number, message: string) {
    const text = `📢 <b>Announcement</b>\n\n${message}`;
    await telegramBot.sendMessage(chatId, text);
  }
}
