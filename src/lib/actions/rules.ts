"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addRule(formData: {
  collectorId: string;
  ruleText: string;
}) {
  if (formData.ruleText.length > 1000) {
    return { error: "Rule text cannot exceed 1000 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("contribution_rules").insert({
    collector_id: formData.collectorId,
    rule_text: formData.ruleText,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/collector/rules");
  return { success: true };
}

export async function getRulesByCollector(collectorId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contribution_rules")
    .select("*")
    .eq("collector_id", collectorId)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, data: [] };
  return { data: (data as any[]) ?? [], error: null };
}

export async function deleteRule(ruleId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("contribution_rules")
    .delete()
    .eq("id", ruleId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/collector/rules");
  return { success: true };
}
