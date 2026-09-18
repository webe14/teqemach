"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { parseEthiopianBankSms } from "@/lib/sms-parser";
import { TelegramNotifier } from "@/lib/telegram/notifier";

export async function getContributorStats(contributorId: string) {
  try {
    const supabase = await createAdminClient();

    const [membershipsRes, contributionsRes, profileRes] = await Promise.all([
      supabase
        .from("group_memberships")
        .select(`
          id,
          created_at,
          equb_groups (
            id,
            name,
            contribution_amount,
            total_days,
            frequency,
            collector:profiles!collector_id (
              full_name,
              phone_number
            )
          )
        `)
        .eq("contributor_id", contributorId),
      supabase
        .from("contributions")
        .select("id, group_id, is_marked_paid, equb_groups:group_id(contribution_amount)")
        .eq("contributor_id", contributorId),
      supabase
        .from("profiles")
        .select("status")
        .eq("id", contributorId)
        .maybeSingle(),
    ]);

    const allContributions = contributionsRes?.data || [];
    const totalCount = allContributions.length;

    // Aggregate counts per group
    const paidByGroup: Record<string, number> = {};
    const totalByGroup: Record<string, number> = {};
    const amountByGroup: Record<string, number> = {};

    let totalPaidGlobal = 0;
    let totalAmountSavedGlobal = 0;

    for (const item of allContributions as any[]) {
      const gid = item.group_id;
      if (gid) {
        totalByGroup[gid] = (totalByGroup[gid] || 0) + 1;
      }
      if (item.is_marked_paid) {
        totalPaidGlobal++;
        const amt = Number(item.equb_groups?.contribution_amount || 0);
        totalAmountSavedGlobal += amt;
        if (gid) {
          paidByGroup[gid] = (paidByGroup[gid] || 0) + 1;
          amountByGroup[gid] = (amountByGroup[gid] || 0) + amt;
        }
      }
    }

    const rawGroups: any[] = (membershipsRes?.data as any[])
      ?.map((m) => m.equb_groups || m.group)
      .filter(Boolean) ?? [];

    const groups = rawGroups.map((g) => {
      const gPaid = paidByGroup[g.id] ?? 0;
      const gTotal = g.total_days || totalByGroup[g.id] || 30;
      const gAmount = amountByGroup[g.id] ?? (gPaid * (g.contribution_amount || 0));
      const gRemaining = Math.max(0, gTotal - gPaid);

      return {
        ...g,
        paidCycles: gPaid,
        totalCycles: gTotal,
        amountSaved: gAmount,
        daysRemaining: gRemaining,
      };
    });

    const primaryGroup = groups[0] || null;
    const primaryPaid = primaryGroup?.paidCycles ?? totalPaidGlobal;
    const primaryRemaining = primaryGroup?.daysRemaining ?? 0;
    const primaryAmount = primaryGroup?.amountSaved ?? totalAmountSavedGlobal;

    return {
      amountSaved: totalAmountSavedGlobal,
      daysRemaining: primaryRemaining,
      paidCycles: primaryPaid,
      totalCycles: totalCount,
      group: primaryGroup,
      groups,
      status: profileRes?.data?.status || "active",
    };
  } catch (e) {
    console.error("Failed to load contributor stats:", e);
    return {
      amountSaved: 0,
      daysRemaining: 0,
      paidCycles: 0,
      totalCycles: 0,
      group: null,
      groups: [],
      status: "active",
    };
  }
}

export async function getContributorPaymentHistory(
  contributorId: string,
  fromDate?: string,
  toDate?: string
) {
  try {
    const supabase = await createAdminClient();
    let query = supabase
      .from("contributions")
      .select(`
        id,
        cycle_number,
        contribution_date,
        is_marked_paid,
        group_id,
        collector_id,
        created_at,
        group:equb_groups!contributions_group_id_fkey (
          id,
          name,
          contribution_amount,
          total_days,
          frequency,
          created_at
        ),
        collector:profiles!contributions_collector_id_fkey (
          full_name,
          phone_number
        )
      `)
      .eq("contributor_id", contributorId)
      .eq("is_marked_paid", true)
      .order("cycle_number", { ascending: true });

    if (fromDate) query = query.gte("contribution_date", fromDate);
    if (toDate) query = query.lte("contribution_date", toDate);

    const { data, error } = await query;
    if (error) return { error: error.message, data: [] };

    const formatted = ((data as any[]) ?? []).map((row) => ({
      ...row,
      contribution_date: row.contribution_date || row.created_at,
    }));

    return { data: formatted, error: null };
  } catch (err: any) {
    return { error: err.message, data: [] };
  }
}

