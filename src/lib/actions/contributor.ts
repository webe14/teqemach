"use server";

import { createAdminClient } from "@/lib/supabase/server";

export async function getContributorStats(contributorId: string) {
  try {
    const supabase = await createAdminClient();

    const [membershipsRes, contributionsRes] = await Promise.all([
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
      ?.map((m) => m.equb_groups)
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
    };
  } catch (e) {
    console.error("Failed to load contributor stats:", e);
    return {
      amountSaved: 0,
      daysRemaining: 0,
      paidCycles: 0,
      totalCycles: 0,
      group: null,
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
      .select("id, name, contribution_amount, total_days, frequency, collector_id, created_at")
      .order("contribution_amount", { ascending: false });

    if (error) return { error: error.message, data: [] };
    return { data: (data as any[]) ?? [], error: null };
  } catch (err: any) {
    return { error: err.message, data: [] };
  }
}

export async function requestJoinGroup(contributorId: string, groupId: string, startDate?: string) {
  try {
    const supabase = await createAdminClient();

    // Get the group's collector_id and name
    const { data: group } = await supabase
      .from("equb_groups")
      .select("collector_id, name")
      .eq("id", groupId)
      .single();

    if (!group) {
      return { error: "Group not found.", success: false };
    }

    // 1. Update contributor profile status to 'pending' and set collector_id
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        status: "pending",
        collector_id: group.collector_id,
      })
      .eq("id", contributorId);

    if (profileError) return { error: profileError.message, success: false };

    // 2. Insert or update requested group_membership
    const { data: existing } = await supabase
      .from("group_memberships")
      .select("id")
      .eq("contributor_id", contributorId)
      .eq("group_id", groupId)
      .maybeSingle();

    if (!existing) {
      const membershipData: Record<string, unknown> = {
        contributor_id: contributorId,
        group_id: groupId,
        collector_id: group.collector_id,
      };
      if (startDate) {
        membershipData.created_at = startDate;
      }
      await supabase.from("group_memberships").insert(membershipData);
    } else if (startDate) {
      await supabase
        .from("group_memberships")
        .update({ created_at: startDate })
        .eq("id", existing.id);
    }

    // 3. Send a notification to the admin/collector
    try {
      await supabase.from("notifications").insert({
        user_id: group.collector_id,
        title: "New Join Request",
        body: `A contributor requested to join "${group.name}".`,
        type: "join_request",
        read: false,
      });
    } catch {
      // Non-critical
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { error: err.message, success: false };
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

    const cleanTxnRef = txnRef.trim().toUpperCase();
    const cleanRawSms = rawSms.trim();

    // 1.4 CHECK EXISTING TELEBIRR_SMS TABLE (FROM ANDROID SMS FORWARDER)
    let telebirrRecordId: any = null;
    try {
      const { data: telebirrMatch } = await supabase
        .from("telebirr_sms")
        .select("*")
        .or(`transaction_id.eq.${cleanTxnRef},txn_id.eq.${cleanTxnRef},txn_ref.eq.${cleanTxnRef},message.ilike.%${cleanTxnRef}%,sms.ilike.%${cleanTxnRef}%`)
        .limit(1)
        .maybeSingle();

      if (telebirrMatch) {
        telebirrRecordId = telebirrMatch.id;

        // Check if already claimed / used
        if (
          telebirrMatch.is_used === true ||
          telebirrMatch.status === "claimed" ||
          telebirrMatch.status === "used" ||
          telebirrMatch.claimed === true
        ) {
          return {
            success: false,
            error: "ይህ የዝውውር ቁጥር (Txn ID) ከዚህ በፊት በቴሌብር/ባንክ ኤስኤምኤስ ተረጋግጦ ጥቅም ላይ ውሏል! (This Transaction ID in telebirr_sms has already been claimed/used.)",
          };
        }

        // Check amount if present in row
        if (telebirrMatch.amount && Number(telebirrMatch.amount) < totalAmount) {
          return {
            success: false,
            error: `በቴሌብር/ባንክ የተገኘው የኤስኤምኤስ መጠን (ETB ${Number(telebirrMatch.amount).toLocaleString()}) ከሚፈለገው መጠን (ETB ${totalAmount.toLocaleString()}) ያነሰ ነው። (Received SMS amount is less than required.)`,
          };
        }
      }
    } catch (telebirrQueryErr) {
      console.warn("telebirr_sms check warning:", telebirrQueryErr);
    }

    // 1.5 CHECK IF TRANSACTION ID OR SMS RECEIPT ALREADY EXISTS IN DATABASE
    try {
      const { data: existingTxn } = await supabase
        .from("payment_transactions")
        .select("id, txn_ref, created_at")
        .eq("txn_ref", cleanTxnRef)
        .limit(1)
        .maybeSingle();

      if (existingTxn) {
        return {
          success: false,
          error: "ይህ የዝውውር ቁጥር (Txn ID) ከዚህ በፊት በሲስተሙ ውስጥ ተመዝግቧል! (This Transaction ID has already been used and recorded in the database.)",
        };
      }
    } catch {
      // Table might not exist yet; proceed to notifications check
    }

    try {
      const { data: duplicateNotif } = await supabase
        .from("notifications")
        .select("id, message, data")
        .or(`data->>txn_ref.eq.${cleanTxnRef},message.ilike.%${cleanTxnRef}%`)
        .limit(1)
        .maybeSingle();

      if (duplicateNotif) {
        return {
          success: false,
          error: "ይህ የዝውውር ቁጥር (Txn ID) ከዚህ በፊት በሲስተሙ ውስጥ ተመዝግቧል! (This Transaction ID has already been recorded in the database.)",
        };
      }
    } catch (checkErr) {
      console.warn("Duplicate check warning:", checkErr);
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
            phone_number
          )
        `)
        .eq("id", groupId)
        .single(),
      supabase
        .from("profiles")
        .select("id, full_name, phone_number, email")
        .eq("id", contributorId)
        .single(),
    ]);

    if (!groupRes.data) {
      return { success: false, error: "Equb group not found." };
    }

    const group = groupRes.data as any;
    const contributor = contributorRes.data as any;
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

    // 5.2 Mark telebirr_sms record as used/claimed
    if (telebirrRecordId) {
      try {
        await supabase
          .from("telebirr_sms")
          .update({
            is_used: true,
            status: "claimed",
          })
          .eq("id", telebirrRecordId);
      } catch (updateErr) {
        console.warn("telebirr_sms update note:", updateErr);
      }
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

    // 6. If contributor has a registered phone, queue payment confirmation SMS
    if (contributor?.phone_number) {
      try {
        const { gregorianToEthiopianString } = await import("@/lib/ethiopian-calendar");
        const ethDate = gregorianToEthiopianString(new Date(), "en");
        const smsMsg = `Dear ${contributor.full_name || "Contributor"}, your payment of ETB ${totalAmount.toLocaleString()} (${cyclesToPay.length} days) for ${group.name} is confirmed. Ref: ${cleanTxnRef}. Date: ${ethDate}. Wub Digital Equb`;
        
        await supabase.from("sms_jobs").insert({
          type: "payment_confirmation",
          recipient: contributor.phone_number,
          message: smsMsg,
          status: "pending",
          attempts: 0,
          max_attempts: 3,
        });
      } catch (smsErr) {
        console.warn("SMS queue warning:", smsErr);
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
