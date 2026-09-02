"use client";

import { useState, useTransition, useEffect } from "react";
import {
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
  Loader2,
  FileText,
  Building2,
  Phone,
  Receipt,
  RotateCcw
} from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { parseEthiopianBankSms, validatePaymentWithSms, type ParsedSmsResult } from "@/lib/sms-parser";
import { submitContributorPayment } from "@/lib/actions/contributor";
import { formatEthiopianDate, getCurrentEthiopianDate } from "@/lib/ethiopian-calendar";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/ui/AppLogo";

interface PayEqubModalProps {
  isOpen: boolean;
  onClose: () => void;
  contributorId: string;
  contributorName?: string;
  contributorPhone?: string;
  activeGroups: any[];
  onPaymentSuccess?: (receipt: any) => void;
  onOpenTransactions?: () => void;
}

export function PayEqubModal({
  isOpen,
  onClose,
  contributorId,
  contributorName = "Contributor",
  contributorPhone = "",
  activeGroups = [],
  onPaymentSuccess,
  onOpenTransactions,
}: PayEqubModalProps) {
  const { t, locale } = useLocale();
  const [isPending, startTransition] = useTransition();

  // State
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [daysCount, setDaysCount] = useState<number>(1);
  const [customDays, setCustomDays] = useState<string>("");
  const [smsText, setSmsText] = useState<string>("");
  const [manualTxnRef, setManualTxnRef] = useState<string>("");
  const [copiedAccount, setCopiedAccount] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<any | null>(null);

  // Set default group when opened
  useEffect(() => {
    if (activeGroups && activeGroups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(activeGroups[0].id);
    }
  }, [activeGroups, selectedGroupId]);

  if (!isOpen) return null;

  const currentGroup = activeGroups.find((g) => g.id === selectedGroupId) || activeGroups[0] || null;
  const rate = Number(currentGroup?.contribution_amount || 500);
  const totalPayable = rate * daysCount;

  // Real-time SMS Parsing
  const parsedSms: ParsedSmsResult = parseEthiopianBankSms(smsText);
  const validation = validatePaymentWithSms(parsedSms, rate, daysCount);

  const effectiveTxnRef = parsedSms.txnRef || manualTxnRef.trim();

  // Quick day options
  const dayOptions = [1, 2, 3, 5, 7, 10, 15, 30];

  function handleSelectDays(num: number) {
    setDaysCount(num);
    setCustomDays("");
    setErrorMessage(null);
  }

  function handleCustomDaysChange(val: string) {
    setCustomDays(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setDaysCount(parsed);
    }
    setErrorMessage(null);
  }

  async function handlePasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setSmsText(text);
        setErrorMessage(null);
      }
    } catch {
      // Fallback
    }
  }

  function handleCopyCollectorAccount() {
    const accNumber = currentGroup?.collector?.phone_number || "1000458921478";
    navigator.clipboard.writeText(accNumber);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2500);
  }

  function handleReset() {
    setSmsText("");
    setManualTxnRef("");
    setReceipt(null);
    setErrorMessage(null);
    setDaysCount(1);
    setCustomDays("");
  }

  function handleSubmitPayment() {
    setErrorMessage(null);

    if (!currentGroup) {
      setErrorMessage("Please select an active Equb group.");
      return;
    }

    if (daysCount <= 0) {
      setErrorMessage("Please select at least 1 day/cycle to pay.");
      return;
    }

    if (!effectiveTxnRef) {
      setErrorMessage("Please paste a valid bank confirmation SMS or enter the Transaction ID (Txn Ref).");
      return;
    }

    if (parsedSms.amount && parsedSms.amount < totalPayable) {
      setErrorMessage(`The parsed SMS amount (ETB ${parsedSms.amount.toLocaleString()}) is less than required (ETB ${totalPayable.toLocaleString()}).`);
      return;
    }

    startTransition(async () => {
      const res = await submitContributorPayment({
        contributorId,
        groupId: currentGroup.id,
        numberOfDays: daysCount,
        totalAmount: totalPayable,
        txnRef: effectiveTxnRef,
        rawSms: smsText,
        bankType: parsedSms.bankType,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to confirm payment. Please try again.");
      } else {
        setReceipt(res.receipt);
        if (onPaymentSuccess) {
          onPaymentSuccess(res.receipt);
        }
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-card border border-border/80 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* ─── MODAL HEADER ──────────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between bg-muted/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0 shadow-sm">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-foreground leading-tight">
                {receipt ? t("receiptTitle") : t("payEqub")}
              </h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                {receipt ? "Verified Digital Confirmation" : "CBE / Telebirr Automated SMS Verification"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ─── MODAL BODY ────────────────────────────────────────────────── */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* VIEW A: CBE-STYLE DIGITAL PAYMENT RECEIPT UPON SUCCESS           */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {receipt ? (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Green Success Badge */}
              <div className="text-center space-y-2 py-3">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-500 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10 animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-extrabold text-foreground">
                  {t("paymentSuccessTitle")}
                </h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Your contribution has been verified and recorded to your active cycle ledger.
                </p>
              </div>

              {/* CBE-Inspired Official Digital Receipt Box */}
              <div className="rounded-2xl border-2 border-border/80 bg-slate-50 dark:bg-slate-900/60 p-5 space-y-3.5 shadow-md relative overflow-hidden">
                {/* Decorative Top Accent */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-blue-500 to-emerald-500" />
                
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <AppLogo size="sm" rounded="lg" />
                    <div>
                      <h4 className="font-bold text-xs text-foreground">Wub Digital Equb</h4>
                      <p className="text-[10px] text-muted-foreground">Official Payment Receipt</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold border border-emerald-500/20">
                    VERIFIED
                  </span>
                </div>

                {/* Amount Paid Big Display */}
                <div className="text-center py-2 bg-card rounded-xl border border-border/60">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Amount Paid
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                    ETB {receipt.amount?.toLocaleString()}
                  </span>
                </div>

                {/* Receipt Line Items */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Transaction ID (Ref):</span>
                    <span className="font-mono font-bold text-blue-500 dark:text-blue-400 select-all">
                      {receipt.txnRef}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Equb Group:</span>
                    <span className="font-bold text-foreground">{receipt.groupName}</span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Days Paid:</span>
                    <span className="font-bold text-foreground">
                      {receipt.cyclesPaid} Day{receipt.cyclesPaid > 1 ? "s" : ""}
                      {receipt.cycleNumbers?.length > 0 && ` (Cycles: #${receipt.cycleNumbers.join(", #")})`}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Payer Name:</span>
                    <span className="font-bold text-foreground">{receipt.contributorName}</span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Date (EC / GC):</span>
                    <span className="font-semibold text-foreground">
                      {formatEthiopianDate(getCurrentEthiopianDate())}
                    </span>
                  </div>
                </div>
              </div>

              {/* Receipt Bottom Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    handleReset();
                    onClose();
                    if (onOpenTransactions) onOpenTransactions();
                  }}
                  className="flex-1 h-12 rounded-2xl font-bold text-xs sm:text-sm border-border"
                >
                  <Receipt className="w-4 h-4 mr-1.5 text-blue-500" />
                  {t("transactions")}
                </Button>

                <Button
                  type="button"
                  onClick={() => {
                    handleReset();
                    onClose();
                  }}
                  className="flex-1 h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md"
                >
                  Done
                </Button>
              </div>

            </div>
          ) : (
            /* ═════════════════════════════════════════════════════════════ */
            /* VIEW B: PAY EQUB STEP-BY-STEP INPUT WIZARD                    */
            /* ═════════════════════════════════════════════════════════════ */
            <div className="space-y-5">
              
              {/* Error Notice */}
              {errorMessage && (
                <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-xs font-semibold text-destructive animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* ── 1. SELECT ACTIVE EQUB ─────────────────────────────────── */}
              {activeGroups.length > 1 ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-500" />
                    {t("selectEqubToPay")}
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {activeGroups.map((g) => {
                      const isSelected = g.id === selectedGroupId;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setSelectedGroupId(g.id)}
                          className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                            isSelected
                              ? "border-blue-500 bg-blue-500/10 shadow-sm"
                              : "border-border hover:bg-muted/40"
                          }`}
                        >
                          <div>
                            <p className="font-bold text-xs sm:text-sm text-foreground">{g.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              ETB {Number(g.contribution_amount).toLocaleString()} / {g.frequency || "day"}
                            </p>
                          </div>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : currentGroup ? (
                <div className="p-3.5 rounded-2xl border border-border/80 bg-muted/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block">
                      Active Equb Selected
                    </span>
                    <h4 className="font-extrabold text-sm text-foreground">{currentGroup.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ETB {rate.toLocaleString()} / {currentGroup.frequency || "day"}
                    </p>
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                    Active
                  </div>
                </div>
              ) : null}

              {/* ── 2. NUMBER OF DAYS / CYCLES TO PAY ─────────────────────── */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    {t("daysToPay")}
                  </label>
                  <span className="text-xs font-extrabold text-blue-500 dark:text-blue-400">
                    {daysCount} Day{daysCount > 1 ? "s" : ""}
                  </span>
                </div>

                {/* Day Selector Quick Pills */}
                <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                  {dayOptions.map((opt) => {
                    const isSelected = daysCount === opt && !customDays;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleSelectDays(opt)}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${
                          isSelected
                            ? "border-blue-500 bg-blue-600 text-white shadow-blue-600/20"
                            : "border-border bg-card text-foreground hover:bg-muted"
                        }`}
                      >
                        {opt} {locale === "am" ? "ቀን" : `Day${opt > 1 ? "s" : ""}`}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Days Input */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                    Custom Days:
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={customDays}
                    onChange={(e) => handleCustomDaysChange(e.target.value)}
                    placeholder="Enter days..."
                    className="h-9 flex-1 rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground focus:outline-none focus:border-blue-500 shadow-sm"
                  />
                </div>
              </div>

              {/* ── 3. TOTAL PAYABLE & COLLECTOR ACCOUNT DETAILS ──────────── */}
              <div className="p-4 rounded-2xl border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/5 via-transparent to-blue-500/10 space-y-3">
                
                {/* Total Calculated Banner */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">
                    {t("totalPayable")} ({daysCount} × ETB {rate.toLocaleString()}):
                  </span>
                  <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                    ETB {totalPayable.toLocaleString()}
                  </span>
                </div>

                <div className="ethiopian-divider w-full" />

                {/* Collector CBE Account Number Box */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-blue-500" />
                    {t("collectorAccount")} (CBE / Commercial Bank):
                  </span>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/80 shadow-sm">
                    <div>
                      <p className="font-mono font-black text-sm text-foreground select-all">
                        {currentGroup?.collector?.phone_number ? `1000${currentGroup.collector.phone_number.replace(/\D/g, "").slice(-8)}` : "1000489271452"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Account Name: {currentGroup?.collector?.full_name || "Wub Digital Equb Collector"}
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleCopyCollectorAccount}
                      className="h-8 px-2.5 rounded-lg text-xs font-bold border-blue-500/30 hover:bg-blue-500/10 text-blue-500 gap-1"
                    >
                      {copiedAccount ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedAccount ? "Copied" : t("copyAccount")}</span>
                    </Button>
                  </div>
                </div>

                <p className="text-[10.5px] text-muted-foreground leading-relaxed">
                  {t("transferInstruction")}
                </p>
              </div>

              {/* ── 4. PASTE BANK SMS MESSAGE ─────────────────────────────── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    Paste Bank Confirmation SMS:
                  </label>

                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="text-[11px] font-bold text-blue-500 hover:underline flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Paste SMS
                  </button>
                </div>

                <textarea
                  rows={3}
                  value={smsText}
                  onChange={(e) => {
                    setSmsText(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder={t("pasteSmsPlaceholder")}
                  className="w-full rounded-2xl border border-border bg-card p-3 text-xs font-mono text-foreground focus:outline-none focus:border-blue-500 shadow-sm leading-relaxed"
                />

                {/* Live Real-Time Parsed Badges */}
                {smsText.trim().length > 5 && (
                  <div className="p-3 rounded-xl border border-border/80 bg-muted/40 space-y-2 text-xs animate-fadeIn">
                    <div className="flex flex-wrap items-center gap-2">
                      
                      {/* Txn Ref Badge */}
                      <span className={`px-2.5 py-1 rounded-full font-mono text-[11px] font-bold border flex items-center gap-1 ${
                        parsedSms.txnRef
                          ? "bg-blue-500/15 text-blue-500 border-blue-500/30"
                          : "bg-amber-500/15 text-amber-600 border-amber-500/30"
                      }`}>
                        Txn Ref: {parsedSms.txnRef || "Not detected"}
                      </span>

                      {/* Amount Detected Badge */}
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] border flex items-center gap-1 ${
                        parsedSms.amount
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-muted text-muted-foreground border-border"
                      }`}>
                        Amount: {parsedSms.amount ? `ETB ${parsedSms.amount.toLocaleString()}` : "Not detected"}
                      </span>

                      {/* Bank Type */}
                      <span className="px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                        {parsedSms.bankType}
                      </span>
                    </div>

                    {/* Match Validation Message */}
                    <div className={`p-2 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 ${
                      validation.isMatch
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    }`}>
                      {validation.isMatch ? <Check className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                      <span>{validation.message}</span>
                    </div>
                  </div>
                )}

                {/* Manual Txn Ref fallback if not detected in SMS */}
                {!parsedSms.txnRef && (
                  <div className="pt-1">
                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                      Or manually enter Transaction ID (Txn Ref):
                    </label>
                    <input
                      type="text"
                      value={manualTxnRef}
                      onChange={(e) => setManualTxnRef(e.target.value.toUpperCase())}
                      placeholder="e.g. FT2609028881 or MP26090212345"
                      className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs font-mono font-bold text-foreground focus:outline-none focus:border-blue-500 shadow-sm uppercase"
                    />
                  </div>
                )}
              </div>

              {/* ── 5. CONFIRM & SUBMIT PAYMENT BUTTON ────────────────────── */}
              <Button
                type="button"
                onClick={handleSubmitPayment}
                disabled={isPending || (!parsedSms.txnRef && !manualTxnRef.trim())}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-base shadow-xl shadow-blue-600/25 transition-all active:scale-[0.98] cursor-pointer"
              >
                {isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <ShieldCheck className="w-5 h-5" />
                    <span>{t("verifyAndConfirmPayment")} (ETB {totalPayable.toLocaleString()})</span>
                  </div>
                )}
              </Button>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
