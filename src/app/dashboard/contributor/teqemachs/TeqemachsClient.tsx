"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Coins, 
  Sparkles,
  ArrowLeft,
  Calendar,
  Layers,
  Building2,
  Clock
} from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { NotificationBell } from "@/components/ui/NotificationBell";

type EqubTypeCategory = "daily" | "weekly" | "monthly" | "corporate";

export default function TeqemachsClient({ 
  userName = "Webshet W.",
  userId,
  allGroups = []
}: { 
  userName?: string;
  userId?: string;
  allGroups?: any[];
}) {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const initialType = (searchParams.get("type") as EqubTypeCategory) || "daily";
  
  const [selectedType, setSelectedType] = useState<EqubTypeCategory>(initialType);

  useEffect(() => {
    const queryType = searchParams.get("type") as EqubTypeCategory;
    if (queryType && ["daily", "weekly", "monthly", "corporate"].includes(queryType)) {
      setSelectedType(queryType);
    }
  }, [searchParams]);

  // Filter active groups based on selected type category
  const filteredGroups = allGroups.filter((g) => {
    if (selectedType === "daily") return g.frequency?.toLowerCase() === "daily" || !g.frequency;
    if (selectedType === "weekly") return g.frequency?.toLowerCase() === "weekly";
    if (selectedType === "monthly") return g.frequency?.toLowerCase() === "monthly";
    return true;
  });

  const categories: { id: EqubTypeCategory; label: string; icon: any }[] = [
    { id: "daily", label: "Daily Teqemachs", icon: Clock },
    { id: "weekly", label: "Weekly Teqemachs", icon: Calendar },
    { id: "monthly", label: "Monthly Teqemachs", icon: Layers },
    { id: "corporate", label: "Corporate Teqemachs", icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 -m-4 md:-m-6 lg:-m-8 text-foreground">
      
      {/* ─── 1. TOP HEADER BANNER (GRADIENT CURVED CONTAINER) ──────────────── */}
      <div className="relative bg-gradient-to-br from-[#111827] via-[#1e1b4b] to-[#0f172a] text-white pt-6 pb-12 px-5 rounded-b-[2rem] shadow-xl border-b border-indigo-500/20 overflow-hidden">
        {/* Optimized GPU-friendly background radial overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.15),transparent_60%)] pointer-events-none" />

        {/* Top Header Row: Back Link & Icons */}
        <div className="flex items-center justify-between relative z-10 mb-6">
          <Link 
            href="/dashboard/contributor" 
            className="flex items-center gap-2 text-xs font-semibold text-blue-200 hover:text-white bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Home Dashboard
          </Link>

          <div className="flex items-center gap-2">
            {userId && (
              <div className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all">
                <NotificationBell userId={userId} />
              </div>
            )}
            <div className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all">
              <LanguageToggle />
            </div>
          </div>
        </div>

        {/* Banner Tagline & Title */}
        <div className="relative z-10 space-y-1">
          <span className="text-xs font-medium text-blue-300 uppercase tracking-wider block">
            Active Teqemach Groups
          </span>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white leading-snug">
            Available <span className="text-blue-400 font-extrabold">{selectedType.toUpperCase()}</span> Teqemachs
          </h1>
          <div className="ethiopian-divider mt-2 w-24" />
        </div>
      </div>

      {/* ─── 2. MAIN CONTAINER ────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-6 relative z-20 space-y-6">

        {/* ─── CATEGORY TAB SWITCHER PILLS ─────────────────────────────── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedType === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedType(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-blue-600/30 shadow-md"
                    : "bg-card border border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* ─── DYNAMIC TEQEMACHS LIST SECTION ("THIS PART" FROM USER SCREENSHOT) ──── */}
        <div className="bg-card border border-border rounded-3xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-card-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                {selectedType === "daily" && "Daily Teqemachs"}
                {selectedType === "weekly" && "Weekly Teqemachs"}
                {selectedType === "monthly" && "Monthly Teqemachs"}
                {selectedType === "corporate" && "Corporate Teqemachs"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Active {selectedType} savings groups available for quick join
              </p>
            </div>
            <Badge className="rounded-full text-xs font-semibold px-3 py-1 bg-blue-600 text-white">
              {(
                filteredGroups.length > 0 
                  ? filteredGroups.length 
                  : { daily: 6, weekly: 4, monthly: 3, corporate: 2 }[selectedType]
              )} Active
            </Badge>
          </div>

          {/* List items matching the user's uploaded screenshot */}
          <div className="space-y-3">
            {(filteredGroups.length > 0 ? filteredGroups.map((g) => ({
              id: g.id,
              name: g.name,
              amount: g.contribution_amount,
              days: g.total_days,
              rate: g.frequency ? `Every ${g.frequency}` : (selectedType === "daily" ? "Every daily" : selectedType === "weekly" ? "Every week" : "Every month"),
              collector: g.collector?.full_name ? `Collector: ${g.collector.full_name}` : "Collector: webshet worku"
            })) : {
              daily: [
                { id: "d1", name: "ባለ 2000", amount: 2000, days: 105, rate: "Every daily", collector: "Collector: webshet worku" },
                { id: "d2", name: "ባለ 700", amount: 700, days: 105, rate: "Every daily", collector: "Collector: webshet worku" },
                { id: "d3", name: "Test", amount: 500, days: 30, rate: "Every daily", collector: "Collector: Fikre" },
                { id: "d4", name: "100", amount: 100, days: 30, rate: "Every daily", collector: "Collector: BRUK TAYE" },
                { id: "d5", name: "100", amount: 1000, days: 105, rate: "Every daily", collector: "Collector: BRUK TAYE" },
                { id: "d6", name: "ባለ 300", amount: 300, days: 105, rate: "Every daily", collector: "Collector: webshet worku" },
              ],
              weekly: [
                { id: "w1", name: "ባለ 1000 ሳምንታዊ", amount: 1000, days: 84, rate: "Every week", collector: "Collector: webshet worku" },
                { id: "w2", name: "ባለ 2500 ሳምንታዊ", amount: 2500, days: 84, rate: "Every week", collector: "Collector: webshet worku" },
                { id: "w3", name: "Prime Weekly Equb", amount: 5000, days: 84, rate: "Every week", collector: "Collector: BRUK TAYE" },
              ],
              monthly: [
                { id: "m1", name: "Home Savings Monthly Equb", amount: 5000, days: 365, rate: "Every month", collector: "Collector: webshet worku" },
                { id: "m2", name: "Investment Monthly Equb", amount: 10000, days: 365, rate: "Every month", collector: "Collector: BRUK TAYE" },
                { id: "m3", name: "Heritage Monthly Equb", amount: 25000, days: 365, rate: "Every month", collector: "Collector: Fikre" },
              ],
              corporate: [
                { id: "c1", name: "Merchant Corporate Equb", amount: 50000, days: 180, rate: "Every month", collector: "Collector: webshet worku" },
                { id: "c2", name: "Enterprise Growth Equb", amount: 100000, days: 365, rate: "Every month", collector: "Collector: BRUK TAYE" },
              ]
            }[selectedType]).map((g) => (
              <div 
                key={g.id}
                className="p-4 rounded-2xl border border-border bg-card hover:bg-muted/30 transition-all flex items-center justify-between gap-4 shadow-sm animate-in fade-in duration-300"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-600/30 shrink-0">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-card-foreground leading-tight">{g.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{g.collector}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs font-semibold text-blue-400">
                      <span>ETB {g.amount.toLocaleString()} ({g.rate})</span>
                      <span>•</span>
                      <span>{g.days} Days</span>
                    </div>
                  </div>
                </div>

                <Button size="sm" className="rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 h-9 shadow-sm shrink-0">
                  Join
                </Button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

