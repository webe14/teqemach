"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { TelegramNotifier } from "@/lib/telegram/notifier";
import { gregorianToEthiopianString, formatCycleDatesSummary } from "@/lib/ethiopian-calendar";
import { formatEthiopianPhone, toLocalEthiopianPhone, cleanSmsText, buildPaymentConfirmationSms } from "@/lib/sms-otp";

export async function inviteContributor(formData: {
  fullName: string;
  phoneNumber: string;
  email?: string;
  password?: string;
  telegramUsername: string;
  collectorId: string;
}) {
  const adminSupabase = await createAdminClient();

  if (formData.email) {
    // Validate email format basic
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return { error: "Invalid email format" };
    }

    // 1. Check if email already exists in legacy profiles
    const { data: existingProfile } = await adminSupabase
      .from("profiles")
      .select("id")
      .eq("email", formData.email)
      .single();

    if (existingProfile) {
      // We already have a profile with this email. Do NOT create duplicate.
      return { success: true, id: existingProfile.id };
    }
  }

  let userId: string;
  let hashedPassword = null;

  if (formData.email) {
    // 2. User does not exist, so invite via Supabase Auth
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const { data: authData, error: authError } = await adminSupabase.auth.admin.inviteUserByEmail(formData.email, {
      redirectTo: `${origin}/auth/callback?next=/auth/update-password`,
      data: {
        full_name: formData.fullName,
        phone_number: formData.phoneNumber,
      }
    });

    if (authError) {
      if (authError.message.includes("already registered") || authError.status === 422) {
        return { error: "A user with this email already exists." };
      }
      return { error: authError.message };
    }
    
    userId = authData.user.id;
    hashedPassword = await bcrypt.hash(formData.password || "defaultPassword123!", 12);
  } else {
    // Generate UUID manually since we are skipping Supabase Auth
    userId = crypto.randomUUID();
    if (formData.password) {
      hashedPassword = await bcrypt.hash(formData.password, 12);
    }
  }

  // 3. Insert new legacy profile with pending status (activated when user accepts link)
  const { data, error: profileError } = await adminSupabase
    .from("profiles")
    .insert({
      id: userId,
      full_name: formData.fullName,
      phone_number: formData.phoneNumber,
      email: formData.email || null,
      password: hashedPassword,
      telegram_username: formData.telegramUsername.replace("@", ""),
      role: "contributor",
      collector_id: formData.collectorId,
      status: "pending",
    })
    .select("id")
    .single();

  if (profileError) {
    if (formData.email) {
      await adminSupabase.auth.admin.deleteUser(userId);
    }
    return { error: profileError.message };
  }

  return { success: true, id: data.id };
}

export async function getCollectorContributors(collectorId: string) {
  const supabase = await createAdminClient();

  // Find all related collector/admin profile IDs for this user
  let collectorIds = [collectorId];
  let isAdmin = false;
  try {
    const { data: currentProf } = await supabase
      .from("profiles")
      .select("phone_number, telegram_id, email, role")
      .eq("id", collectorId)
      .single();

    if (currentProf) {
      if (currentProf.role === "admin") {
        isAdmin = true;
      }
      const orCond: string[] = [];
      if (currentProf.phone_number) orCond.push(`phone_number.eq.${currentProf.phone_number}`);
      if (currentProf.telegram_id) orCond.push(`telegram_id.eq.${currentProf.telegram_id}`);
      if (currentProf.email) orCond.push(`email.eq.${currentProf.email}`);

      if (orCond.length > 0) {
        const { data: matched } = await supabase
          .from("profiles")
          .select("id")
          .or(orCond.join(","));
        if (matched && matched.length > 0) {
          collectorIds = Array.from(new Set([...collectorIds, ...matched.map((m: any) => m.id)]));
        }
      }
    }
  } catch (err) {
    console.warn("getCollectorContributors profile resolution note:", err);
  }

  // 1. Fetch active contributor profiles
  let profQuery = supabase
    .from("profiles")
    .select("id, full_name, phone_number, email, status, created_at, collector_id")
    .eq("role", "contributor")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    profQuery = profQuery.in("collector_id", collectorIds);
  }

  const { data: profiles, error: profError } = await profQuery;
  if (profError || !profiles) {
    return { error: profError?.message || "Failed to fetch contributors", data: [] };
  }

  // 2. Fetch memberships
  let membQuery = supabase
    .from("group_memberships")
    .select(`
      id,
      group_id,
      contributor_id,
      created_at,
      collector_id,
      group:equb_groups!group_memberships_group_id_fkey(id, name, contribution_amount, total_days, frequency)
    `);

  if (!isAdmin) {
    membQuery = membQuery.in("collector_id", collectorIds);
  }

  const { data: memberships } = await membQuery;

  const membershipsByContributor: Record<string, any[]> = {};
  if (memberships) {
    for (const m of memberships) {
      if (!membershipsByContributor[m.contributor_id]) {
        membershipsByContributor[m.contributor_id] = [];
      }
      membershipsByContributor[m.contributor_id].push(m);
    }
  }

  const result: any[] = [];

  for (const p of profiles) {
    const userMemberships = membershipsByContributor[p.id];
    if (userMemberships && userMemberships.length > 0) {
      for (const m of userMemberships) {
        result.push({
          id: m.id,
          group_id: m.group_id,
          contributor_id: p.id,
          created_at: m.created_at || p.created_at,
          collector_id: m.collector_id || p.collector_id,
          contributor: {
            id: p.id,
            full_name: p.full_name,
            phone_number: p.phone_number,
            email: p.email,
            status: p.status,
          },
          group: m.group,
        });
      }
    } else {
      result.push({
        id: p.id,
        group_id: "",
        contributor_id: p.id,
        created_at: p.created_at,
        collector_id: p.collector_id,
        contributor: {
          id: p.id,
          full_name: p.full_name,
          phone_number: p.phone_number,
          email: p.email,
          status: p.status,
        },
        group: null,
      });
    }
  }

  return { data: result, error: null };
}

