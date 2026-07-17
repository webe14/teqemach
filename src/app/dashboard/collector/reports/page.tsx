"use client";

import { useState, useEffect, useMemo } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getCurrentProfile } from "@/lib/actions/auth";
import { getCollectorReports } from "@/lib/actions/collector";
import {
  gregorianToEthiopianString,
  parseEthiopianDate,
  toGregorian,
  getCurrentEthiopianDate,
  addDaysToEthiopian,
} from "@/lib/ethiopian-calendar";
import { EthiopianDatePicker } from "@/components/ui/EthiopianDatePicker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { StatsCard } from "@/components/ui/StatsCard";
import {
  BarChart3,
  Filter,
  X,
  Users,
  CalendarDays,
  Coins,
  TrendingUp,
  Layers,
  RefreshCcw,
  Download,
  Loader2,
  Eye,
} from "lucide-react";
import type {
  GroupedContributor,
  ReportSummary,
} from "@/lib/generateReportPDF";

type ReportRow = {
  id: string;
  cycle_number: number;
  contribution_date: string;
  contributor: { full_name: string | null; phone_number: string | null } | null;
  group: { name: string; contribution_amount: number } | null;
};

export default function CollectorReportsPage() {
  const { t, locale } = useLocale();
  const todayEC = getCurrentEthiopianDate();
  const sevenDaysAgoEC = addDaysToEthiopian(todayEC, -7);
  const sevenDaysAgoStr = `${String(sevenDaysAgoEC.day).padStart(2, "0")}/${String(sevenDaysAgoEC.month).padStart(2, "0")}/${sevenDaysAgoEC.year}`;
  const todayECStr = `${String(todayEC.day).padStart(2, "0")}/${String(todayEC.month).padStart(2, "0")}/${todayEC.year}`;

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(sevenDaysAgoStr);
  const [toDate, setToDate] = useState(todayECStr);
  const [errorMsg, setErrorMsg] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const profile = await getCurrentProfile();
      if (!profile) return;
      setUserId(profile.id);
      
      const parsedFrom = parseEthiopianDate(sevenDaysAgoStr);
      const parsedTo = parseEthiopianDate(todayECStr);
      if (parsedFrom && parsedTo) {
        const fromISO = toGregorian(parsedFrom).toISOString().split("T")[0] + "T00:00:00Z";
        const toISO = toGregorian(parsedTo).toISOString().split("T")[0] + "T23:59:59Z";
        await loadReport(profile.id, fromISO, toISO);
      } else {
        await loadReport(profile.id);
      }
    })();
  }, [sevenDaysAgoStr, todayECStr]);

  async function loadReport(uid: string, from?: string, to?: string) {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const result = await getCollectorReports(uid, from ?? today + "T00:00:00Z", to);
    setRows((result.data as ReportRow[]) ?? []);
    setLoading(false);
  }

  function applyFilter() {
    if (!userId) return;
    setErrorMsg("");
    let fromISO: string | undefined = undefined;
    let toISO: string | undefined = undefined;

    if (fromDate) {
      const parsedFrom = parseEthiopianDate(fromDate);
      if (!parsedFrom) {
        setErrorMsg(locale === "am" ? "ልክ ያልሆነ ቀን። እባክዎ ቀን/ወር/ዓመት ይጠቀሙ።" : "Invalid date format. Use DD/MM/YYYY.");
        return;
      }
      fromISO = toGregorian(parsedFrom).toISOString().split("T")[0] + "T00:00:00Z";
    }

    if (toDate) {
      const parsedTo = parseEthiopianDate(toDate);
      if (!parsedTo) {
        setErrorMsg(locale === "am" ? "ልክ ያልሆነ ቀን። እባክዎ ቀን/ወር/ዓመት ይጠቀሙ።" : "Invalid date format. Use DD/MM/YYYY.");
        return;
      }
      toISO = toGregorian(parsedTo).toISOString().split("T")[0] + "T23:59:59Z";
    }

    loadReport(userId, fromISO, toISO);
  }

  function clearFilter() {
    setFromDate(sevenDaysAgoStr);
    setToDate(todayECStr);
    setErrorMsg("");
    if (userId) loadReport(userId);
  }

  // ─── Group rows by contributor ───────────────────────────────────────
  const grouped = useMemo<GroupedContributor[]>(() => {
    const map = new Map<
      string,
      {
        name: string;
        phone: string;
        dates: string[];
        totalAmount: number;
        groupName: string;
        cycles: Set<number>;
      }
    >();

    for (const row of rows) {
      const key = row.contributor?.full_name ?? "Unknown";
      const entry = map.get(key);

      const dateStr = row.contribution_date
        ? gregorianToEthiopianString(new Date(row.contribution_date), locale)
        : "—";
      const amount = row.group?.contribution_amount ?? 0;

      if (entry) {
        entry.dates.push(dateStr);
        entry.totalAmount += amount;
        if (row.cycle_number) entry.cycles.add(row.cycle_number);
      } else {
        map.set(key, {
          name: key,
          phone: row.contributor?.phone_number ?? "",
          dates: [dateStr],
          totalAmount: amount,
          groupName: row.group?.name ?? "—",
          cycles: new Set(row.cycle_number ? [row.cycle_number] : []),
        });
      }
    }

    return Array.from(map.values()).map((entry) => ({
      contributorName: entry.name,
      phone: entry.phone,
      dates: entry.dates,
      totalDays: entry.dates.length,
      totalAmount: entry.totalAmount,
      groupName: entry.groupName,
      cycles: Array.from(entry.cycles)
        .sort((a, b) => a - b)
        .map((c) => `#${c}`)
        .join(", "),
    }));
  }, [rows, locale]);

  // ─── Compute summary statistics ─────────────────────────────────────
  const summary = useMemo<ReportSummary>(() => {
    const uniqueGroups = new Set(rows.map((r) => r.group?.name).filter(Boolean));
    const uniqueCycles = new Set(rows.map((r) => r.cycle_number).filter(Boolean));
    const totalAmount = rows.reduce((s, r) => s + (r.group?.contribution_amount ?? 0), 0);
    const totalContributors = grouped.length;

    return {
      totalContributors,
      totalContributionDays: rows.length,
      totalAmount,
      averagePerContributor: totalContributors > 0 ? Math.round(totalAmount / totalContributors) : 0,
      numberOfGroups: uniqueGroups.size,
      numberOfCycles: uniqueCycles.size,
    };
  }, [rows, grouped]);

  // ─── PDF Preview Handler ────────────────────────────────────────────
  async function handlePreviewPDF() {
    setPdfLoading(true);
    setPdfSuccess(false);
    try {
      const { generateReportPDF } = await import("@/lib/generateReportPDF");
      const doc = generateReportPDF({
        contributors: grouped,
        summary,
        fromDate: fromDate || "All time",
        toDate: toDate || "Present",
      });
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      setGeneratedDoc(doc);
      setPreviewUrl(url);
      setIsPreviewOpen(true);
    } catch (err) {
      console.error("PDF generation failed:", err);
      setErrorMsg("Failed to generate PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  }

  function handleDownloadPDF() {
    if (generatedDoc) {
      const now = new Date();
      const generatedDate = now.toLocaleDateString("en-GB").replace(/\//g, "-");
      generatedDoc.save(`Teqemach_Report_${generatedDate}.pdf`);
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3000);
      setIsPreviewOpen(false);
    }
  }

  const total = rows.reduce((s, r) => s + (r.group?.contribution_amount ?? 0), 0);

  return (
    <div className="space-y-6 stagger-children">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("globalReports")}</h1>
        <p className="text-muted-foreground mt-1">{t("globalReportsDesc")}</p>
        <div className="ethiopian-divider mt-3 w-24" />
      </div>

      {/* ─── Filter Section ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shrink-0">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("totalCollected")}</p>
            <p className="text-2xl font-bold text-foreground">ETB {total.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{rows.length} {t("payments")}</p>
          </div>
        </div>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">{t("filterByDate")}</span>
          </div>
          <div className="space-y-2">
            <EthiopianDatePicker
              label={locale === "am" ? "ከቀን (ቀን/ወር/ዓመት)" : "From (DD/MM/YYYY)"}
              value={fromDate}
              onChange={(val) => { setFromDate(val); setErrorMsg(""); }}
              locale={locale}
            />
            <EthiopianDatePicker
              label={locale === "am" ? "እስከ ቀን (ቀን/ወር/ዓመት)" : "To (DD/MM/YYYY)"}
              value={toDate}
              onChange={(val) => { setToDate(val); setErrorMsg(""); }}
              locale={locale}
            />
            {errorMsg && <p className="text-[10px] text-rose-500 font-medium">{errorMsg}</p>}
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={applyFilter} className="flex-1 text-xs h-8">{t("Apply")}</Button>
              <Button size="sm" variant="ghost" onClick={clearFilter} className="px-2 h-8"><X className="h-3 w-3" /></Button>
            </div>
          </div>
        </Card>
      </div>

      {/* ─── Grouped Contributors Table ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{t("paymentRecords")}</CardTitle>
          <CardDescription>{t("contributionsGrouped")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mr-3" />
              {t("loading")}
            </div>
          ) : grouped.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">{t("noData")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{t("contributor")}</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{t("contributionDates")}</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">{t("totalDaysLabel")}</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">{t("totalAmountLabel")}</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground hidden sm:table-cell">{t("groupName")}</th>
                    
                  </tr>
                </thead>
                <tbody>
                  {grouped.map((row, idx) => (
                    <tr key={row.contributorName + idx} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{row.contributorName}</p>
                          {row.phone && (
                            <p className="text-xs text-muted-foreground">{row.phone}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ExpandableDateList dates={row.dates} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary font-bold text-xs">
                          {row.totalDays}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                        ETB {row.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <Badge variant="info">{row.groupName}</Badge>
                      </td>
                     
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Preview PDF Button ─────────────────────────────────────── */}
      {!loading && grouped.length > 0 && (
        <div className="flex flex-col items-center gap-3 pt-2 pb-6">
          <Button
            size="lg"
            onClick={handlePreviewPDF}
            disabled={pdfLoading}
            className="w-full sm:w-auto min-w-[220px]"
          >
            {pdfLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t("generatingPreview")}
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                {t("downloadPdf")}
              </>
            )}
          </Button>
          {pdfSuccess && (
            <p className="text-sm text-emerald-500 font-medium animate-in fade-in">
              {t("pdfDownloadedSuccess")}
            </p>
          )}
        </div>
      )}

      {/* ─── PDF Preview Modal ─────────────────────────────────────── */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("pdfReportPreview")}</DialogTitle>
            <DialogDescription>{t("pdfReportPreviewDesc")}</DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 bg-muted/30 rounded-md border border-border overflow-hidden">
            {previewUrl ? (
              <iframe
                src={previewUrl}
                className="w-full h-full"
                title="PDF Preview"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                {t("noPreviewAvailable")}
              </div>
            )}
          </div>
          
          <DialogFooter className="sm:justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleDownloadPDF} className="gap-2">
              <Download className="h-4 w-4" />
              {t("download")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExpandableDateList({ dates }: { dates: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const showMore = dates.length > 3;
  const visibleDates = expanded ? dates : dates.slice(0, 3);

  return (
    <div className="flex flex-wrap gap-1">
      {visibleDates.map((d, i) => (
        <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0.5">
          {d}
        </Badge>
      ))}
      {showMore && !expanded && (
        <Badge 
          variant="outline" 
          className="text-[10px] px-1.5 py-0.5 cursor-pointer hover:bg-muted"
          onClick={() => setExpanded(true)}
        >
          +{dates.length - 3} more
        </Badge>
      )}
      {showMore && expanded && (
        <Badge 
          variant="outline" 
          className="text-[10px] px-1.5 py-0.5 cursor-pointer hover:bg-muted"
          onClick={() => setExpanded(false)}
        >
          Show less
        </Badge>
      )}
    </div>
  );
}
