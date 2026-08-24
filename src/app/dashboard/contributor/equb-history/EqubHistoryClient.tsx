"use client";

import { ChevronLeft, CheckCircle2, PlayCircle, Coins } from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export default function EqubHistoryClient({ 
  activeEqubs = [], 
  finishedEqubs = [] 
}: { 
  activeEqubs: any[], 
  finishedEqubs: any[] 
}) {
  const { t } = useLocale();

  return (
    <div className="min-h-screen bg-background pb-20 -m-4 md:-m-6 lg:-m-8 text-foreground">
      {/* Header */}
      <div className="bg-[#0f172a] text-white pt-12 pb-6 px-4 md:px-8 shadow-md rounded-b-[2rem] relative">
        <Link href="/dashboard/contributor/my-equbs" className="absolute top-10 left-4 text-white/80 hover:text-white transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-xl font-bold text-center">Equb History</h1>
        <p className="text-sm text-center text-blue-300 mt-1 opacity-90">Active and finished savings groups</p>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-10">
        
        {/* Active Equbs */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1 text-slate-800 dark:text-slate-200">
            <PlayCircle className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-bold">Active Equbs</h2>
          </div>
          
          <div className="space-y-3">
            {activeEqubs.length > 0 ? activeEqubs.map((eq, i) => (
              <div key={i} className="p-4 rounded-2xl border border-blue-500/30 bg-card shadow-sm group">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">
                      <Coins className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-card-foreground leading-tight group-hover:text-blue-500 transition-colors">{eq.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">Collector: {eq.collector?.full_name}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-xs font-semibold text-blue-400">
                        <span>ETB {eq.contribution_amount?.toLocaleString()} ({eq.frequency})</span>
                        <span>•</span>
                        <span>{eq.total_days} Days</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-full text-[11px] font-bold border border-emerald-500/20 whitespace-nowrap">
                    Active
                  </div>
                </div>
              </div>
            )) : (
              <div className="p-6 text-center text-slate-500 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
                No active equbs found.
              </div>
            )}
          </div>
        </div>

        {/* Finished Equbs */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1 text-slate-800 dark:text-slate-200">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-bold">Finished Equbs</h2>
          </div>
          
          <div className="space-y-3">
            {finishedEqubs.length > 0 ? finishedEqubs.map((eq, i) => (
              <div key={i} className="p-4 rounded-2xl border border-border bg-card shadow-sm opacity-80 hover:opacity-100 transition-opacity">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center font-bold text-sm shrink-0">
                      <Coins className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-card-foreground leading-tight">{eq.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">Collector: {eq.collector?.full_name}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-xs font-semibold text-slate-500">
                        <span>ETB {eq.contribution_amount?.toLocaleString()} ({eq.frequency})</span>
                        <span>•</span>
                        <span>{eq.total_days} Days</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-full text-[11px] font-bold border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                    Finished
                  </div>
                </div>
                {eq.completedDate && (
                  <div className="mt-3 pt-3 border-t border-border text-xs text-slate-500 text-right">
                    Completed on {eq.completedDate} (EC)
                  </div>
                )}
              </div>
            )) : (
              <div className="p-6 text-center text-slate-500 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
                No finished equbs found.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