export async function getPendingContributors(collectorId: string) {
  const supabase = await createAdminClient();

  let collectorIds = [collectorId];
  try {
    const { data: currentProf } = await supabase
      .from("profiles")
      .select("phone_number, telegram_id, email")
      .eq("id", collectorId)
      .single();

    if (currentProf) {
      const orCond: string[] = [];
      if (currentProf.phone_number) orCond.push(`phone_number.eq.${currentProf.phone_number}`);
      if (currentProf.telegram_id) orCond.push(`telegram_id.eq.${currentProf.telegram_id}`);
      if (currentProf.email) orCond.push(`email.eq.${currentProf.email}`);

      if (orCond.length > 0) {
        const { data: matched } = await supabase
          .from("profiles")
          .select("id")
          .or(orCond.join(","));
        if (matched && matched.length > 0) {
          collectorIds = Array.from(new Set([...collectorIds, ...matched.map((m: any) => m.id)]));
        }
      }
    }
  } catch (err) {
    console.warn("getPendingContributors profile resolution note:", err);
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone_number, telegram_username, created_at")
    .in("collector_id", collectorIds)
    .eq("status", "pending")
    .eq("role", "contributor")
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, data: [] };
  return { data: (data as any[]) ?? [], error: null };
}

export async function addContributor(formData: {
  contributorId: string;
  groupId: string;
  collectorId: string;
  startDate?: string; // ISO date string for the contributor's starting date
}) {
  const supabase = await createAdminClient();

  const { data: existing } = await supabase
    .from("group_memberships")
    .select("id")
    .eq("contributor_id", formData.contributorId)
    .eq("group_id", formData.groupId)
    .maybeSingle();

  if (existing) {
    const updateData: Record<string, unknown> = { collector_id: formData.collectorId };
    if (formData.startDate) {
      updateData.created_at = formData.startDate;
    }
    const { error: updateError } = await supabase
      .from("group_memberships")
      .update(updateData)
      .eq("id", existing.id);
    if (updateError) return { error: updateError.message };
    revalidatePath("/dashboard/collector/contributors");
    return { success: true };
  }

  const insertData: Record<string, unknown> = {
    contributor_id: formData.contributorId,
    group_id: formData.groupId,
    collector_id: formData.collectorId,
  };
  if (formData.startDate) {
    insertData.created_at = formData.startDate;
  }
  const { error } = await supabase.from("group_memberships").insert(insertData);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/collector/contributors");
  return { success: true };
}

export async function updateContributor(data: {
  contributorId: string;
  membershipId: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  startDate?: string;
}) {
  const supabase = await createAdminClient();

  // Update profile info
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: data.fullName,
      phone_number: data.phoneNumber,
      email: data.email,
    })
    .eq("id", data.contributorId);

  if (profileError) return { error: profileError.message };

  // Update membership start date if provided
  if (data.startDate) {
    const { error: membershipError } = await supabase
      .from("group_memberships")
      .update({ created_at: data.startDate })
      .eq("id", data.membershipId);

    if (membershipError) return { error: membershipError.message };
  }

  revalidatePath("/dashboard/collector/contributors");
  return { success: true };
}

