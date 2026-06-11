"use client";

import { useState, useEffect, useTransition } from "react";
import { getCurrentProfile } from "@/lib/actions/auth";
import { getCollectorGroups, createEqubGroup } from "@/lib/actions/collector";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Layers, CalendarDays, Coins, Timer, AlertCircle, CheckCircle2 } from "lucide-react";

type EqubGroup = {
  id: string;
  name: string;
  contribution_amount: number;
  total_days: number;
  frequency: "daily" | "weekly" | "monthly";
  created_at: string;
};

export default function EqubGroupsPage() {
  const { t } = useLocale();
  const [collectorId, setCollectorId] = useState<string | null>(null);
  const [groups, setGroups] = useState<EqubGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    name: "",
    contributionAmount: "",
    totalDays: "",
    frequency: "daily" as "daily" | "weekly" | "monthly",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      const profile = await getCurrentProfile();
      if (!profile) return;
      setCollectorId(profile.id);
      await loadGroups(profile.id);
    })();
  }, []);

  async function loadGroups(cid: string) {
    setLoading(true);
    const result = await getCollectorGroups(cid);
    setGroups((result.data as EqubGroup[]) ?? []);
    setLoading(false);
  }

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setFormError(null);
    setFormSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!collectorId) return;
    if (!form.name.trim() || !form.contributionAmount || !form.totalDays) {
      setFormError("Please fill in all fields");
      return;
    }

    const amount = parseFloat(form.contributionAmount);
    const days = parseInt(form.totalDays);

    if (isNaN(amount) || amount <= 0) {
      setFormError("Contribution amount must be greater than 0");
      return;
    }
    if (isNaN(days) || days <= 0) {
      setFormError("Total days must be greater than 0");
      return;
    }

    setFormError(null);
    startTransition(async () => {
      const result = await createEqubGroup({
        name: form.name.trim(),
        contributionAmount: amount,
        totalDays: days,
        frequency: form.frequency,
        collectorId,
      });

      if (result.error) {
        setFormError(result.error);
        return;
      }

      setFormSuccess(true);
      setForm({
        name: "",
        contributionAmount: "",
        totalDays: "",
        frequency: "daily",
      });

      // Refresh list
      await loadGroups(collectorId);
      setTimeout(() => {
        setFormSuccess(false);
        setDialogOpen(false);
      }, 1500);
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sticky top-[64px] lg:top-16 z-10 bg-background/95 backdrop-blur pb-4 pt-1 -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 border-b border-border mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("equbGroups")}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Manage and create savings groups</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} id="add-group-btn" className="gap-2 shrink-0">
            <PlusCircle className="h-4 w-4" />
            {t("addGroup")}
          </Button>
        </div>
        <div className="ethiopian-divider mt-3 w-24" />
      </div>

      {/* Group Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mr-3" />
          {t("loading")}
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Layers className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium">No Equb groups created yet</p>
          <p className="text-sm text-muted-foreground mt-1">Click "Add Equb Group" to start a new savings circle</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Card key={group.id} className="card-hover border-border/60 hover:border-primary/30 flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-lg">{group.name}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Created on {new Date(group.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Badge variant="info" className="capitalize shrink-0">
                    {group.frequency}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Amount</span>
                    <div className="flex items-center gap-1 text-sm font-semibold text-emerald-600">
                      <Coins className="h-4 w-4 shrink-0" />
                      <span>ETB {group.contribution_amount.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Duration</span>
                    <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
                      <Timer className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span>{group.total_days} days</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/60">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    <span>Contribution cycle repeats {group.frequency}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Group Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-primary" />
              {t("addGroup")}
            </DialogTitle>
            <DialogDescription>Create a new Equb savings group for your contributors</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            {formSuccess && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Equb Group created successfully!</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="group-name">{t("groupName")}</Label>
              <Input
                id="group-name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Merkato Shop Owners"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contribution-amount">Amount (ETB)</Label>
                <Input
                  id="contribution-amount"
                  type="number"
                  min="1"
                  value={form.contributionAmount}
                  onChange={(e) => update("contributionAmount", e.target.value)}
                  placeholder="e.g. 500"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="total-days">Total Cycles/Days</Label>
                <Input
                  id="total-days"
                  type="number"
                  min="1"
                  value={form.totalDays}
                  onChange={(e) => update("totalDays", e.target.value)}
                  placeholder="e.g. 30"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("frequency")}</Label>
              <Select
                value={form.frequency}
                onValueChange={(v: "daily" | "weekly" | "monthly") => update("frequency", v)}
              >
                <SelectTrigger id="group-frequency">
                  <SelectValue placeholder="Select frequency..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>{t("cancel")}</Button>
              <Button type="submit" disabled={isPending} id="confirm-add-group">
                {isPending ? t("loading") : t("addGroup")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
