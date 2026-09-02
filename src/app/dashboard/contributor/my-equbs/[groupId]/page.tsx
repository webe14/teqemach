"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getCurrentProfile } from "@/lib/actions/auth";
import { getContributorCycles } from "@/lib/actions/collector";
import {
  toEthiopian,
  formatEthiopianDate,
  gregorianToEthiopianString,
} from "@/lib/ethiopian-calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

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
  total_days: number;
  contribution_amount?: number;
} | null;

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

export default function ContributorCycleGridPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { t, locale } = useLocale();

  const [groupId, setGroupId] = useState<string>("");
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [groupMeta, setGroupMeta] = useState<GroupMeta>(null);
  const [visibleLimit, setVisibleLimit] = useState(30);
  const [loading, setLoading] = useState(true);

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const resolvedParams = await params;
        const gid = resolvedParams.groupId;
        setGroupId(gid);

        const profile = await getCurrentProfile();
        if (!profile) return;

        const cyclesRes = await getContributorCycles(profile.id, gid);

        setCycles((cyclesRes.data as Cycle[]) ?? []);
        setGroupMeta((cyclesRes as any).group ?? null);
      } catch (err) {
        console.error("Failed to load cycles", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [params]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // ── Derived stats ─────────────────────────────────────────────────────────
  const paidCount = cycles.filter((c) => c.is_marked_paid).length;
  const totalCount = groupMeta?.total_days || cycles.length || 0;
  const progress = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;
  const amountPerCycle = groupMeta?.contribution_amount || 0;
  const totalPaid = paidCount * amountPerCycle;
  const totalTarget = totalCount * amountPerCycle;

  return (
    <div className="space-y-6 stagger-children max-w-4xl mx-auto">
      {/* Back + header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/dashboard/contributor/my-equbs">
            <Button variant="ghost" size="icon" className="mt-1 bg-card hover:bg-muted border border-border">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">
              My Contribution Cycle
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {totalCount} total cycles
              {groupMeta && (
                <span className="ml-2 capitalize text-primary/70">· {groupMeta.frequency}</span>
              )}
            </p>
            <div className="ethiopian-divider mt-3 w-24" />
          </div>
        </div>

        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 flex items-center justify-center shadow-md shadow-blue-600/10 shrink-0 overflow-hidden">
          <Image
            src="/logo.png"
            alt="Equb"
            width={48}
            height={48}
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Progress & Total Payment */}
      <Card className="border-primary/20 gradient-card shadow-sm">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {locale === "am" ? "የተከፈለ ጠቅላላ ክፍያ" : "Total Payment"}
              </p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-extrabold text-foreground">
                  ETB {totalPaid.toLocaleString()}
                </span>
                {totalTarget > 0 && (
                  <span className="text-xs text-muted-foreground font-medium">
                    / ETB {totalTarget.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-primary">{progress}%</span>
              <p className="text-[11px] text-muted-foreground font-medium">{t("collectionProgress")}</p>
            </div>
          </div>

          <Progress
            value={progress}
            className="h-3 bg-muted/60"
            indicatorClassName="bg-gradient-to-r from-emerald-500 to-teal-500"
          />

          <div className="flex items-center justify-between pt-1 border-t border-border/50 text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> {paidCount} {locale === "am" ? "የተከፈሉ" : "Paid"}
            </span>
            <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
              <Circle className="h-4 w-4" /> {totalCount - paidCount} {locale === "am" ? "የቀሩ" : "Remaining"}
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
                Track your payment progress for this equb
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {totalCount === 0 ? (
            <div className="py-12 text-center text-muted-foreground">{t("noCyclesGenerated")}</div>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {Array.from({ length: totalCount }).slice(0, visibleLimit).map((_, i) => {
                  const cycleNum = i + 1;
                  const cycle = cycles.find((c) => c.cycle_number === cycleNum);
                  const isPaid = cycle?.is_marked_paid ?? false;
                  
                  const cycleDate = getCycleDate(cycleNum, groupMeta);
                  const dateLabel = cycleDate
                    ? formatShortEC(cycleDate, locale)
                    : `#${cycleNum}`;

                  return (
                    <div
                      key={cycle?.id || `virtual-${cycleNum}`}
                      className={`
                        relative flex flex-col items-center justify-center rounded-xl p-2 text-[11px] font-semibold
                        transition-all duration-150 aspect-square border-2 cursor-default
                        ${isPaid
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700"
                          : "bg-muted/50 border-border text-muted-foreground"
                        }
                      `}
                      title={
                        isPaid && cycle?.contribution_date
                          ? `Paid: ${gregorianToEthiopianString(new Date(cycle.contribution_date), locale)}`
                          : cycleDate
                          ? `Cycle #${cycleNum} — ${formatEthiopianDate(toEthiopian(cycleDate), locale)}`
                          : `Cycle #${cycleNum}`
                      }
                    >
                      {/* Status icon */}
                      <span className="mb-0.5">
                        {isPaid ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Circle className="h-4 w-4 opacity-30" />
                        )}
                      </span>

                      {/* Month + Day label */}
                      <span className="leading-tight text-center">{dateLabel}</span>

                      {/* Paid dot */}
                      {isPaid && cycle?.contribution_date && (
                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-500 shadow-sm" />
                      )}
                    </div>
                  );
                })}
              </div>

              {totalCount > 30 && (
                <div className="flex justify-center gap-4 pt-2">
                  {totalCount > visibleLimit && (
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
    </div>
  );
}
