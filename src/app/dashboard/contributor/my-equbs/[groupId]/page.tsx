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
  const totalCount = cycles.length;
  const progress = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6 stagger-children max-w-4xl mx-auto">
      {/* Back + header */}
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
            indicatorClassName="bg-gradient-to-r from-emerald-500 to-teal-500"
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
                Track your payment progress for this equb
              </CardDescription>
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
                  const cycleDate = getCycleDate(cycle.cycle_number, groupMeta);
                  const dateLabel = cycleDate
                    ? formatShortEC(cycleDate, locale)
                    : `#${cycle.cycle_number}`;

                  return (
                    <div
                      key={cycle.id}
                      className={`
                        relative flex flex-col items-center justify-center rounded-xl p-2 text-[11px] font-semibold
                        transition-all duration-150 aspect-square border-2 cursor-default
                        ${cycle.is_marked_paid
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700"
                          : "bg-muted/50 border-border text-muted-foreground"
                        }
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
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Circle className="h-4 w-4 opacity-30" />
                        )}
                      </span>

                      {/* Month + Day label */}
                      <span className="leading-tight text-center">{dateLabel}</span>

                      {/* Paid dot */}
                      {cycle.is_marked_paid && cycle.contribution_date && (
                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-500 shadow-sm" />
                      )}
                    </div>
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
    </div>
  );
}
