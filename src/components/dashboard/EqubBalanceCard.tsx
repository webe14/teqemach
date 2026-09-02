"use client";

import { useState } from "react";
import { Eye, EyeOff, ShieldCheck, Coins } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface EqubBalanceCardProps {
  stats: {
    amountSaved?: number;
    daysRemaining?: number;
    paidCycles?: number;
    totalCycles?: number;
    group?: {
      id?: string;
      name?: string;
      contribution_amount?: number;
      total_days?: number;
      frequency?: string;
    } | null;
    groups?: Array<{
      id?: string;
      name?: string;
      contribution_amount?: number;
      total_days?: number;
      frequency?: string;
    }>;
  };
  todayStr?: string;
  nextCycleStr?: string;
  userName?: string;
  userId?: string;
}

export default function EqubBalanceCard({
  stats,
  todayStr = "",
  nextCycleStr = "",
  userName = "Webshet W.",
  userId = "usr_8657",
}: EqubBalanceCardProps) {
  const { t } = useLocale();
  const [showBalance, setShowBalance] = useState<boolean>(true);
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);

  // Determine active groups
  const activeGroups = stats?.groups && stats.groups.length > 0
    ? stats.groups
    : (stats?.group ? [stats.group] : []);

  const hasActiveEqub = activeGroups.length > 0;

  // Format Account number / Member ID (like 1*********8657 in CBE card)
  const cleanId = userId ? userId.replace(/[^a-zA-Z0-9]/g, "") : "8657";
  const firstChar = cleanId.charAt(0) || "1";
  const lastFour = cleanId.slice(-4) || "8657";
  const maskedAccountId = `${firstChar}*********${lastFour}`;

  // Current selected group if multiple
  const currentGroup = hasActiveEqub ? (activeGroups[activeCardIndex] || activeGroups[0]) : null;

  // Calculate total or specific group contribution
  const totalAmount = typeof stats?.amountSaved === "number" ? stats.amountSaved : 0;
  const currentAmount = currentGroup?.contribution_amount 
    ? (stats?.paidCycles || 0) * (currentGroup.contribution_amount || 0)
    : totalAmount;

  const displayAmount = (activeCardIndex === 0 && activeGroups.length > 1) 
    ? totalAmount 
    : (currentAmount || totalAmount);

  const formattedAmount = displayAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Format date display (Gregorian + Ethiopian)
  const currentDate = new Date();
  const timeFormatted = currentDate.toLocaleTimeString("en-US", { 
    hour: "2-digit", 
    minute: "2-digit", 
    hour12: true 
  });
  const dateFormatted = todayStr ? `${todayStr} ${timeFormatted}` : `${currentDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ${timeFormatted}`;

  // Slides count for dots indicator
  const totalSlides = hasActiveEqub ? Math.max(1, activeGroups.length) : 1;

  return (
    <div className="w-full space-y-3">
      {/* ─── 1. BLACK / DARK BANKING CARD CONTAINER ──────────────────────── */}
      <div 
        className="relative w-full rounded-[1.75rem] p-5 sm:p-6 text-white shadow-2xl overflow-hidden transition-all duration-300 border border-slate-700/60"
        style={{
          background: "linear-gradient(145deg, #101726 0%, #080c15 50%, #03050a 100%)",
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08) inset"
        }}
      >
        {/* Subtle World Map / Network SVG Watermark in background */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.16] mix-blend-screen bg-no-repeat bg-center bg-cover"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 500' fill='%23cbd5e1'%3E%3Cpath d='M150 120 Q180 90 230 110 T300 130 T340 180 T290 240 T210 260 T140 200 Z' /%3E%3Cpath d='M220 280 Q250 300 270 360 T250 430 T200 450 T170 380 T190 310 Z' /%3E%3Cpath d='M460 100 Q510 70 560 90 T620 120 T610 170 T550 190 T480 160 Z' /%3E%3Cpath d='M490 200 Q550 200 580 250 T560 340 T520 420 T460 360 T450 260 Z' /%3E%3Cpath d='M630 100 Q710 70 820 90 T900 160 T880 230 T780 250 T670 200 Z' /%3E%3Cpath d='M750 300 Q810 290 860 330 T850 400 T790 420 T740 370 Z' /%3E%3Ccircle cx='180' cy='150' r='3' fill='%2360a5fa' opacity='0.7'/%3E%3Ccircle cx='530' cy='280' r='3' fill='%23f59e0b' opacity='0.8'/%3E%3Ccircle cx='760' cy='160' r='3' fill='%2360a5fa' opacity='0.7'/%3E%3Ccircle cx='800' cy='350' r='3' fill='%2334d399' opacity='0.7'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-10 w-48 h-24 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-48 h-24 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* ─── CARD HEADER: GOLD LOGO & APP TITLE ────────────────────────── */}
        <div className="relative z-10 flex items-start justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            {/* Golden Teqemach Circular Coin Emblem */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 p-[1.5px] shadow-lg shadow-amber-900/40 shrink-0">
              <div className="w-full h-full rounded-full bg-[#0d1422] flex items-center justify-center border border-amber-300/30">
                <Coins className="w-5 h-5 text-amber-300" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm sm:text-base font-extrabold tracking-wide bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-400 bg-clip-text text-transparent">
                  {hasActiveEqub && currentGroup?.name ? currentGroup.name : `${t("appName")} ${t("virtualEqub")}`}
                </h3>
              </div>
              <p className="text-[10.5px] sm:text-[11px] text-amber-200/80 font-medium tracking-tight">
                {t("equbSlogan")}
              </p>
            </div>
          </div>

          {/* Active / Inactive Status Badge */}
          <div className="flex items-center gap-2 text-slate-400">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-[10px] font-semibold text-slate-300 backdrop-blur-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>{hasActiveEqub ? t("active") : t("inactive")}</span>
            </div>
          </div>
        </div>

        {/* ─── CARD CENTER: BALANCE & TOTAL CONTRIBUTION ─────────────────── */}
        <div className="relative z-10 my-4 text-center space-y-1.5 py-1">
          <p className="text-xs sm:text-sm font-semibold tracking-wider text-slate-300 uppercase">
            {t("totalContribution")}
          </p>

          {hasActiveEqub ? (
            /* Active Equb Total Balance Display with Show/Hide Eye Toggle */
            <div className="flex items-center justify-center gap-2.5">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-md">
                {showBalance ? formattedAmount : "******"}
              </span>
              <span className="text-lg sm:text-xl font-bold text-amber-400">
                {t("etb")}
              </span>
              <button
                type="button"
                onClick={() => setShowBalance(!showBalance)}
                className="p-1.5 rounded-full hover:bg-white/10 active:scale-95 text-slate-300 hover:text-white transition-all cursor-pointer"
                title={showBalance ? "Hide Balance" : "Show Balance"}
                aria-label="Toggle contribution balance visibility"
              >
                {showBalance ? (
                  <Eye className="w-5 h-5 text-slate-300 hover:text-amber-300 transition-colors" />
                ) : (
                  <EyeOff className="w-5 h-5 text-slate-400 hover:text-amber-300 transition-colors" />
                )}
              </button>
            </div>
          ) : (
            /* NO ACTIVE EQUB STATE (As requested by user) */
            <div className="space-y-2 py-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-bold shadow-inner">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                {t("noActiveEqub")}
              </div>
              <div className="flex items-center justify-center gap-2 text-slate-400">
                <span className="text-xl sm:text-2xl font-bold text-slate-300">0.00</span>
                <span className="text-sm font-semibold text-amber-400/80">{t("etb")}</span>
              </div>
              <p className="text-[11.5px] text-slate-400 max-w-xs mx-auto">
                {t("noActiveEqubDesc")}
              </p>
            </div>
          )}
        </div>

        {/* ─── CARD FOOTER: ACCOUNT NUMBER / TYPE & DATE ─────────────────── */}
        <div className="relative z-10 pt-4 mt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono">
          {/* Account Label & Masked Number */}
          <div className="flex items-center gap-2 text-amber-200/90 font-medium">
            <span className="text-slate-400">
              {t("equbAc")} - {currentGroup?.frequency ? currentGroup.frequency.toUpperCase() : "STAFF"}
            </span>
            <span className="text-white font-bold tracking-wider">
              {maskedAccountId}
            </span>
          </div>

          {/* Formatted Date & Time */}
          <div className="text-slate-400 text-[11px] sm:text-xs tracking-tight">
            {dateFormatted}
          </div>
        </div>
      </div>

      {/* ─── 2. CAROUSEL PAGINATION DOTS (MATCHING THE CBE MOCKUP) ───────── */}
      <div className="flex items-center justify-center gap-2 py-1">
        {totalSlides > 1 ? (
          Array.from({ length: totalSlides }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveCardIndex(idx)}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                activeCardIndex === idx
                  ? "w-6 h-2 bg-amber-400 shadow-md shadow-amber-400/30"
                  : "w-2 h-2 bg-slate-600 hover:bg-slate-500"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))
        ) : (
          /* Default 3-dot static layout from the picture when single equb/empty */
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400/30" />
            <span className="w-2 h-2 rounded-full bg-slate-600/70" />
            <span className="w-2 h-2 rounded-full bg-slate-600/70" />
          </div>
        )}
      </div>
    </div>
  );
}
