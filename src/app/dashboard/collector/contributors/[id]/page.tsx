"use client";

import { useState, useEffect, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getCurrentProfile, getProfileById } from "@/lib/actions/auth";
import {
  getContributorCycles,
  markCyclePaid,
  markMultipleCyclesPaid,
  disburseFunds,
} from "@/lib/actions/collector";
import {
  toEthiopian,
  formatEthiopianDate,
  gregorianToEthiopianString,
} from "@/lib/ethiopian-calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Circle,
  Banknote,
  ArrowLeft,
  AlertTriangle,
  MessageSquareCheck,
  CheckSquare,
  Square,
  Layers,
} from "lucide-react";
import Link from "next/link";

type Cycle = {
  id: string;
  cycle_number: number;
  is_marked_paid: boolean;
  contribution_date: string | null;
  disbursed: boolean;
};

type GroupMeta = {
  created_at: string;
  frequency: "daily" | "weekly" | "monthly";
} | null;

type ProfileData = {
  full_name: string | null;
  phone_number: string | null;
};

/** Compute the expected date for a cycle given the group's start date and frequency */
function getCycleDate(cycleNumber: number, groupMeta: GroupMeta): Date | null {
  if (!groupMeta) return null;
  const start = new Date(groupMeta.created_at);
  const n = cycleNumber - 1; // 0-indexed offset
  switch (groupMeta.frequency) {
    case "daily":
      start.setDate(start.getDate() + n);
      break;
    case "weekly":
      start.setDate(start.getDate() + n * 7);
      break;
    case "monthly":
      start.setMonth(start.getMonth() + n);
      break;
  }
  return start;
}

/** Format a Gregorian Date as short Ethiopian "MonthName Day" */
function formatShortEC(date: Date, locale: "en" | "am"): string {
  const ec = toEthiopian(date);
  const MONTHS_EN = [
    "Mesk","Tikt","Hidr","Tahs","Tir","Yeka",
    "Mega","Miaz","Ginb","Sene","Haml","Nehe","Pagu",
  ];
  const MONTHS_AM = [
    "መስ","ጥቅ","ህዳ","ታህ","ጥር","የካ",
    "መጋ","ሚያ","ግን","ሰኔ","ሐም","ነሐ","ጳጉ",
  ];
  const months = locale === "am" ? MONTHS_AM : MONTHS_EN;
  return `${months[ec.month - 1]} ${ec.day}`;
}

