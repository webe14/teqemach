"use client";

import { useState } from "react";
import { StatsCard } from "@/components/ui/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Coins, 
  Clock, 
  CalendarDays, 
  TrendingUp, 
  CheckCircle2, 
  PlusCircle, 
  User, 
  Bell, 
  PhoneCall, 
  ChevronRight,
  ShieldCheck,
  Layers,
  Sparkles,
  Check
} from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { NotificationBell } from "@/components/ui/NotificationBell";
import EqubBalanceCard from "@/components/dashboard/EqubBalanceCard";
import { PaymentActionBar } from "@/components/dashboard/PaymentActionBar";
import { PayEqubModal } from "@/components/dashboard/PayEqubModal";
import { TransactionsModal } from "@/components/dashboard/TransactionsModal";

type EqubTypeCategory = "daily" | "weekly" | "monthly" | "corporate";

export default function ContributorDashboardClient({ 
  stats, 
  todayStr, 
  nextCycleStr, 
  group,
  userName = "Webshet W.",
  userId,
  allGroups = []
}: { 
  stats: any; 
  todayStr: string; 
  nextCycleStr: string; 
  group: any;
  userName?: string;
  userId?: string;
  allGroups?: any[];
}) {
  const { t } = useLocale();
  const [selectedType, setSelectedType] = useState<EqubTypeCategory>("daily");
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isTransactionsModalOpen, setIsTransactionsModalOpen] = useState(false);

  const completionPct = stats.totalCycles > 0
    ? Math.round((stats.paidCycles / stats.totalCycles) * 100)
    : 0;

  // Filter active groups based on selected type category
  const filteredGroups = allGroups.filter((g) => {
    if (selectedType === "daily") return g.frequency?.toLowerCase() === "daily" || !g.frequency;
    if (selectedType === "weekly") return g.frequency?.toLowerCase() === "weekly";
    if (selectedType === "monthly") return g.frequency?.toLowerCase() === "monthly";
    return true;
  });

  const dailyGroups = allGroups.filter(
    (g) => g.frequency?.toLowerCase() === "daily" || !g.frequency
  );

  return (
    <div className="min-h-screen bg-background pb-20 -m-4 md:-m-6 lg:-m-8 text-foreground">
      
      {/* ─── 1. TOP HEADER BANNER (GRADIENT CURVED CONTAINER) ──────────────── */}
      <div className="relative bg-gradient-to-br from-brand-900 via-brand-800 to-brand-900 text-white pt-6 pb-12 px-5 rounded-b-[2rem] shadow-xl border-b border-indigo-500/20 overflow-hidden">
        {/* Optimized GPU-friendly background radial overlay */}

        {/* Top Header Row: User Info & Icons */}
        <div className="flex items-center justify-between relative z-10 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-inner">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-indigo-200/80 font-medium tracking-wide">{t("hello")}</p>
              <h2 className="text-base font-bold text-white tracking-tight leading-tight">
                {userName}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {userId && (
              <div className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all">
                <NotificationBell userId={userId} />
              </div>
            )}
            <div className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all">
              <LanguageToggle />
            </div>
          </div>
        </div>

        {/* Banner Tagline & Title */}
        <div className="relative z-10 space-y-1">
          <span className="text-xs font-medium text-blue-300 uppercase tracking-wider block">
            {t("virtualEqub")}
          </span>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white leading-snug">
            {t("heroTitle1")} <br className="hidden sm:inline" />
            <span className="text-blue-400 font-extrabold"> {t("heroTitle2")}</span>
          </h1>
          <div className="ethiopian-divider mt-2 w-24" />
        </div>
      </div>

      {/* ─── 2. MAIN CONTAINER ────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-6 relative z-20 space-y-6">

        {/* ─── 3. EQUB / TEQEMACH TYPE SELECTION GRID (WITH DISTINCT BLUE RECTANGLES) ─── */}
        <div className="bg-card border border-border rounded-3xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-card-foreground">{t("selectType")}</h2>
              <p className="text-xs text-muted-foreground">{t("selectTypeDesc")}</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {t("fourCategories")}
            </span>
          </div>

          {/* 2x2 Grid of Equb Types with distinct Blue Separate Rectangle styling */}
          <div className="grid grid-cols-2 gap-3.5">
            
            {/* Rectangle Card 1: Daily Equb */}
            <a
              href="/dashboard/contributor/teqemachs?type=daily"
              className="text-left p-4 rounded-2xl border-2 border-blue-500/80 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-900 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] transition-all duration-200 relative overflow-hidden group block shadow-md"
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/40 shrink-0">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-sm text-blue-300 group-hover:text-white transition-colors">
                    {t("dailyEqub")}
                  </h3>
                </div>
              </div>
              <div className="pt-2 border-t border-blue-500/20 space-y-1 text-xs text-slate-300 font-medium">
                <p className="flex justify-between items-center"><span className="text-slate-400 text-[11px]">{t("equbTypeLabel")}</span> <span className="font-bold text-white">{t("automatic")}</span></p>
                <p className="flex justify-between items-center"><span className="text-slate-400 text-[11px]">{t("rateLabel")}</span> <span className="font-bold text-blue-400">{t("everyDay")}</span></p>
              </div>
            </a>

            {/* Rectangle Card 2: Weekly Equb */}
            <a
              href="/dashboard/contributor/teqemachs?type=weekly"
              className="text-left p-4 rounded-2xl border-2 border-blue-500/80 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-900 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] transition-all duration-200 relative overflow-hidden group block shadow-md"
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/40 shrink-0">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-sm text-blue-300 group-hover:text-white transition-colors">
                    {t("weeklyEqub")}
                  </h3>
                </div>
              </div>
              <div className="pt-2 border-t border-blue-500/20 space-y-1 text-xs text-slate-300 font-medium">
                <p className="flex justify-between items-center"><span className="text-slate-400 text-[11px]">{t("equbTypeLabel")}</span> <span className="font-bold text-white">{t("automatic")}</span></p>
                <p className="flex justify-between items-center"><span className="text-slate-400 text-[11px]">{t("rateLabel")}</span> <span className="font-bold text-blue-400">{t("everyWeek")}</span></p>
              </div>
            </a>

            {/* Rectangle Card 3: Monthly Equb */}
            <a
              href="/dashboard/contributor/teqemachs?type=monthly"
              className="text-left p-4 rounded-2xl border-2 border-blue-500/80 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-900 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] transition-all duration-200 relative overflow-hidden group block shadow-md"
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/40 shrink-0">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-sm text-blue-300 group-hover:text-white transition-colors">
                    {t("monthlyEqub")}
                  </h3>
                </div>
              </div>
              <div className="pt-2 border-t border-blue-500/20 space-y-1 text-xs text-slate-300 font-medium">
                <p className="flex justify-between items-center"><span className="text-slate-400 text-[11px]">{t("equbTypeLabel")}</span> <span className="font-bold text-white">{t("automatic")}</span></p>
                <p className="flex justify-between items-center"><span className="text-slate-400 text-[11px]">{t("rateLabel")}</span> <span className="font-bold text-blue-400">{t("everyMonth")}</span></p>
              </div>
            </a>

            {/* Rectangle Card 4: Corporate Equb */}
            <a
              href="/dashboard/contributor/teqemachs?type=corporate"
              className="text-left p-4 rounded-2xl border-2 border-blue-500/80 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-900 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] transition-all duration-200 relative overflow-hidden group block shadow-md"
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/40 shrink-0">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-sm text-blue-300 group-hover:text-white transition-colors">
                    {t("corporateEqub")}
                  </h3>
                </div>
              </div>
              <div className="pt-2 border-t border-blue-500/20 space-y-1 text-xs text-slate-300 font-medium">
                <p className="flex justify-between items-center"><span className="text-slate-400 text-[11px]">{t("equbTypeLabel")}</span> <span className="font-bold text-white">{t("custom")}</span></p>
                <p className="flex justify-between items-center"><span className="text-slate-400 text-[11px]">{t("rateLabel")}</span> <span className="font-bold text-blue-400">{t("custom")}</span></p>
              </div>
            </a>

          </div>
        </div>

        {/* ─── 4. CBE-STYLE ACTION BAR (PAY EQUB & TRANSACTIONS) ──────── */}
        <PaymentActionBar 
          onPayEqub={() => setIsPayModalOpen(true)}
          onTransactions={() => setIsTransactionsModalOpen(true)}
          hasActiveEqub={Boolean(stats?.group || stats?.groups?.length)}
        />

        {/* ─── 5. CBE-INSPIRED TOTAL CONTRIBUTION / BALANCE CARD ──────── */}
        <EqubBalanceCard 
          stats={stats}
          todayStr={todayStr}
          nextCycleStr={nextCycleStr}
          userName={userName}
          userId={userId}
        />

      </div>

      {/* ─── 6. INTERACTIVE MODALS ────────────────────────────────────────── */}
      <PayEqubModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        contributorId={userId || ""}
        contributorName={userName}
        contributorPhone={stats?.group?.collector?.phone_number || ""}
        activeGroups={stats?.groups?.length ? stats.groups : (stats?.group ? [stats.group] : allGroups)}
        onOpenTransactions={() => setIsTransactionsModalOpen(true)}
      />

      <TransactionsModal
        isOpen={isTransactionsModalOpen}
        onClose={() => setIsTransactionsModalOpen(false)}
        contributorId={userId || ""}
        contributorName={userName}
        onPayEqub={() => setIsPayModalOpen(true)}
      />
    </div>
  );
}

