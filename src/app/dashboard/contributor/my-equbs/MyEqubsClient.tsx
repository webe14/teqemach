"use client";

import Link from "next/link";
import { User, Users, History, Receipt, ChevronRight, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { LanguageToggle } from "@/components/ui/LanguageToggle";

interface MyEqubsClientProps {
  userName?: string;
  group?: any;
  groups?: any[];
}

export default function MyEqubsClient({ userName = "Webshet W.", group, groups = [] }: MyEqubsClientProps) {
  const { t } = useLocale();

  const activeGroups = groups && groups.length > 0 ? groups : (group ? [group] : []);

  return (
    <div className="min-h-screen bg-background dark:bg-background pb-20 -m-4 md:-m-6 lg:-m-8 text-foreground">
      
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

          <div className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all">
            <LanguageToggle />
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 relative z-20 space-y-4">
        
        {/* Conditionally render Joined Equbs or Empty State */}
        {activeGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center space-y-4 py-6">
            <div className="text-slate-500/80 dark:text-slate-600 mb-2">
              <Users className="w-20 h-20" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-medium text-slate-500 dark:text-slate-400">
                No joined equbs yet
              </h3>
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Join below to get started
              </p>
            </div>
            
            <Link href="/dashboard/contributor/teqemachs" className="w-full max-w-sm mt-4">
              <Button className="w-full h-14 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-lg shadow-md shadow-green-600/20 transition-all">
                Join Equb
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-lg font-bold text-foreground tracking-tight">
                My Active Equbs ({activeGroups.length})
              </h3>
              <Link href="/dashboard/contributor/teqemachs" className="text-xs font-bold text-primary hover:underline">
                + Join Another
              </Link>
            </div>

            <div className="space-y-3">
              {activeGroups.map((g, idx) => (
                <Link 
                  key={g.id || idx}
                  href={`/dashboard/contributor/my-equbs/${g.id}`} 
                  className="p-4 rounded-2xl border border-border bg-card hover:bg-muted/40 transition-all shadow-sm block group cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-600/30 shrink-0">
                        <Coins className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-base text-foreground leading-tight group-hover:text-primary transition-colors">
                          {g.name}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          Collector: {g.collector?.full_name || "Assigned Collector"}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-xs font-semibold text-primary">
                          <span>ETB {g.contribution_amount?.toLocaleString() || 500} ({g.frequency || 'daily'})</span>
                          <span>•</span>
                          <span>{g.total_days || 30} Days</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-full text-[11px] font-bold border border-emerald-500/20 whitespace-nowrap">
                      Active
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Action List */}
        <div className="space-y-3 max-w-sm mx-auto w-full mt-4">
          <Link href="/dashboard/contributor/equb-history" className="block">
            <div className="flex items-center justify-between bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/40 transition-all active:scale-[0.98]">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <span className="font-bold text-foreground text-[15px]">Equb History</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Link>

          <Link href="/dashboard/contributor/history" className="block">
            <div className="flex items-center justify-between bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/40 transition-all active:scale-[0.98]">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <span className="font-bold text-foreground text-[15px]">Transactions</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Link>
        </div>

      </div>
    </div>
  );
}