export async function deleteContributor(contributorId: string) {
  try {
    const supabase = await createAdminClient();

    // 1. Delete associated contributions
    await supabase
      .from("contributions")
      .delete()
      .eq("contributor_id", contributorId);

    // 2. Delete payment transactions
    try {
      await supabase
        .from("payment_transactions")
        .delete()
        .eq("contributor_id", contributorId);
    } catch {
      // Non-critical if table doesn't exist
    }

    // 3. Unlink from bank_transactions
    try {
      await supabase
        .from("bank_transactions")
        .update({ matched_contributor_id: null, status: "unmatched" })
        .eq("matched_contributor_id", contributorId);
    } catch {
      // Non-critical if column doesn't exist
    }

    // 4. Delete group memberships
    await supabase
      .from("group_memberships")
      .delete()
      .eq("contributor_id", contributorId);

    // 5. Delete notifications for or referring to this user
    try {
      await supabase
        .from("notifications")
        .delete()
        .eq("user_id", contributorId);
        
      await supabase
        .from("notifications")
        .delete()
        .filter("data->>contributor_id", "eq", contributorId);
    } catch {
      // Non-critical
    }

    // 6. Delete telegram notification preferences & otps
    try {
      await supabase
        .from("telegram_notification_prefs")
        .delete()
        .eq("user_id", contributorId);
    } catch {}

    try {
      await supabase
        .from("telegram_otps")
        .delete()
        .eq("user_id", contributorId);
    } catch {}

    // 7. Unlink from telegram_users if linked
    try {
      await supabase
        .from("telegram_users")
        .update({ user_id: null })
        .eq("user_id", contributorId);
    } catch {}

    // 8. Unlink from any profile referencing this contributor as collector
    try {
      await supabase
        .from("profiles")
        .update({ collector_id: null })
        .eq("collector_id", contributorId);
    } catch {}

    // 9. Delete the profile itself
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", contributorId);

    if (error) return { error: error.message, success: false };

    // 10. Attempt to delete auth user if exists in Supabase Auth
    try {
      await supabase.auth.admin.deleteUser(contributorId);
    } catch {}

    revalidatePath("/dashboard/admin/contributors");
    revalidatePath("/dashboard/collector/contributors");
    return { success: true, error: null };
  } catch (err: any) {
    return { error: err.message || "Failed to delete contributor", success: false };
  }
}

export async function getContributorCycles(
  contributorId: string,
  groupId?: string
) {
  const supabase = await createAdminClient();

  // Check if contributor is pending approval
  const { data: profile } = await supabase
    .from("profiles")
    .select("status, full_name")
    .eq("id", contributorId)
    .maybeSingle();

  if (profile?.status === "pending") {
    return {
      error: "ይህ ተጠቃሚ በአድሚን ማረጋገጫ በመጠባበቅ ላይ ነው። (Contributor is pending approval by admin.)",
      data: [],
      group: null,
      isPending: true,
    };
  }

  let activeGroupId = groupId;

  // If no groupId provided, find the contributor's group membership
  if (!activeGroupId) {
    const { data: mem } = await supabase
      .from("group_memberships")
      .select("group_id")
      .eq("contributor_id", contributorId)
      .limit(1)
      .maybeSingle();

    if (mem?.group_id) {
      activeGroupId = mem.group_id;
    } else {
      // Fall back to first available group and auto-enroll
      const { data: defaultGroup } = await supabase
        .from("equb_groups")
        .select("id, collector_id")
        .limit(1)
        .maybeSingle();

      if (defaultGroup) {
        activeGroupId = defaultGroup.id;
        await supabase.from("group_memberships").insert({
          contributor_id: contributorId,
          group_id: defaultGroup.id,
          collector_id: defaultGroup.collector_id || contributorId,
        });
      }
    }
  }

  if (!activeGroupId) {
    return { error: "No Equb group found", data: [], group: null, isPending: false };
  }

  // Fetch group info & membership
  const [groupRes, membershipRes] = await Promise.all([
    supabase
      .from("equb_groups")
      .select("id, created_at, frequency, total_days, contribution_amount, collector_id")
      .eq("id", activeGroupId)
      .single(),
    supabase
      .from("group_memberships")
      .select("created_at")
      .eq("contributor_id", contributorId)
      .eq("group_id", activeGroupId)
      .single(),
  ]);

  if (groupRes.error || !groupRes.data) {
    return { error: groupRes.error?.message || "Group not found", data: [], group: null, isPending: false };
  }

  // Fetch cycles
  let { data: cycles, error: cyclesError } = await supabase
    .from("contributions")
    .select("*")
    .eq("contributor_id", contributorId)
    .eq("group_id", activeGroupId)
    .order("cycle_number", { ascending: true });

  // If cycles are missing, auto-create them
  if (!cycles || cycles.length === 0) {
    await createContributionCycles(
      contributorId,
      groupRes.data.collector_id || contributorId,
      activeGroupId,
      groupRes.data.total_days
    );

    const refetched = await supabase
      .from("contributions")
      .select("*")
      .eq("contributor_id", contributorId)
      .eq("group_id", activeGroupId)
      .order("cycle_number", { ascending: true });

    cycles = refetched.data || [];
  }

  const startDate = membershipRes.data?.created_at ?? groupRes.data?.created_at;
  const group = {
    ...groupRes.data,
    created_at: startDate ?? groupRes.data.created_at,
  };

  return {
    data: (cycles as any[]) ?? [],
    group,
    error: null,
    isPending: false,
  };
}

