import { getCurrentProfile } from "@/lib/actions/auth";
import { getContributorRules } from "@/lib/actions/contributor";
import ContributorRulesClient from "./ContributorRulesClient";

export const metadata = { title: "System Rules — Teqemach" };

export default async function ContributorRulesPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const { data: rules } = await getContributorRules(profile.id);

  return <ContributorRulesClient rules={rules} />;
}
