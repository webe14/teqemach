"use client";

import { ArrowUpRight, ArrowDownLeft, Sparkles } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface PaymentActionBarProps {
  onPayEqub: () => void;
  onTransactions: () => void;
  hasActiveEqub?: boolean;
}

export function PaymentActionBar({
  onPayEqub,
  onTransactions,
  hasActiveEqub = true,
}: PaymentActionBarProps) {
  const { t } = useLocale();

  return (
    <div className="w-full bg-card border border-border/80 rounded-3xl p-3.5 sm:p-4 shadow-lg">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        
        {/* ─── 1. PAY EQUB (CBE TRANSFER REPLACEMENT) ────────────────────── */}
        <button
          type="button"
          onClick={onPayEqub}
          className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl border-2 border-rose-500/20 bg-gradient-to-br from-rose-500/5 via-transparent to-rose-500/10 hover:border-rose-500/50 hover:bg-rose-500/10 active:scale-[0.98] transition-all duration-200 text-left group shadow-sm"
        >
          {/* Circular Arrow Badge (Red/Coral Up Arrow like CBE Transfer) */}
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0 group-hover:bg-rose-500 group-hover:text-white transition-all shadow-sm">
            <ArrowUpRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-xs sm:text-sm text-foreground group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors truncate">
                {t("payEqub")}
              </h3>
            </div>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate mt-0.5 font-medium">
              {t("payEqubSubtitle")}
            </p>
          </div>
        </button>

        {/* ─── 2. TRANSACTIONS (RECEIVE REPLACEMENT) ────────────────────── */}
        <button
          type="button"
          onClick={onTransactions}
          className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl border-2 border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-transparent to-emerald-500/10 hover:border-emerald-500/50 hover:bg-emerald-500/10 active:scale-[0.98] transition-all duration-200 text-left group shadow-sm"
        >
          {/* Circular Arrow Badge (Green Down Arrow like CBE Receive) */}
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">
            <ArrowDownLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5 group-hover:translate-y-0.5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-xs sm:text-sm text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                {t("transactions")}
              </h3>
            </div>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate mt-0.5 font-medium">
              {t("transactionsSubtitle")}
            </p>
          </div>
        </button>

      </div>
    </div>
  );
}
