"use client";

import { useState, useEffect } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getCurrentProfile } from "@/lib/actions/auth";
import { getCollectorReports } from "@/lib/actions/collector";
import {
  gregorianToEthiopianString,
  parseEthiopianDate,
  toGregorian,
  getCurrentEthiopianDate,
} from "@/lib/ethiopian-calendar";
import { EthiopianDatePicker } from "@/components/ui/EthiopianDatePicker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, Filter, X } from "lucide-react";

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
  const todayECStr = `${String(todayEC.day).padStart(2, "0")}/${String(todayEC.month).padStart(2, "0")}/${todayEC.year}`;

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(todayECStr);
  const [toDate, setToDate] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const profile = await getCurrentProfile();
      if (!profile) return;
      setUserId(profile.id);
      await loadReport(profile.id);
    })();
  }, []);

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
        setErrorMsg(locale === "am" ? "ልክ ያልሆነ ቀን። እባክዎ ቀን/ወር/ዓመት ይጠቀሙ།" : "Invalid date format. Use DD/MM/YYYY.");
        return;
      }
      toISO = toGregorian(parsedTo).toISOString().split("T")[0] + "T23:59:59Z";
    }

    loadReport(userId, fromISO, toISO);
  }

  function clearFilter() {
    setFromDate(todayECStr);
    setToDate("");
    setErrorMsg("");
    if (userId) loadReport(userId);
  }

  const total = rows.reduce((s, r) => s + (r.group?.contribution_amount ?? 0), 0);

  return (
    <div className="space-y-6 stagger-children">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Global Reports</h1>
        <p className="text-muted-foreground mt-1">All payment records across your contributors</p>
        <div className="ethiopian-divider mt-3 w-24" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shrink-0">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Collected Today</p>
            <p className="text-2xl font-bold text-foreground">ETB {total.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{rows.length} payments</p>
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
              <Button size="sm" onClick={applyFilter} className="flex-1 text-xs h-8">Apply</Button>
              <Button size="sm" variant="ghost" onClick={clearFilter} className="px-2 h-8"><X className="h-3 w-3" /></Button>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Records</CardTitle>
          <CardDescription>Confirmed payments from your contributors</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mr-3" />
              {t("loading")}
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">{t("noData")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Contributor</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground hidden sm:table-cell">Group</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Cycle</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Amount</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground hidden md:table-cell">Date (EC)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{row.contributor?.full_name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{row.contributor?.phone_number}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <Badge variant="info">{row.group?.name ?? "—"}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">#{row.cycle_number}</Badge>
                      </td>
                      <td className="px-4 py-3 font-semibold text-emerald-600">
                        ETB {(row.group?.contribution_amount ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                        {row.contribution_date
                          ? gregorianToEthiopianString(new Date(row.contribution_date), locale)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
