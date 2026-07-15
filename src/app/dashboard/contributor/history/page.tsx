"use client";

import { useState, useEffect } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getCurrentProfile } from "@/lib/actions/auth";
import { getContributorPaymentHistory } from "@/lib/actions/contributor";
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
import { History, Filter, X } from "lucide-react";

type PaymentRow = {
  id: string;
  cycle_number: number;
  contribution_date: string;
  is_marked_paid: boolean;
  collector: { full_name: string | null } | null;
  group: { name: string; contribution_amount: number } | null;
};

export default function ContributorPaymentHistoryPage() {
  const { t, locale } = useLocale();
  const todayEC = getCurrentEthiopianDate();
  const todayECStr = `${String(todayEC.day).padStart(2, "0")}/${String(todayEC.month).padStart(2, "0")}/${todayEC.year}`;

  const [rows, setRows] = useState<PaymentRow[]>([]);
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
      await loadHistory(profile.id);
    })();
  }, []);

  async function loadHistory(uid: string, from?: string, to?: string) {
    setLoading(true);
    const result = await getContributorPaymentHistory(uid, from, to);
    setRows((result.data as any[]) ?? []);
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
        setErrorMsg(locale === "am" ? "ልክ ያልሆነ ቀን። እባክዎ ቀን/ወር/ዓመት ይጠቀሙ།" : "Invalid date format. Use DD/MM/YYYY.");
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

    loadHistory(userId, fromISO, toISO);
  }

  function clearFilter() {
    setFromDate(todayECStr);
    setToDate("");
    setErrorMsg("");
    if (userId) loadHistory(userId);
  }

  const totalSaved = rows.reduce((s, r) => s + (r.group?.contribution_amount ?? 0), 0);

  return (
    <div className="space-y-6 stagger-children">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("paymentHistory")}</h1>
        <p className="text-muted-foreground mt-1">{t("paymentHistoryDesc")}</p>
        <div className="ethiopian-divider mt-3 w-24" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shrink-0">
            <History className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("totalPaymentsInLedger")}</p>
            <p className="text-2xl font-bold text-foreground">ETB {totalSaved.toLocaleString()}</p>
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
              <Button size="sm" onClick={applyFilter} className="flex-1 text-xs h-8">{t("apply")}</Button>
              <Button size="sm" variant="ghost" onClick={clearFilter} className="px-2 h-8">
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("savingsHistoryLedger")}</CardTitle>
          <CardDescription>{t("verifiedContributionsRecorded")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mr-3" />
              {t("loading")}
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">{t("noPayments")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{t("equbGroupLabel")}</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{t("cycleNumber")}</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{t("amountPaid")}</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground hidden sm:table-cell">{t("collectorName")}</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{t("dateEc")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{row.group?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">#{row.cycle_number}</Badge>
                      </td>
                      <td className="px-4 py-3 font-semibold text-emerald-600">
                        ETB {(row.group?.contribution_amount ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                        {row.collector?.full_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs font-semibold">
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
