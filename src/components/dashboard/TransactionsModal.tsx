"use client";

import { useState, useEffect, useTransition } from "react";
import {
  X,
  Receipt,
  ArrowDownLeft,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Copy,
  Check,
  RotateCcw,
  Loader2
} from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getContributorTransactions } from "@/lib/actions/contributor";
import { formatEthiopianDate, getCurrentEthiopianDate, gregorianToEthiopianString } from "@/lib/ethiopian-calendar";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/ui/AppLogo";

interface TransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contributorId: string;
  contributorName?: string;
  onPayEqub?: () => void;
}

export function TransactionsModal({
  isOpen,
  onClose,
  contributorId,
  contributorName = "Contributor",
  onPayEqub,
}: TransactionsModalProps) {
  const { t, locale } = useLocale();
  const [isPending, startTransition] = useTransition();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && contributorId) {
      startTransition(async () => {
        const res = await getContributorTransactions(contributorId);
        if (res.data) {
          setTransactions(res.data);
        }
      });
    }
  }, [isOpen, contributorId]);

  if (!isOpen) return null;

  const filtered = transactions.filter((tx) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      tx.groupName?.toLowerCase().includes(q) ||
      tx.txnRef?.toLowerCase().includes(q) ||
      tx.collectorName?.toLowerCase().includes(q)
    );
  });

  function handleCopyTxn(ref: string) {
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-card border border-border/80 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* ─── MODAL HEADER ──────────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between bg-muted/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0 shadow-sm">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg text-foreground leading-tight">
                  {selectedReceipt ? t("receiptTitle") : t("transactions")}
                </h2>
                {!selectedReceipt && transactions.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/20">
                    {transactions.length}
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                {selectedReceipt ? "Digital Payment Confirmation" : "Complete Verified Payments & Receipts"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (selectedReceipt) {
                setSelectedReceipt(null);
              } else {
                onClose();
              }
            }}
            className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ─── MODAL BODY ────────────────────────────────────────────────── */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* VIEW A: DETAILED DIGITAL RECEIPT FOR SELECTED TRANSACTION       */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {selectedReceipt ? (
            <div className="space-y-5 animate-fadeIn">
              
              {/* CBE Official Digital Receipt Box */}
              <div className="rounded-2xl border-2 border-border/80 bg-slate-50 dark:bg-slate-900/60 p-5 space-y-4 shadow-md relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-blue-500 to-emerald-500" />
                
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <AppLogo size="sm" rounded="lg" />
                    <div>
                      <h4 className="font-bold text-xs text-foreground">Wub Digital Equb</h4>
                      <p className="text-[10px] text-muted-foreground">Payment Receipt</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold border border-emerald-500/20">
                    VERIFIED
                  </span>
                </div>

                {/* Amount Paid Big Display */}
                <div className="text-center py-2.5 bg-card rounded-xl border border-border/60">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Amount Paid
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                    ETB {selectedReceipt.totalAmount?.toLocaleString()}
                  </span>
                </div>

                {/* Line Items */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Transaction ID (Ref):</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-blue-500 dark:text-blue-400 select-all">
                        {selectedReceipt.txnRef}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyTxn(selectedReceipt.txnRef)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {copiedRef === selectedReceipt.txnRef ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Equb Group:</span>
                    <span className="font-bold text-foreground">{selectedReceipt.groupName}</span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Days Paid:</span>
                    <span className="font-bold text-foreground">
                      {selectedReceipt.cyclesCount} Day{selectedReceipt.cyclesCount > 1 ? "s" : ""}
                      {selectedReceipt.cycleNumbers?.length > 0 && ` (Cycles: #${selectedReceipt.cycleNumbers.join(", #")})`}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Collector:</span>
                    <span className="font-bold text-foreground">{selectedReceipt.collectorName}</span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-semibold text-foreground">
                      {selectedReceipt.dateIso ? new Date(selectedReceipt.dateIso).toLocaleDateString("en-GB") : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Back to list button */}
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedReceipt(null)}
                className="w-full h-12 rounded-2xl font-bold text-xs sm:text-sm border-border"
              >
                Back to Transactions
              </Button>
            </div>
          ) : (
            /* ═════════════════════════════════════════════════════════════ */
            /* VIEW B: TRANSACTIONS LIST                                    */
            /* ═════════════════════════════════════════════════════════════ */
            <div className="space-y-4">
              
              {/* Search bar */}
              {transactions.length > 3 && (
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by group or Txn ID..."
                    className="w-full h-10 pl-9 pr-4 rounded-xl border border-border bg-card text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500 shadow-sm"
                  />
                </div>
              )}

              {/* Loading Spinner */}
              {isPending ? (
                <div className="py-12 text-center text-muted-foreground space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
                  <p className="text-xs font-medium">Loading transaction records...</p>
                </div>
              ) : filtered.length === 0 ? (
                /* Empty state */
                <div className="py-12 text-center border-2 border-dashed border-border rounded-3xl p-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-muted/60 text-muted-foreground mx-auto flex items-center justify-center">
                    <Receipt className="w-6 h-6 opacity-40" />
                  </div>
                  <h4 className="font-bold text-sm text-foreground">{t("noTransactions")}</h4>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    When you make payments via CBE transfer or Telebirr, your verified transactions will appear here.
                  </p>
                  {onPayEqub && (
                    <Button
                      type="button"
                      onClick={() => {
                        onClose();
                        onPayEqub();
                      }}
                      className="mt-2 h-11 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md"
                    >
                      <ArrowUpRight className="w-4 h-4 mr-1.5" />
                      {t("payEqub")}
                    </Button>
                  )}
                </div>
              ) : (
                /* Transactions List */
                <div className="space-y-2.5">
                  {filtered.map((tx, idx) => (
                    <div
                      key={tx.id || idx}
                      onClick={() => setSelectedReceipt(tx)}
                      className="p-3.5 sm:p-4 rounded-2xl border border-border/80 bg-card hover:bg-muted/40 transition-all shadow-sm flex items-center justify-between gap-3 cursor-pointer group hover:border-emerald-500/40"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <ArrowDownLeft className="w-5 h-5" />
                        </div>

                        <div className="min-w-0">
                          <h4 className="font-bold text-xs sm:text-sm text-foreground truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {tx.groupName}
                          </h4>
                          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 font-medium">
                            <span>{tx.cyclesCount} Day{tx.cyclesCount > 1 ? "s" : ""} Paid</span>
                            <span>•</span>
                            <span className="font-mono text-[10px] text-blue-500 dark:text-blue-400">
                              {tx.txnRef}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-black text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 block">
                          + ETB {tx.totalAmount?.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-muted-foreground block mt-0.5">
                          {tx.dateIso ? new Date(tx.dateIso).toLocaleDateString("en-GB") : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