export async function getContributorRules(contributorId: string) {
  try {
    const supabase = await createAdminClient();
    const { data: membership } = await supabase
      .from("group_memberships")
      .select("collector_id")
      .eq("contributor_id", contributorId)
      .limit(1)
      .maybeSingle();

    if (!membership?.collector_id) return { data: [], error: null };

    const { data, error } = await supabase
      .from("contribution_rules")
      .select("*")
      .eq("collector_id", membership.collector_id)
      .order("created_at", { ascending: false });

    if (error) return { error: error.message, data: [] };
    return { data: (data as any[]) ?? [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
}

export async function getPublicEqubGroups() {
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("equb_groups")
      .select("id, name, contribution_amount, total_days, frequency, collector_id, created_at, collector:profiles!collector_id(full_name, phone_number)")
      .order("contribution_amount", { ascending: false });

    if (error) return { error: error.message, data: [] };
    return { data: (data as any[]) ?? [], error: null };
  } catch (err: any) {
    return { error: err.message, data: [] };
  }
}

export async function getContributorJoinedGroupIds(contributorId: string) {
  try {
    if (!contributorId) return { data: [], error: null };
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("group_memberships")
      .select("group_id")
      .eq("contributor_id", contributorId);

    if (error || !data) return { data: [], error: error?.message || null };
    const groupIds = (data as any[]).map((m) => m.group_id).filter(Boolean);
    return { data: groupIds, error: null };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
}

export async function requestJoinGroup(contributorId: string, groupId: string, startDate?: string) {
  try {
    const supabase = await createAdminClient();

    if (!contributorId || !groupId) {
      return { success: false, error: "Invalid contributor or group ID." };
    }

    // 1. Get group details
    const { data: group } = await supabase
      .from("equb_groups")
      .select("id, collector_id, name, contribution_amount")
      .eq("id", groupId)
      .single();

    if (!group) {
      return { success: false, error: "Group not found." };
    }

    // 2. Prevent duplicate joining: A contributor can join 1 group only once
    const { data: existing } = await supabase
      .from("group_memberships")
      .select("id")
      .eq("contributor_id", contributorId)
      .eq("group_id", groupId)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error: "ቀድመው የዚህ እቁብ አባል ሆነዋል! (You are already a member of this Equb group.)",
      };
    }

    // 3. Fetch contributor profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, phone_number, status, collector_id")
      .eq("id", contributorId)
      .single();

    if (!profile) {
      return { success: false, error: "Contributor profile not found." };
    }

    // 4. Update collector_id on profile if missing (DO NOT reset active status back to pending!)
    if (!profile.collector_id && group.collector_id) {
      await supabase
        .from("profiles")
        .update({ collector_id: group.collector_id })
        .eq("id", contributorId);
    }

    // 5. Insert new group_membership for this group
    const membershipData: Record<string, unknown> = {
      contributor_id: contributorId,
      group_id: groupId,
      collector_id: group.collector_id || profile.collector_id,
    };
    if (startDate) {
      membershipData.created_at = startDate;
    }
    const { error: insertError } = await supabase
      .from("group_memberships")
      .insert(membershipData);

    if (insertError) {
      if (insertError.code === "23505") {
        return {
          success: false,
          error: "ቀድመው የዚህ እቁብ አባል ሆነዋል! (You are already a member of this Equb group.)",
        };
      }
      return { success: false, error: insertError.message };
    }

    // 6. Send notification to admin/collector
    try {
      const adminCollectorId = group.collector_id || profile.collector_id;
      if (adminCollectorId) {
        await supabase.from("notifications").insert({
          user_id: adminCollectorId,
          type: "contributor_request",
          title: "New Equb Joined",
          message: `${profile.full_name || "A contributor"} has joined the Equb group "${group.name}".`,
          data: {
            contributor_id: contributorId,
            contributor_name: profile.full_name,
            group_id: groupId,
            group_name: group.name,
            start_date: startDate || new Date().toISOString(),
          },
          is_read: false,
        });
      }
    } catch (notifErr) {
      console.warn("Notification insert warning in requestJoinGroup:", notifErr);
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to join group." };
  }
}

export interface PaymentSubmissionParams {
  contributorId: string;
  groupId: string;
  numberOfDays: number;
  totalAmount: number;
  txnRef: string;
  rawSms?: string;
  bankType?: string;
}

export async function submitContributorPayment({
  contributorId,
  groupId,
  numberOfDays,
  totalAmount,
  txnRef,
  rawSms = "",
  bankType = "CBE",
}: PaymentSubmissionParams) {
  try {
    const supabase = await createAdminClient();

    if (!contributorId || !groupId || numberOfDays <= 0 || totalAmount <= 0 || !txnRef?.trim()) {
      return { success: false, error: "Invalid payment details. Please check all fields." };
    }

    const cleanTxnRef = (txnRef?.trim() || `TXN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
    const cleanRawSms = rawSms.trim();

    // 1.4 STRICT DATABASE CHECK: MUST EXIST IN bank_transactions
    let bankMatch: { id: string; transaction_id: string | null; raw_message: string | null; status: string | null } | null = null;

    // A. Check in bank_transactions table by cleanTxnRef
    if (cleanTxnRef && cleanTxnRef.length >= 4) {
      try {
        const { data: bMatches } = await supabase
          .from("bank_transactions")
          .select("id, transaction_id, raw_message, received_at, amount, status")
          .or(`transaction_id.ilike.%${cleanTxnRef}%,raw_message.ilike.%${cleanTxnRef}%`)
          .order("received_at", { ascending: false })
          .limit(1);

        if (bMatches && bMatches.length > 0) {
          bankMatch = bMatches[0];
        }
      } catch (bErr) {
        console.warn("bank_transactions lookup warning:", bErr);
      }
    }

    // B. Check by alphanumeric tokens from raw SMS if direct Txn query missed
    if (!bankMatch && cleanRawSms) {
      const tokens = cleanRawSms.match(/[A-Za-z0-9_-]{6,35}/g) || [];
      for (const token of tokens) {
        if (/^(TELEBIRR|COMMERCIAL|ETHIOPIA|ACCOUNT|CURRENT|BALANCE|THANK|ETHIO|TELECOM|DEAR|RECEIVED|TRANSACTION|NUMBER|TRANSFERRED|SUCCESSFULLY|SERVICE|CHARGE|DISASTER|RECOVERY|BANKING|FORMS|MBRECIEPT|HTTPS|HTTP|FEEDBACK)$/i.test(token)) {
          continue;
        }

        try {
          const { data: bTokenMatches } = await supabase
            .from("bank_transactions")
            .select("id, transaction_id, raw_message, received_at, amount, status")
            .or(`transaction_id.ilike.%${token}%,raw_message.ilike.%${token}%`)
            .order("received_at", { ascending: false })
            .limit(1);

          if (bTokenMatches && bTokenMatches.length > 0) {
            bankMatch = bTokenMatches[0];
            break;
          }
        } catch {}
      }
    }

    // IF NOT AVAILABLE ON DATABASE -> REJECT BEFORE APPROVING
    if (!bankMatch) {
      return {
        success: false,
        error: `ይህ የክፍያ መልእክት (Txn: ${cleanTxnRef}) በዳታቤዝ ውስጥ ባለው የባንክ ኤስኤምኤስ (bank_transactions) ውስጥ አልተገኘም! እባክዎ ክፍያው ለሰብሳቢው በትክክል መድረሱን ያረጋግጡ። (Payment message was not found in the bank transactions database.)`,
      };
    }

    const matchedRef = (bankMatch.transaction_id || cleanTxnRef).trim();

    // 1.5 CHECK IF ALREADY CLAIMED (Directly on bank_transactions status)
    if (bankMatch.status === "matched") {
      return {
        success: false,
        error: `ይህ የዝውውር ቁጥር (${matchedRef}) ከዚህ በፊት ጥቅም ላይ ውሏል! (This Transaction reference has already been claimed and used.)`,
      };
    }

    try {
      const { data: duplicateNotif } = await supabase
        .from("notifications")
        .select("id, message, data")
        .or(`data->>txn_ref.eq.${cleanTxnRef},message.ilike.%${cleanTxnRef}%,data->>txn_ref.eq.${matchedRef},message.ilike.%${matchedRef}%`)
        .limit(1)
        .maybeSingle();

      if (duplicateNotif) {
        return {
          success: false,
          error: `ይህ የዝውውር ቁጥር (${matchedRef}) ከዚህ በፊት በሲስተሙ ውስጥ ተመዝግቧል! (This Transaction ID has already been recorded in the database.)`,
        };
      }
    } catch (checkErr) {
      console.warn("Duplicate check warning:", checkErr);
    }

    // 1.6 STRICT AMOUNT MATCHING: The amount on the bank transaction MUST match the totalAmount calculated for the selected days
    const dbAmount = (bankMatch as any).amount != null ? Number((bankMatch as any).amount) : NaN;
    let actualBankAmount = !isNaN(dbAmount) && dbAmount > 0 ? dbAmount : 0;

    if (!actualBankAmount && bankMatch.raw_message) {
      const parsedFromMsg = parseEthiopianBankSms(bankMatch.raw_message);
      if (parsedFromMsg.amount && parsedFromMsg.amount > 0) {
        actualBankAmount = parsedFromMsg.amount;
      }
    }

    if (actualBankAmount > 0 && Math.abs(actualBankAmount - totalAmount) > 0.01) {
      return {
        success: false,
        error: "እባክዎ ትክክለኛውን የክፍያ መጠን ያስገቡ ወይም የቀናትን ብዛት ያስተካክሉ! (Please enter exact amount or adjust the number of selected days.)",
      };
    }

    // 1. Fetch group details and verify membership
    const [groupRes, contributorRes] = await Promise.all([
      supabase
        .from("equb_groups")
        .select(`
          id,
          name,
          contribution_amount,
          total_days,
          frequency,
          collector_id,
          collector:profiles!collector_id (
            id,
            full_name,
            phone_number,
            telegram_id,
            telegram_chat_id
          )
        `)
        .eq("id", groupId)
        .single(),
      supabase
        .from("profiles")
        .select("id, full_name, phone_number, email, telegram_id, telegram_chat_id, status")
        .eq("id", contributorId)
        .single(),
    ]);

    if (!groupRes.data) {
      return { success: false, error: "Equb group not found." };
    }

    const group = groupRes.data as any;
    const contributor = contributorRes.data as any;

    if (contributor?.status === "pending") {
      return {
        success: false,
        error: "ይህ አካውንት በአድሚን ማረጋገጫ በመጠባበቅ ላይ ስለሆነ ክፍያ መፈጸም አይቻልም። እባክዎ አድሚኑ እስኪያረጋግጥልዎት ይጠብቁ። (Your account is pending admin approval. You cannot make payments until approved.)",
      };
    }

    const rate = Number(group.contribution_amount || 0);

    // 2. Fetch all existing contributions for this contributor in this group
    const { data: existingContribs } = await supabase
      .from("contributions")
      .select("id, cycle_number, is_marked_paid")
      .eq("contributor_id", contributorId)
      .eq("group_id", groupId);

    const paidCycles = new Set<number>();
    const existingMap = new Map<number, any>();

    (existingContribs || []).forEach((c: any) => {
      existingMap.set(c.cycle_number, c);
      if (c.is_marked_paid) {
        paidCycles.add(c.cycle_number);
      }
    });

    // 3. Determine the next N unpaid cycles
    const cyclesToPay: number[] = [];
    const maxDays = group.total_days || 365;

    for (let c = 1; c <= maxDays && cyclesToPay.length < numberOfDays; c++) {
      if (!paidCycles.has(c)) {
        cyclesToPay.push(c);
      }
    }

    if (cyclesToPay.length === 0) {
      return { success: false, error: "All cycles for this Equb group have already been completed!" };
    }

    const nowIso = new Date().toISOString();

    // 4. Mark or Insert each cycle as paid
    for (const cycleNum of cyclesToPay) {
      const existing = existingMap.get(cycleNum);
      if (existing) {
        await supabase
          .from("contributions")
          .update({
            is_marked_paid: true,
            contribution_date: nowIso,
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("contributions").insert({
          group_id: groupId,
          contributor_id: contributorId,
          collector_id: group.collector_id,
          cycle_number: cycleNum,
          is_marked_paid: true,
          disbursed: false,
          contribution_date: nowIso,
        });
      }
    }

    // 5. Record in payment_transactions table
    try {
      await supabase.from("payment_transactions").insert({
        contributor_id: contributorId,
        collector_id: group.collector_id,
        group_id: groupId,
        txn_ref: cleanTxnRef,
        amount: totalAmount,
        cycles_paid: cyclesToPay.length,
        cycle_numbers: cyclesToPay,
        payment_method: "CBE_TRANSFER",
        bank_type: bankType,
        raw_sms: cleanRawSms,
        status: "confirmed",
        created_at: nowIso,
      });
    } catch (txnInsertErr) {
      console.warn("payment_transactions insert warning (falling back to notifications):", txnInsertErr);
    }

    // 5.2 Mark bank_transactions record as matched/claimed
    try {
      await supabase
        .from("bank_transactions")
        .update({
          status: "matched",
          matched_contributor_id: contributorId,
        })
        .eq("id", bankMatch.id);
    } catch (updateBankErr) {
      console.warn("bank_transactions status update note:", updateBankErr);
    }

    // 5.5 Send in-app notification to collector
    try {
      await supabase.from("notifications").insert({
        user_id: group.collector_id,
        type: "approved",
        title: "New Equb Payment Received",
        message: `${contributor?.full_name || "A contributor"} paid ETB ${totalAmount.toLocaleString()} for ${cyclesToPay.length} day(s) in "${group.name}". Txn ID: ${cleanTxnRef}`,
        data: {
          txn_ref: cleanTxnRef,
          raw_sms: cleanRawSms,
          group_id: groupId,
          contributor_id: contributorId,
          cycles: cyclesToPay,
          amount: totalAmount,
        },
      });
    } catch (notifErr) {
      console.warn("Notification insert warning:", notifErr);
    }

    // 6. Resolve contributor phone and Telegram chat ID
    let contributorPhone = contributor?.phone_number || null;
    let contributorChatId: string | number | null = contributor?.telegram_chat_id || contributor?.telegram_id || null;

    // A. If phone is missing but telegram_id is known, look up phone from telegram_users
    if (!contributorPhone && contributorChatId) {
      try {
        const { data: tgUser } = await supabase
          .from("telegram_users")
          .select("phone_number")
          .eq("telegram_id", contributorChatId)
          .maybeSingle();
        if (tgUser?.phone_number) contributorPhone = tgUser.phone_number;
      } catch (err) {
        console.warn("Could not resolve phone from telegram_users:", err);
      }
    }

    // B. If telegram chat ID is missing, resolve it from telegram_users by phone number suffix or user_id
    if (!contributorChatId && contributorPhone) {
      const digits = contributorPhone.replace(/\D/g, "");
      const suffix = digits.slice(-9);
      try {
        const { data: tgUsers } = await supabase
          .from("telegram_users")
          .select("telegram_id, phone_number, user_id")
          .or(`phone_number.ilike.%${suffix}%,user_id.eq.${contributorId}`)
          .order("updated_at", { ascending: false })
          .limit(1);

        if (tgUsers && tgUsers.length > 0 && tgUsers[0].telegram_id) {
          contributorChatId = tgUsers[0].telegram_id;
          // Cache to profiles table so subsequent calls are immediate
          await supabase
            .from("profiles")
            .update({
              telegram_id: tgUsers[0].telegram_id,
              telegram_chat_id: tgUsers[0].telegram_id,
              telegram_verified: true,
            })
            .eq("id", contributorId);
        }
      } catch (err) {
        console.warn("Could not resolve telegram_user by phone:", err);
      }
    }

    // C. Format Ethiopian dates and strings
    const { gregorianToEthiopianString } = await import("@/lib/ethiopian-calendar");
    const { buildPaymentConfirmationSms } = await import("@/lib/sms-otp");
    const ethDate = gregorianToEthiopianString(new Date(), "am");
    
    let datesStr = `${cyclesToPay.length} ቀናት`;
    if (cyclesToPay.length === 1) {
      datesStr = `ቀን ${cyclesToPay[0]}`;
    } else if (cyclesToPay.length <= 4) {
      datesStr = cyclesToPay.map((c: number) => `ቀን ${c}`).join(", ");
    } else {
      datesStr = `ቀን ${cyclesToPay[0]} - ${cyclesToPay[cyclesToPay.length - 1]} (${cyclesToPay.length} ቀናት)`;
    }

    // 7. Instant Telegram Delivery to Contributor
    if (contributorChatId) {
      try {
        console.log(`[submitContributorPayment] Sending Telegram confirmation to chat ${contributorChatId} for ${contributor?.full_name}`);
        await TelegramNotifier.sendContributionConfirmation(contributorChatId, {
          contributorName: contributor?.full_name || "ውድ ደንበኛ",
          amount: totalAmount.toLocaleString(),
          groupName: group.name,
          contributionDate: ethDate,
          selectedDates: datesStr,
          totalSelected: cyclesToPay.length,
          collectorName: group.collector?.full_name || "ሰብሳቢዎ",
        });
        console.log(`[submitContributorPayment] Telegram message sent successfully to contributor.`);
      } catch (tgErr) {
        console.error("[submitContributorPayment] Error sending Telegram message to contributor:", tgErr);
      }
    }

    // 8. Instant Telegram Delivery to Collector/Admin
    const collectorChatId = group.collector?.telegram_chat_id || group.collector?.telegram_id;
    if (collectorChatId) {
      try {
        await TelegramNotifier.sendCollectorConfirmation(collectorChatId, {
          contributorName: contributor?.full_name || "ውድ ደንበኛ",
          amount: totalAmount.toLocaleString(),
          groupName: group.name,
          contributionDate: ethDate,
          selectedDates: datesStr,
          totalSelected: cyclesToPay.length,
        });
      } catch (ce) {
        console.error("[submitContributorPayment] Error sending collector confirmation:", ce);
      }
    }

    // 9. SMS Delivery (Direct API & Job Queue)
    if (contributorPhone) {
      try {
        const smsMsg = buildPaymentConfirmationSms({
          contributorName: contributor?.full_name || "ውድ ደንበኛ",
          totalAmount: totalAmount,
          ratePerCycle: rate,
          groupName: group.name,
          ethiopianDateStr: ethDate,
          selectedDatesStr: datesStr,
          daysCount: cyclesToPay.length,
          collectorName: group.collector?.full_name || "ውብ ዲጂታል እቁብ",
        });

        const digits = contributorPhone.replace(/\D/g, "");
        const formattedPhone = digits.startsWith("251")
          ? `+${digits}`
          : digits.startsWith("0")
          ? `+251${digits.slice(1)}`
          : `+251${digits}`;

        // Direct SMS Dispatch via SMS Ethiopia API if key is present
        const smsEthiopiaApiKey = process.env.SMSETHIOPIA_API_KEY;
        let directSent = false;
        if (smsEthiopiaApiKey) {
          try {
            let cleanedMsisdn = digits;
            if (cleanedMsisdn.startsWith("0")) {
              cleanedMsisdn = "251" + cleanedMsisdn.slice(1);
            } else if (cleanedMsisdn.length === 9 && (cleanedMsisdn.startsWith("9") || cleanedMsisdn.startsWith("7"))) {
              cleanedMsisdn = "251" + cleanedMsisdn;
            }

            const smsRes = await fetch("https://smsethiopia.et/api/sms/send", {
              method: "POST",
              headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "KEY": smsEthiopiaApiKey,
              },
              body: JSON.stringify({
                msisdn: cleanedMsisdn,
                text: smsMsg,
              }),
            });

            if (smsRes.ok) {
              directSent = true;
              console.log(`[submitContributorPayment] Direct SMS sent via SMS Ethiopia to ${cleanedMsisdn}`);
            } else {
              const resErr = await smsRes.json().catch(() => ({}));
              console.warn("[submitContributorPayment] Direct SMS Ethiopia response:", resErr);
            }
          } catch (apiErr) {
            console.error("[submitContributorPayment] Direct SMS Ethiopia fetch failed:", apiErr);
          }
        }

        await supabase.from("sms_jobs").insert({
          type: "payment_confirmation",
          recipient: formattedPhone,
          message: smsMsg,
          status: directSent ? "sent" : "pending",
          sent_at: directSent ? new Date().toISOString() : null,
          attempts: directSent ? 1 : 0,
          max_attempts: 3,
        });
      } catch (smsErr) {
        console.warn("[submitContributorPayment] SMS dispatch warning:", smsErr);
      }
    }

    return {
      success: true,
      error: null,
      receipt: {
        txnRef: cleanTxnRef,
        amount: totalAmount,
        cyclesPaid: cyclesToPay.length,
        cycleNumbers: cyclesToPay,
        groupId: groupId,
        groupName: group.name,
        contributorName: contributor?.full_name || "Contributor",
        contributorPhone: contributor?.phone_number || "",
        collectorName: group.collector?.full_name || "Collector",
        collectorPhone: group.collector?.phone_number || "",
        dateIso: nowIso,
        bankType,
      },
    };
  } catch (err: any) {
    console.error("submitContributorPayment error:", err);
    return { success: false, error: err.message || "Failed to submit payment." };
  }
}

export async function getContributorTransactions(contributorId: string) {
  try {
    const supabase = await createAdminClient();

    const { data: contributions, error } = await supabase
      .from("contributions")
      .select(`
        id,
        cycle_number,
        contribution_date,
        created_at,
        is_marked_paid,
        group_id,
        equb_groups:group_id (
          id,
          name,
          contribution_amount,
          total_days,
          frequency,
          collector:profiles!collector_id (
            id,
            full_name,
            phone_number
          )
        )
      `)
      .eq("contributor_id", contributorId)
      .eq("is_marked_paid", true)
      .order("contribution_date", { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    // Group individual cycles paid on the same date/timestamp into consolidated transactions
    const txMap = new Map<string, any>();

    (contributions || []).forEach((c: any) => {
      const g = c.equb_groups;
      if (!g) return;

      const dateKey = (c.contribution_date || c.created_at || "").slice(0, 16); // group by minute
      const key = `${c.group_id}_${dateKey}`;
      const amount = Number(g.contribution_amount || 0);

      if (!txMap.has(key)) {
        txMap.set(key, {
          id: c.id,
          groupId: c.group_id,
          groupName: g.name,
          frequency: g.frequency,
          collectorName: g.collector?.full_name || "Collector",
          collectorPhone: g.collector?.phone_number || "",
          rate: amount,
          totalAmount: amount,
          cycleNumbers: [c.cycle_number],
          cyclesCount: 1,
          dateIso: c.contribution_date || c.created_at,
          status: "confirmed",
          txnRef: `TXN-${c.id.slice(0, 8).toUpperCase()}`,
        });
      } else {
        const item = txMap.get(key);
        item.totalAmount += amount;
        item.cycleNumbers.push(c.cycle_number);
        item.cyclesCount += 1;
      }
    });

    const transactions = Array.from(txMap.values()).map((t) => ({
      ...t,
      cycleNumbers: t.cycleNumbers.sort((a: number, b: number) => a - b),
    }));

    return { data: transactions, error: null };
  } catch (err: any) {
    console.error("getContributorTransactions error:", err);
    return { data: [], error: err.message || "Failed to fetch transactions." };
  }
}