export async function markCyclePaid(
  contributionId: string,
  groupId: string,
  cycleDateText?: string
) {
  const supabase = await createAdminClient();

  // Verify contributor is not pending
  const { data: contribRow } = await supabase
    .from("contributions")
    .select("contributor_id")
    .eq("id", contributionId)
    .maybeSingle();

  if (contribRow?.contributor_id) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", contribRow.contributor_id)
      .maybeSingle();

    if (prof?.status === "pending") {
      return { error: "ተጠቃሚው በአድሚን እስኪረጋገጥ ድረስ ክፍያ መመዝገብ አይቻልም። (Cannot record payment for a pending contributor. Please approve them first.)" };
    }
  }

  const now = new Date().toISOString();
  
  // Mark paid with transaction timestamp
  const { error, data: updatedContribution } = await supabase
    .from("contributions")
    .update({
      is_marked_paid: true,
      contribution_date: now,
    })
    .eq("id", contributionId)
    .select("contributor_id, collector_id, cycle_number")
    .single();

  if (error) return { error: error.message };
  // 2. Telegram Notification
  if (updatedContribution) {
    try {
      // Fetch related data
      const { data: details, error: detailsError } = await supabase
        .from("profiles")
        .select(`
          full_name,
          phone_number,
          telegram_chat_id,
          telegram_id,
          telegram_notification_prefs (contribution_confirmations)
        `)
        .eq("id", updatedContribution.contributor_id)
        .single();
        
      if (detailsError) {
        console.error("[markCyclePaid] Error fetching details:", detailsError);
      }
        
      const { data: group } = await supabase.from("equb_groups").select("id, name, contribution_amount, total_days, frequency, created_at").eq("id", groupId).single();
      const { data: collector } = await supabase.from("profiles").select("full_name, phone_number, telegram_chat_id, telegram_id").eq("id", updatedContribution.collector_id).single();
      
      if (group && collector) {
        const contribDateTg = gregorianToEthiopianString(new Date(now), "am");
        
        const [{ data: membershipRecord }, { data: allContribs }] = await Promise.all([
          supabase
            .from("group_memberships")
            .select("created_at")
            .eq("group_id", groupId)
            .eq("contributor_id", updatedContribution.contributor_id)
            .maybeSingle(),
          supabase
            .from("contributions")
            .select("cycle_number")
            .eq("group_id", groupId)
            .eq("contributor_id", updatedContribution.contributor_id)
            .eq("is_marked_paid", true),
        ]);

        const memberStartDate = membershipRecord?.created_at || group.created_at || new Date().toISOString();
        const paidCount = allContribs?.length || 1;

        const datesSummary = formatCycleDatesSummary({
          cycleNumbers: [updatedContribution.cycle_number],
          startDate: memberStartDate,
          frequency: group.frequency || "daily",
          totalDays: group.total_days || 365,
          totalPaidCyclesCount: paidCount,
        });

        // 1. Queue SMS text message to contributor phone SIM card (Amharic confirmation template)
        if (details?.phone_number) {
          const formattedPhone = formatEthiopianPhone(details.phone_number) || (details.phone_number.startsWith("+") ? details.phone_number : `+${details.phone_number}`);
          const smsText = buildPaymentConfirmationSms({
            contributorName: details.full_name || "ውድ ደንበኛ",
            totalAmount: group.contribution_amount,
            ratePerCycle: group.contribution_amount,
            groupName: group.name,
            ethiopianDateStr: contribDateTg,
            selectedDatesStr: datesSummary.smsSelectedDates,
            daysCount: 1,
            paidDays: datesSummary.smsPaidText,
            collectorName: collector.full_name || "ውብ ዲጂታል እቁብ",
          });

          // Direct SMS Dispatch via SMS Ethiopia API if key is present
          const smsEthiopiaApiKey = process.env.SMSETHIOPIA_API_KEY;
          let directSent = false;
          if (smsEthiopiaApiKey) {
            try {
              const digits = details.phone_number.replace(/\D/g, "");
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
                  text: smsText,
                }),
              });
              if (smsRes.ok) {
                directSent = true;
                console.log(`[markCyclePaid] Direct SMS sent via SMS Ethiopia to ${cleanedMsisdn}`);
              }
            } catch (apiErr) {
              console.error("[markCyclePaid] Direct SMS fetch failed:", apiErr);
            }
          }

          try {
            await supabase.from("sms_jobs").insert({
              type: "payment_confirmation",
              recipient: formattedPhone,
              message: smsText,
              status: directSent ? "sent" : "pending",
              sent_at: directSent ? new Date().toISOString() : null,
              attempts: directSent ? 1 : 0,
              max_attempts: 3,
            });
            console.log(`[markCyclePaid] Queued payment SMS to SIM for ${formattedPhone}`);
          } catch (smsErr) {
            console.error("[markCyclePaid] Failed to queue SMS job:", smsErr);
          }
        }

        // 2. Telegram Notification
        const prefs = Array.isArray(details?.telegram_notification_prefs) 
          ? details?.telegram_notification_prefs[0] 
          : details?.telegram_notification_prefs;
        let contributorChatId = details?.telegram_chat_id || details?.telegram_id;

        // If contributorChatId is missing, resolve it from telegram_users by phone or user_id
        if (!contributorChatId && details?.phone_number) {
          try {
            const digits = details.phone_number.replace(/\D/g, "");
            const suffix = digits.slice(-9);
            const { data: tgUsers } = await supabase
              .from("telegram_users")
              .select("telegram_id, phone_number, user_id")
              .or(`phone_number.ilike.%${suffix}%,user_id.eq.${updatedContribution.contributor_id}`)
              .order("updated_at", { ascending: false })
              .limit(1);

            if (tgUsers && tgUsers.length > 0 && tgUsers[0].telegram_id) {
              contributorChatId = tgUsers[0].telegram_id;
              await supabase
                .from("profiles")
                .update({
                  telegram_id: tgUsers[0].telegram_id,
                  telegram_chat_id: tgUsers[0].telegram_id,
                  telegram_verified: true,
                })
                .eq("id", updatedContribution.contributor_id);
            }
          } catch (resErr) {
            console.warn("[markCyclePaid] Could not resolve telegram user:", resErr);
          }
        }

        if (contributorChatId && (prefs?.contribution_confirmations ?? true)) {
          const collectorChatId = collector.telegram_chat_id || collector.telegram_id;
          console.log(`[markCyclePaid] Sending telegram to ${contributorChatId} for ${details?.full_name}`);
          const tgResult = await TelegramNotifier.sendContributionConfirmation(contributorChatId, {
            contributorName: details?.full_name || "ውድ ደንበኛ",
            amount: group.contribution_amount,
            groupName: group.name,
            contributionDate: contribDateTg,
            selectedDates: datesSummary.botSelectedDates,
            totalSelected: 1,
            paidDays: datesSummary.botPaidText,
            collectorName: collector.full_name || "ሰብሳቢዎ"
          });
          console.log("[markCyclePaid] Notification sent result:", tgResult);

          if (collectorChatId) {
            try {
              await TelegramNotifier.sendCollectorConfirmation(collectorChatId, {
                contributorName: details?.full_name || "ውድ ደንበኛ",
                amount: group.contribution_amount,
                groupName: group.name,
                contributionDate: contribDateTg,
                selectedDates: datesSummary.botSelectedDates,
                totalSelected: 1,
                paidDays: datesSummary.botPaidText,
              });
              console.log("[markCyclePaid] Collector notification sent");
            } catch (ce) {
              console.error("[markCyclePaid] Failed to send collector notification:", ce);
            }
          }
        }
      }
    } catch (e) {
      console.error("[markCyclePaid] Failed to send notification:", e);
    }
  }

  revalidatePath(`/dashboard/collector/contributors`);
  return { success: true };
}