// ─── Toast component ──────────────────────────────────────────────────────────
function SmsToast({
  show,
  success,
  message,
  onClose,
}: {
  show: boolean;
  success: boolean;
  message?: string;
  onClose: () => void;
}) {
  const { t } = useLocale();

  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fadeInUp">
      {success ? (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-600 text-white px-5 py-3.5 shadow-2xl shadow-emerald-600/30 border border-emerald-500">
          <MessageSquareCheck className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">{t("smsSent")}</p>
            <p className="text-xs text-emerald-100">{message || "Payment confirmation sent to contributor"}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-2 text-emerald-200 hover:text-white text-xs font-bold leading-none"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl bg-rose-600 text-white px-5 py-3.5 shadow-2xl shadow-rose-600/30 border border-rose-500">
          <AlertTriangle className="h-5 w-5 shrink-0 text-white" />
          <div>
            <p className="font-semibold text-sm">{t("smsFailed")}</p>
            <p className="text-xs text-rose-100">{message || "Could not deliver message to contributor"}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-2 text-rose-200 hover:text-white text-xs font-bold leading-none"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CycleGridPage({ params }: { params: Promise<{ id: string }> }) {
  const searchParams = useSearchParams();
  const { t, locale } = useLocale();

  const [contributorId, setContributorId] = useState<string>("");
  const [groupId, setGroupId] = useState<string>("");
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [groupMeta, setGroupMeta] = useState<GroupMeta>(null);
  const [collectorProfile, setCollectorProfile] = useState<ProfileData | null>(null);
  const [contributorProfile, setContributorProfile] = useState<ProfileData | null>(null);
  const [isPending, startTransition] = useTransition();

  // Selection mode
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Dialogs / toasts
  const [disburseDialog, setDisburseDialog] = useState(false);
  const [disburseSuccess, setDisburseSuccess] = useState(false);
  const [smsToast, setSmsToast] = useState<{ show: boolean; success: boolean; message?: string }>({
    show: false,
    success: true,
    message: "",
  });
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(30);

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const resolvedParams = await params;
      const cid = resolvedParams.id;
      const gid = searchParams.get("groupId") ?? "";
      setContributorId(cid);
      setGroupId(gid);

      const profile = await getCurrentProfile();
      if (!profile) return;

      const [cyclesRes, collectorRes, contributorRes] = await Promise.all([
        getContributorCycles(cid, gid),
        getProfileById(profile.id),
        getProfileById(cid),
      ]);

      setCycles((cyclesRes.data as Cycle[]) ?? []);
      setGroupMeta((cyclesRes as any).group ?? null);
      setCollectorProfile(collectorRes.data as any);
      setContributorProfile(contributorRes.data as any);
    })();
  }, [params, searchParams]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  async function sendSmsAndNotify(targetCycles?: Cycle[]) {
    if (!contributorProfile || !collectorProfile) return;

    let dateText = "";
    if (targetCycles && targetCycles.length > 0) {
      const dateLabels = targetCycles.map((cycle) => {
        const cycleDate = getCycleDate(cycle.cycle_number, groupMeta);
        return cycleDate
          ? formatShortEC(cycleDate, locale)
          : `#${cycle.cycle_number}`;
      });
      dateText = dateLabels.join(", ");
    } else {
      dateText = gregorianToEthiopianString(new Date(), locale);
    }

    const message = t("smsContributionMessage", {
      contributorName: contributorProfile.full_name ?? "Contributor",
      collectorName: collectorProfile.full_name ?? "Collector",
      date: dateText,
    });
    try {
      const res = await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: contributorProfile.phone_number,
          message,
          type: "contribution",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setSmsToast({ show: true, success: true });
      } else {
        setSmsToast({ 
          show: true, 
          success: false, 
          message: data.error || "Could not deliver message to contributor" 
        });
      }
    } catch (e: any) {
      setSmsToast({ 
        show: true, 
        success: false, 
        message: e.message || "Failed to communicate with SMS server" 
      });
    }
  }

  async function refreshCycles(cid: string, gid: string) {
    const res = await getContributorCycles(cid, gid);
    setCycles((res.data as Cycle[]) ?? []);
    if ((res as any).group) setGroupMeta((res as any).group);
  }

  // ── Single cycle mark ─────────────────────────────────────────────────────
  async function handleMarkPaid(cycle: Cycle) {
    if (cycle.is_marked_paid || isPending) return;
    if (bulkMode) {
      // In bulk mode: toggle selection
      setSelected((prev) => {
        const next = new Set(prev);
        next.has(cycle.id) ? next.delete(cycle.id) : next.add(cycle.id);
        return next;
      });
      return;
    }
    setMarkingId(cycle.id);
    startTransition(async () => {
      const cycleDate = getCycleDate(cycle.cycle_number, groupMeta);
      const dateText = cycleDate ? formatShortEC(cycleDate, locale) : `#${cycle.cycle_number}`;

      const result = await markCyclePaid(cycle.id, groupId, dateText);
      if (!result.error) {
        await refreshCycles(contributorId, groupId);
        await sendSmsAndNotify([cycle]);
      }
      setMarkingId(null);
    });
  }

  // ── Bulk mark ─────────────────────────────────────────────────────────────
  function handleBulkConfirm() {
    if (selected.size === 0) return;
    const selectedCycles = cycles.filter((c) => selected.has(c.id));
    startTransition(async () => {
      const dateLabels = selectedCycles.map((cycle) => {
        const cycleDate = getCycleDate(cycle.cycle_number, groupMeta);
        return cycleDate ? formatShortEC(cycleDate, locale) : `#${cycle.cycle_number}`;
      });
      const dateText = dateLabels.join(", ");

      const result = await markMultipleCyclesPaid(Array.from(selected), dateText);
      if (!result.error) {
        await refreshCycles(contributorId, groupId);
        await sendSmsAndNotify(selectedCycles);
      }
      setSelected(new Set());
      setBulkMode(false);
    });
  }

  // ── Disburse ──────────────────────────────────────────────────────────────
  async function handleDisburse() {
    startTransition(async () => {
      const result = await disburseFunds(groupId, contributorId);
      if (!result.error) {
        try {
          const res = await fetch("/api/sms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone: contributorProfile?.phone_number,
              message: t("smsDisburseMessage"),
              type: "disburse",
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.success) {
            setSmsToast({ show: true, success: true, message: "Disbursement SMS sent!" });
          } else {
            setSmsToast({ 
              show: true, 
              success: false, 
              message: data.error || "Could not send disbursement SMS" 
            });
          }
        } catch (e: any) {
          setSmsToast({ 
            show: true, 
            success: false, 
            message: e.message || "Failed to send disbursement SMS" 
          });
        }
        setDisburseSuccess(true);
        await refreshCycles(contributorId, groupId);
      }
      setDisburseDialog(false);
    });
  }

  // ── Derived stats ─────────────────────────────────────────────────────────
  const paidCount = cycles.filter((c) => c.is_marked_paid).length;
  const totalCount = cycles.length;
  const progress = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;
  const isFullyDisbursed = totalCount > 0 && cycles.every((c) => c.disbursed);
  const unpaidCycles = cycles.filter((c) => !c.is_marked_paid);

  return (
    <div className="space-y-6 stagger-children">
      <SmsToast
        show={smsToast.show}
        success={smsToast.success}
        message={smsToast.message}
        onClose={() => setSmsToast((prev) => ({ ...prev, show: false }))}
      />

      {/* Back + header */}
      <div className="flex items-start gap-4">
        <Link href="/dashboard/collector/contributors">
          <Button variant="ghost" size="icon" className="mt-1">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">
            {contributorProfile?.full_name ?? "Contributor"} — Cycle Grid
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {contributorProfile?.phone_number} · {totalCount} total cycles
            {groupMeta && (
              <span className="ml-2 capitalize text-primary/70">· {groupMeta.frequency}</span>
            )}
          </p>
          <div className="ethiopian-divider mt-3 w-24" />
        </div>
      </div>

      {/* Progress */}
      <Card className="border-primary/20 gradient-card">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">{t("collectionProgress")}</span>
            <span className="text-lg font-bold text-primary">{progress}%</span>
          </div>
          <Progress
            value={progress}
            className="h-3"
            indicatorClassName="bg-gradient-to-r from-indigo-500 to-violet-600"
          />
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> {paidCount} Paid
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Circle className="h-3.5 w-3.5" /> {totalCount - paidCount} Remaining
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Cycle Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base">{t("cycleGrid")}</CardTitle>
              <CardDescription>
                {bulkMode
                  ? `${selected.size} selected — click cycles to toggle`
                  : "Click a cycle to mark paid, or use Bulk Select"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {bulkMode ? (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setBulkMode(false); setSelected(new Set()); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      // Select all unpaid
                      setSelected(new Set(unpaidCycles.map((c) => c.id)));
                    }}
                  >
                    <CheckSquare className="h-4 w-4 mr-1" />
                    Select All
                  </Button>
                  <Button
                    size="sm"
                    disabled={selected.size === 0 || isPending}
                    onClick={handleBulkConfirm}
                    className="gap-1"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Mark {selected.size} Paid
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBulkMode(true)}
                  disabled={unpaidCycles.length === 0}
                  className="gap-1"
                >
                  <Layers className="h-4 w-4" />
                  Bulk Select
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {cycles.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">{t("noCyclesGenerated")}</div>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {cycles.slice(0, visibleLimit).map((cycle) => {
                  const isLoading = markingId === cycle.id;
                  const isSelected = selected.has(cycle.id);
                  const cycleDate = getCycleDate(cycle.cycle_number, groupMeta);
                  const dateLabel = cycleDate
                    ? formatShortEC(cycleDate, locale)
                    : `#${cycle.cycle_number}`;

                  return (
                    <button
                      key={cycle.id}
                      onClick={() => handleMarkPaid(cycle)}
                      disabled={(cycle.is_marked_paid && !bulkMode) || (!bulkMode && isPending)}
                      className={`
                        relative flex flex-col items-center justify-center rounded-xl p-2 text-[11px] font-semibold
                        transition-all duration-150 aspect-square border-2
                        ${cycle.is_marked_paid
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 cursor-default"
                          : isSelected
                          ? "bg-indigo-500/15 border-indigo-500 text-indigo-700 scale-105 shadow-lg"
                          : "bg-muted/50 border-border hover:border-primary hover:bg-primary/5 hover:text-primary cursor-pointer hover:scale-105 active:scale-95"
                        }
                        ${isLoading ? "animate-pulse" : ""}
                      `}
                      title={
                        cycle.is_marked_paid && cycle.contribution_date
                          ? `Paid: ${gregorianToEthiopianString(new Date(cycle.contribution_date), locale)}`
                          : cycleDate
                          ? `Cycle #${cycle.cycle_number} — ${formatEthiopianDate(toEthiopian(cycleDate), locale)}`
                          : `Cycle #${cycle.cycle_number}`
                      }
                    >
                      {/* Status icon */}
                      <span className="mb-0.5">
                        {cycle.is_marked_paid ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : isSelected ? (
                          <CheckSquare className="h-3.5 w-3.5 text-indigo-500" />
                        ) : bulkMode ? (
                          <Square className="h-3.5 w-3.5 opacity-40" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 opacity-30" />
                        )}
                      </span>

                      {/* Month + Day label */}
                      <span className="leading-tight text-center">{dateLabel}</span>

                      {/* Paid dot */}
                      {cycle.is_marked_paid && cycle.contribution_date && (
                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-500" />
                      )}
                      {/* Selected dot */}
                      {isSelected && (
                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-indigo-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              {cycles.length > 30 && (
                <div className="flex justify-center gap-4 pt-2">
                  {cycles.length > visibleLimit && (
                    <Button
                      variant="outline"
                      onClick={() => setVisibleLimit((prev) => prev + 30)}
                      className="gap-2 px-6 rounded-xl border-primary/30 hover:border-primary text-primary hover:bg-primary/5 transition-all animate-fadeIn"
                    >
                      {locale === "am" ? "ተጨማሪ አሳይ" : "See More"}
                    </Button>
                  )}
                  {visibleLimit > 30 && (
                    <Button
                      variant="outline"
                      onClick={() => setVisibleLimit(30)}
                      className="gap-2 px-6 rounded-xl border-primary/30 hover:border-primary text-primary hover:bg-primary/5 transition-all animate-fadeIn"
                    >
                      {locale === "am" ? "ያነሰ አሳይ" : "See Less"}
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Disburse Funds CTA */}
      {!isFullyDisbursed && (
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-orange-500/5 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shrink-0">
                <Banknote className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{t("disburseFunds")}</p>
                <p className="text-sm text-muted-foreground">
                  Finalise and hand over collected funds. This cannot be undone.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setDisburseDialog(true)}
              variant="amber"
              className="shrink-0 gap-2"
              disabled={paidCount === 0}
              id="disburse-funds-btn"
            >
              <Banknote className="h-4 w-4" />
              {t("disburseFunds")} — እቁብ አስረክብ
            </Button>
          </div>
        </div>
      )}

      {isFullyDisbursed && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
          <div>
            <p className="font-semibold text-emerald-700">{t("disburseSuccess")}</p>
            <p className="text-sm text-emerald-600/70">{t("allFundsDisbursed")}</p>
          </div>
        </div>
      )}

      {/* Disburse Confirm Dialog */}
      <Dialog open={disburseDialog} onOpenChange={setDisburseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Disbursement
            </DialogTitle>
            <DialogDescription>{t("disburseConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDisburseDialog(false)}>{t("cancel")}</Button>
            <Button variant="amber" onClick={handleDisburse} disabled={isPending} id="confirm-disburse-btn">
              {isPending ? t("loading") : t("disburseFunds")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
