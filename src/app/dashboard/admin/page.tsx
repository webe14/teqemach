import { getAdminStats, getAllProfiles } from "@/lib/actions/admin";
import AdminDashboardClient from "./AdminDashboardClient";

export const metadata = { title: "Admin Overview — Teqemach" };

export default async function AdminOverviewPage() {
  const stats = await getAdminStats();
  const { data: profilesData } = await getAllProfiles();
  const profiles = (profilesData ?? []) as any[];

  const collectors = profiles.filter((p) => p.role === "collector");
  const contributors = profiles.filter((p) => p.role === "contributor");

  return (
    <AdminDashboardClient 
      stats={stats} 
      profiles={profiles} 
      collectors={collectors} 
      contributors={contributors} 
    />
  );
}