export async function markMultipleCyclesPaid(ids: string[], cycleDateText?: string) {
  const supabase = await createAdminClient();

  // Verify that none of the cycles belong to a pending contributor
  const { data: cyclesData } = await supabase
    .from("contributions")
    .select("contributor_id")
    .in("id", ids);

  if (cyclesData && cyclesData.length > 0) {
    const cIds = [...new Set(cyclesData.map(c => c.contributor_id))];
    const { data: pendingProfs } = await supabase
      .from("profiles")
      .select("id")
      .in("id", cIds)
      .eq("status", "pending");

    if (pendingProfs && pendingProfs.length > 0) {
      return { error: "ተጠቃሚው በአድሚን እስኪረጋገጥ ድረስ ክፍያ መመዝገብ አይቻልም። (Cannot record payment for a pending contributor. Please approve them first.)" };
    }
  }

  const now = new Date().toISOString();
  
  const { error, data: updatedContributions } = await supabase
    .from("contributions")
    .update({ is_marked_paid: true, contribution_date: now })
    .in("id", ids)
    .select("id, contributor_id, collector_id, group_id, cycle_number, contribution_date");

  if (error) return { error: error.message };
  
  // Group by contributor to avoid spamming multiple messages if they paid multiple cycles
  if (updatedContributions && updatedContributions.length > 0) {
    try {
      const contributorIds = [...new Set(updatedContributions.map(c => c.contributor_id))];
      
      for (const contributorId of contributorIds) {
        const { data: details, error: detailsError } = await supabase
          .from("profiles")
          .select(`
            full_name,
            phone_number,
            telegram_chat_id,
            telegram_id,
            telegram_notification_prefs (contribution_confirmations)
          `)
          .eq("id", contributorId)
          .single();
          
        if (detailsError) {
          console.error("[markMultipleCyclesPaid] Error fetching details for", contributorId, detailsError);
        }
          
        const contributorContributions = updatedContributions.filter(c => c.contributor_id === contributorId);
        const groupId = contributorContributions[0].group_id; // Assume all cycles are for the same group (UI groups them)
        
        const { data: group } = await supabase.from("equb_groups").select("id, name, contribution_amount, total_days, frequency, created_at").eq("id", groupId).single();
        const { data: collector } = await supabase.from("profiles").select("full_name, phone_number, telegram_chat_id, telegram_id").eq("id", contributorContributions[0].collector_id).single();
        
        if (group && collector) {
          const totalAmount = group.contribution_amount * contributorContributions.length;
          const contribDateTg = gregorianToEthiopianString(new Date(now), "am");

          const [{ data: membershipRecord }, { data: allContribs }] = await Promise.all([
            supabase
              .from("group_memberships")
              .select("created_at")
              .eq("group_id", groupId)
              .eq("contributor_id", contributorId)
              .maybeSingle(),
            supabase
              .from("contributions")
              .select("cycle_number")
              .eq("group_id", groupId)
              .eq("contributor_id", contributorId)
              .eq("is_marked_paid", true),
          ]);

          const memberStartDate = membershipRecord?.created_at || group.created_at || new Date().toISOString();
          const paidCount = allContribs?.length || contributorContributions.length;
          const cycleNumbers = contributorContributions.map((c) => c.cycle_number);

          const datesSummary = formatCycleDatesSummary({
            cycleNumbers,
            startDate: memberStartDate,
            frequency: group.frequency || "daily",
            totalDays: group.total_days || 365,
            totalPaidCyclesCount: paidCount,
          });

          // 1. Queue SMS text message to contributor phone SIM card (Amharic confirmation template)
          if (details?.phone_number) {
            const formattedPhone = formatEthiopianPhone(details.phone_number) || (details.phone_number.startsWith("+") ? details.phone_number : `+${details.phone_number}`);
            const smsText = buildPaymentConfirmationSms({
              contributorName: details.full_name || "ውድ ደንበኛ",
              totalAmount: totalAmount,
              ratePerCycle: group.contribution_amount,
              groupName: group.name,
              ethiopianDateStr: contribDateTg,
              selectedDatesStr: datesSummary.smsSelectedDates,
              daysCount: contributorContributions.length,
              paidDays: datesSummary.smsPaidText,
              collectorName: collector.full_name || "ውብ ዲጂታል እቁብ",
            });

            // Direct SMS Dispatch via SMS Ethiopia API if key is present
            const smsEthiopiaApiKey = process.env.SMSETHIOPIA_API_KEY;
            let directSent = false;
            if (smsEthiopiaApiKey) {
              try {
                const digits = details.phone_number.replace(/\D/g, "");
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
                    text: smsText,
                  }),
                });
                if (smsRes.ok) {
                  directSent = true;
                  console.log(`[markMultipleCyclesPaid] Direct SMS sent via SMS Ethiopia to ${cleanedMsisdn}`);
                }
              } catch (apiErr) {
                console.error("[markMultipleCyclesPaid] Direct SMS fetch failed:", apiErr);
              }
            }

            try {
              await supabase.from("sms_jobs").insert({
                type: "payment_confirmation",
                recipient: formattedPhone,
                message: smsText,
                status: directSent ? "sent" : "pending",
                sent_at: directSent ? new Date().toISOString() : null,
                attempts: directSent ? 1 : 0,
                max_attempts: 3,
              });
              console.log(`[markMultipleCyclesPaid] Queued payment SMS to SIM for ${formattedPhone}`);
            } catch (smsErr) {
              console.error("[markMultipleCyclesPaid] Failed to queue SMS job:", smsErr);
            }
          }

          // 2. Telegram Notification
          const prefs = Array.isArray(details?.telegram_notification_prefs) 
            ? details?.telegram_notification_prefs[0] 
            : details?.telegram_notification_prefs;
          let contributorChatId = details?.telegram_chat_id || details?.telegram_id;

          // If contributorChatId is missing, resolve it from telegram_users by phone or user_id
          if (!contributorChatId && details?.phone_number) {
            try {
              const digits = details.phone_number.replace(/\D/g, "");
              const suffix = digits.slice(-9);
              const { data: tgUsers } = await supabase
                .from("telegram_users")
                .select("telegram_id, phone_number, user_id")
                .or(`phone_number.ilike.%${suffix}%,user_id.eq.${contributorId}`)
                .order("updated_at", { ascending: false })
                .limit(1);

              if (tgUsers && tgUsers.length > 0 && tgUsers[0].telegram_id) {
                contributorChatId = tgUsers[0].telegram_id;
                await supabase
                  .from("profiles")
                  .update({
                    telegram_id: tgUsers[0].telegram_id,
                    telegram_chat_id: tgUsers[0].telegram_id,
                    telegram_verified: true,
                  })
                  .eq("id", contributorId);
              }
            } catch (resErr) {
              console.warn("[markMultipleCyclesPaid] Could not resolve telegram user:", resErr);
            }
          }

          if (contributorChatId && (prefs?.contribution_confirmations ?? true)) {
            const collectorChatId = collector.telegram_chat_id || collector.telegram_id;
            console.log(`[markMultipleCyclesPaid] Sending telegram to ${contributorChatId} for ${details?.full_name}`);
            const tgResult = await TelegramNotifier.sendContributionConfirmation(contributorChatId, {
              contributorName: details?.full_name || "ውድ ደንበኛ",
              amount: totalAmount,
              groupName: group.name,
              contributionDate: contribDateTg,
              selectedDates: datesSummary.botSelectedDates,
              totalSelected: contributorContributions.length,
              paidDays: datesSummary.botPaidText,
              collectorName: collector.full_name || "ሰብሳቢዎ"
            });
            console.log("[markMultipleCyclesPaid] Notification sent result:", tgResult);

            if (collectorChatId) {
              try {
                await TelegramNotifier.sendCollectorConfirmation(collectorChatId, {
                  contributorName: details?.full_name || "ውድ ደንበኛ",
                  amount: totalAmount,
                  groupName: group.name,
                  contributionDate: contribDateTg,
                  selectedDates: datesSummary.botSelectedDates,
                  totalSelected: contributorContributions.length,
                  paidDays: datesSummary.botPaidText,
                });
                console.log("[markMultipleCyclesPaid] Collector notification sent");
              } catch (ce) {
                console.error("[markMultipleCyclesPaid] Failed to send collector notification:", ce);
              }
            }
          }
        }
      }
    } catch (e) {
      console.error("[markMultipleCyclesPaid] Failed to send notifications for multiple cycles:", e);
    }
  }

  revalidatePath(`/dashboard/collector/contributors`);
  return { success: true };
}

export async function createContributionCycles(
  contributorId: string,
  collectorId: string,
  groupId: string,
  totalDays: number
) {
  const supabase = await createAdminClient();

  // Check existing cycles for this contributor in this group
  const { data: existingCycles } = await supabase
    .from("contributions")
    .select("cycle_number")
    .eq("contributor_id", contributorId)
    .eq("group_id", groupId);

  const existingCycleNumbers = new Set((existingCycles || []).map((c) => c.cycle_number));

  const newCycles = Array.from({ length: totalDays }, (_, i) => i + 1)
    .filter((cycleNum) => !existingCycleNumbers.has(cycleNum))
    .map((cycleNum) => ({
      contributor_id: contributorId,
      collector_id: collectorId,
      group_id: groupId,
      cycle_number: cycleNum,
      is_marked_paid: false,
      disbursed: false,
      contribution_date: null,
    }));

  if (newCycles.length > 0) {
    const { error } = await supabase.from("contributions").insert(newCycles);
    if (error) return { error: error.message };
  }
  return { success: true };
}

export async function disburseFunds(groupId: string, contributorId: string) {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("contributions")
    .update({ disbursed: true })
    .eq("group_id", groupId)
    .eq("contributor_id", contributorId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/collector/contributors");
  return { success: true };
}

export async function getCollectorStats(collectorId: string) {
  const supabase = await createAdminClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [membershipsRes, paidRes, totalRes, todayPaidRes] = await Promise.all([
    supabase
      .from("group_memberships")
      .select("id", { count: "exact" })
      .eq("collector_id", collectorId),
    supabase
      .from("contributions")
      .select("id", { count: "exact" })
      .eq("collector_id", collectorId)
      .eq("is_marked_paid", true),
    supabase
      .from("contributions")
      .select("id", { count: "exact" })
      .eq("collector_id", collectorId),
    supabase
      .from("contributions")
      .select("id", { count: "exact" })
      .eq("collector_id", collectorId)
      .eq("is_marked_paid", true)
      .gte("contribution_date", todayStart.toISOString()),
  ]);

  return {
    totalContributors: membershipsRes.count ?? 0,
    paidCycles: paidRes.count ?? 0,
    totalCycles: totalRes.count ?? 0,
    todayPaid: todayPaidRes.count ?? 0,
  };
}

export async function getCollectorReports(
  collectorId: string,
  fromDate?: string,
  toDate?: string
) {
  const supabase = await createAdminClient();

  let collectorIds = [collectorId];
  try {
    const { data: currentProf } = await supabase
      .from("profiles")
      .select("phone_number, telegram_id, email")
      .eq("id", collectorId)
      .single();

    if (currentProf) {
      const orCond: string[] = [];
      if (currentProf.phone_number) orCond.push(`phone_number.eq.${currentProf.phone_number}`);
      if (currentProf.telegram_id) orCond.push(`telegram_id.eq.${currentProf.telegram_id}`);
      if (currentProf.email) orCond.push(`email.eq.${currentProf.email}`);

      if (orCond.length > 0) {
        const { data: matched } = await supabase
          .from("profiles")
          .select("id")
          .or(orCond.join(","));
        if (matched && matched.length > 0) {
          collectorIds = Array.from(new Set([...collectorIds, ...matched.map((m: any) => m.id)]));
        }
      }
    }
  } catch (err) {
    console.warn("getCollectorReports profile resolution note:", err);
  }

  let query = supabase
    .from("contributions")
    .select(
      `
      id,
      cycle_number,
      contribution_date,
      is_marked_paid,
      contributor:profiles!contributions_contributor_id_fkey(full_name, phone_number),
      group:equb_groups!contributions_group_id_fkey(name, contribution_amount)
    `
    )
    .in("collector_id", collectorIds)
    .eq("is_marked_paid", true)
    .order("contribution_date", { ascending: false });

  if (fromDate) query = query.gte("contribution_date", fromDate);
  if (toDate) query = query.lte("contribution_date", toDate);

  const { data, error } = await query;
  if (error) return { error: error.message, data: [] };
  return { data: (data as any[]) ?? [], error: null };
}

export async function getCollectorGroups(collectorId: string) {
  const supabase = await createAdminClient();

  let collectorIds = [collectorId];
  let isAdmin = false;
  try {
    const { data: currentProf } = await supabase
      .from("profiles")
      .select("phone_number, telegram_id, email, role")
      .eq("id", collectorId)
      .single();

    if (currentProf) {
      if (currentProf.role === "admin") {
        isAdmin = true;
      }
      const orCond: string[] = [];
      if (currentProf.phone_number) orCond.push(`phone_number.eq.${currentProf.phone_number}`);
      if (currentProf.telegram_id) orCond.push(`telegram_id.eq.${currentProf.telegram_id}`);
      if (currentProf.email) orCond.push(`email.eq.${currentProf.email}`);

      if (orCond.length > 0) {
        const { data: matched } = await supabase
          .from("profiles")
          .select("id")
          .or(orCond.join(","));
        if (matched && matched.length > 0) {
          collectorIds = Array.from(new Set([...collectorIds, ...matched.map((m: any) => m.id)]));
        }
      }
    }
  } catch (err) {
    console.warn("getCollectorGroups profile resolution note:", err);
  }

  let query = supabase
    .from("equb_groups")
    .select("*, group_memberships(id)")
    .order("contribution_amount", { ascending: false });

  if (!isAdmin) {
    query = query.in("collector_id", collectorIds);
  }

  const { data, error } = await query;
  if (error) return { error: error.message, data: [] };
  
  const mapped = data?.map((g: any) => ({
    ...g,
    member_count: g.group_memberships?.length || 0,
  }));
  
  return { data: mapped ?? [], error: null };
}

export async function createEqubGroup(formData: {
  name: string;
  contributionAmount: number;
  totalDays: number;
  frequency: "daily" | "weekly" | "monthly";
  collectorId: string;
}) {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("equb_groups")
    .insert({
      name: formData.name,
      contribution_amount: formData.contributionAmount,
      total_days: formData.totalDays,
      frequency: formData.frequency,
      collector_id: formData.collectorId,
    })
    .select()
    .single();
  if (error) return { error: error.message };
  return { success: true, group: data };
}

export async function updateEqubGroup(formData: {
  groupId: string;
  name: string;
  contributionAmount: number;
  totalDays: number;
  frequency: "daily" | "weekly" | "monthly";
}) {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("equb_groups")
    .update({
      name: formData.name,
      contribution_amount: formData.contributionAmount,
      total_days: formData.totalDays,
      frequency: formData.frequency,
    })
    .eq("id", formData.groupId)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard/collector/groups");
  return { success: true, group: data };
}

export async function getGroupContributors(groupId: string) {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("group_memberships")
    .select(`
      id,
      contributor:profiles!contributor_id(
        id,
        full_name,
        phone_number,
        email,
        status
      )
    `)
    .eq("group_id", groupId);
  if (error) return { error: error.message, data: [] };
  return { data: (data as any[]) ?? [], error: null };
}

export async function unmarkCyclePaid(contributionId: string, groupId: string) {
  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("contributions")
    .update({
      is_marked_paid: false,
      contribution_date: null,
    })
    .eq("id", contributionId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/collector/contributors`);
  return { success: true };
}
