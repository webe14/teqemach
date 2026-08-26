"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getCurrentProfile } from "@/lib/actions/auth";
import {
  getAllContributors,
  getAllPendingContributors,
  getAllGroups,
  approveContributor,
} from "@/lib/actions/admin";
import {
  addContributor,
  createContributionCycles,
  updateContributor,
  deleteContributor,
  inviteContributor,
} from "@/lib/actions/collector";
import {
  getCurrentEthiopianDate,
  parseEthiopianDate,
  formatEthiopianDate,
  toGregorian,
  toEthiopian,
} from "@/lib/ethiopian-calendar";
import { EthiopianDatePicker } from "@/components/ui/EthiopianDatePicker";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserPlus,
  Search,
  Users,
  Phone,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Mail,
  Lock,
  User,
  Pencil,
  Trash2,
  AlertTriangle,
  CalendarDays,
  Clock,
  Copy,
  Link2,
} from "lucide-react";

type Contributor = {
  id: string;
  group_id: string;
  contributor_id: string;
  created_at: string;
  contributor: {
    id: string;
    full_name: string | null;
    phone_number: string | null;
    email: string | null;
    status: string | null;
  } | null;
  group: {
    id: string;
    name: string;
    contribution_amount: number;
    total_days: number;
    frequency: string;
  } | null;
};

type PendingContributor = {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  telegram_username: string | null;
  created_at: string;
  requested_group_id?: string | null;
  requested_group_name?: string | null;
  requested_start_date?: string | null;
};

export default function ManageContributorsPage() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [groups, setGroups] = useState<
    Array<{ id: string; name: string; total_days: number }>
  >([]);
  const [pendingContributors, setPendingContributors] = useState<PendingContributor[]>([]);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  // Default starting date to today in Ethiopian calendar
  const todayEC = getCurrentEthiopianDate();
  const todayECStr = `${String(todayEC.day).padStart(2, "0")}/${String(todayEC.month).padStart(2, "0")}/${todayEC.year}`;

  // ── Add dialog state ──────────────────────────────────────────────────────
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    password: "",
    telegramUsername: "",
    groupId: "",
    startDate: todayECStr,
  });
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const [addGeneratedLink, setAddGeneratedLink] = useState<string | null>(null);

  // ── Edit dialog state ─────────────────────────────────────────────────────
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Contributor | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    startDate: "",
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  // ── Delete dialog state ───────────────────────────────────────────────────
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Contributor | null>(null);

  // ── Pending Delete dialog state ───────────────────────────────────────────
  const [pendingDeleteDialogOpen, setPendingDeleteDialogOpen] = useState(false);
  const [pendingDeleteTarget, setPendingDeleteTarget] = useState<PendingContributor | null>(null);

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<PendingContributor | null>(null);
  const [approveForm, setApproveForm] = useState({ groupId: "", startDate: todayECStr });
  const [approveError, setApproveError] = useState<string | null>(null);
  const [approveSuccess, setApproveSuccess] = useState(false);

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const profile = await getCurrentProfile();
      if (!profile) return;
      setUserId(profile.id);
      const [contributorsRes, groupsRes, pendingRes] = await Promise.all([
        getAllContributors(),
        getAllGroups(),
        getAllPendingContributors(),
      ]);
      setContributors((contributorsRes.data as Contributor[]) ?? []);
      setGroups(
        (groupsRes.data as { id: string; name: string; total_days: number }[]) ??
          []
      );
      setPendingContributors((pendingRes.data as PendingContributor[]) ?? []);
    })();
  }, []);

  async function refreshContributors() {
    if (!userId) return;
    const [res, pendingRes] = await Promise.all([
      getAllContributors(),
      getAllPendingContributors(),
    ]);
    setContributors((res.data as Contributor[]) ?? []);
    setPendingContributors((pendingRes.data as PendingContributor[]) ?? []);
  }

  const filtered = contributors.filter((c) => {
    const name = (c.contributor?.full_name ?? "").toLowerCase();
    const phone = (c.contributor?.phone_number ?? "").toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || phone.includes(q);
  });

  function handleRowClick(c: Contributor) {
    router.push(
      `/dashboard/collector/contributors/${c.contributor_id}?groupId=${c.group_id}`
    );
  }

  // ── Add helpers ───────────────────────────────────────────────────────────
  function updateAdd(field: string, value: string) {
    setAddForm((f) => ({ ...f, [field]: value }));
    setAddError(null);
    setAddSuccess(false);
    setAddGeneratedLink(null);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (
      !userId ||
      !addForm.fullName.trim() ||
      !addForm.phoneNumber.trim() ||
      !addForm.telegramUsername.trim() ||
      !addForm.groupId
    ) {
      setAddError(t("pleaseFillAllFields") || "Please fill all required fields");
      return;
    }
    if (addForm.password && addForm.password.length < 6) {
      setAddError(t("minSixChars"));
      return;
    }
    setAddError(null);
    startTransition(async () => {
      // Parse the starting date from Ethiopian to Gregorian ISO
      let startDateISO: string | undefined = undefined;
      if (addForm.startDate) {
        const parsed = parseEthiopianDate(addForm.startDate);
        if (!parsed) {
          setAddError(t("invalidDateFormat"));
          return;
        }
        startDateISO = toGregorian(parsed).toISOString();
      }

      // Step 1: Register or Invite the new user
      const regRes = await inviteContributor({
        fullName: addForm.fullName.trim(),
        phoneNumber: addForm.phoneNumber.trim(),
        telegramUsername: addForm.telegramUsername.trim(),
        email: addForm.email.trim() || undefined,
        password: addForm.password.trim() || undefined,
        collectorId: userId,
      });
      if (regRes.error) {
        setAddError(regRes.error);
        return;
      }
      const contributorId = regRes.id;
      if (!contributorId) {
        setAddError("Failed to retrieve new contributor ID");
        return;
      }

      // Step 2: Add to group membership
      const selectedGroup = groups.find((g) => g.id === addForm.groupId) as any;
      const targetCollectorId = selectedGroup?.collector_id || userId;
      
      const result = await addContributor({
        contributorId,
        groupId: addForm.groupId,
        collectorId: targetCollectorId,
        startDate: startDateISO,
      });
      if (result.error) {
        setAddError(result.error);
        return;
      }

      // Step 3: Create contribution cycle placeholders
      if (selectedGroup) {
        await createContributionCycles(
          contributorId,
          targetCollectorId,
          addForm.groupId,
          selectedGroup.total_days
        );
      }

      setAddSuccess(true);
      setAddGeneratedLink(`https://t.me/TeqemachBot?start=link_${contributorId}`);
      await refreshContributors();
      // Do not auto-close the dialog so the collector can copy the link
    });
  }

  // ── Edit helpers ──────────────────────────────────────────────────────────
  function openEdit(c: Contributor) {
    setEditTarget(c);
    // Convert stored created_at (Gregorian ISO) → Ethiopian DD/MM/YYYY
    let ecStr = todayECStr;
    if (c.created_at) {
      const ec = toEthiopian(new Date(c.created_at));
      ecStr = `${String(ec.day).padStart(2, "0")}/${String(ec.month).padStart(2, "0")}/${ec.year}`;
    }
    setEditForm({
      fullName: c.contributor?.full_name ?? "",
      phoneNumber: c.contributor?.phone_number ?? "",
      email: c.contributor?.email ?? "",
      startDate: ecStr,
    });
    setEditError(null);
    setEditSuccess(false);
    setEditDialogOpen(true);
  }

  function updateEdit(field: string, value: string) {
    setEditForm((f) => ({ ...f, [field]: value }));
    setEditError(null);
    setEditSuccess(false);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget || !userId) return;
    if (
      !editForm.fullName.trim() ||
      !editForm.phoneNumber.trim() ||
      !editForm.email.trim()
    ) {
      setEditError(t("pleaseFillAllFields"));
      return;
    }
    setEditError(null);
    startTransition(async () => {
      let startDateISO: string | undefined = undefined;
      if (editForm.startDate) {
        const parsed = parseEthiopianDate(editForm.startDate);
        if (!parsed) {
          setEditError(t("invalidDateFormat"));
          return;
        }
        startDateISO = toGregorian(parsed).toISOString();
      }

      const result = await updateContributor({
        contributorId: editTarget!.contributor_id,
        membershipId: editTarget!.id,
        fullName: editForm.fullName.trim(),
        phoneNumber: editForm.phoneNumber.trim(),
        email: editForm.email.trim(),
        startDate: startDateISO,
      });

      if (result.error) {
        setEditError(result.error);
        return;
      }

      setEditSuccess(true);
      await refreshContributors();
      setTimeout(() => {
        setEditSuccess(false);
        setEditDialogOpen(false);
        setEditTarget(null);
      }, 1500);
    });
  }

  // ── Approve Pending helpers ───────────────────────────────────────────────
  function openApprove(c: PendingContributor) {
    setApproveTarget(c);
    
    // Auto-select requested group or fallback to first group
    const initialGroupId = c.requested_group_id || (groups.length > 0 ? groups[0].id : "");
    
    // Auto-format requested start date into Ethiopian date (DD/MM/YYYY)
    let initialStartDate = todayECStr;
    if (c.requested_start_date) {
      try {
        const ethDate = toEthiopian(new Date(c.requested_start_date));
        initialStartDate = `${String(ethDate.day).padStart(2, "0")}/${String(ethDate.month).padStart(2, "0")}/${ethDate.year}`;
      } catch {
        initialStartDate = todayECStr;
      }
    }

    setApproveForm({
      groupId: initialGroupId,
      startDate: initialStartDate,
    });
    setApproveError(null);
    setApproveSuccess(false);
    setApproveDialogOpen(true);
  }

  function updateApprove(field: string, value: string) {
    setApproveForm((f) => ({ ...f, [field]: value }));
    setApproveError(null);
    setApproveSuccess(false);
  }

  async function handleApprove(e: React.FormEvent) {
    e.preventDefault();
    if (!approveTarget || !userId) return;
    if (!approveForm.groupId) {
      setApproveError("Please select a group");
      return;
    }

    startTransition(async () => {
      let startDateISO: string | undefined = undefined;
      if (approveForm.startDate) {
        const parsed = parseEthiopianDate(approveForm.startDate);
        if (!parsed) {
          setApproveError(t("invalidDateFormat"));
          return;
        }
        startDateISO = toGregorian(parsed).toISOString();
      }

      // We need the group's collector_id for the group membership
      const selectedGroup = groups.find((g) => g.id === approveForm.groupId) as any;
      const targetCollectorId = selectedGroup?.collector_id || userId;

      const result = await approveContributor(
        approveTarget.id,
        approveForm.groupId,
        targetCollectorId,
        startDateISO
      );
      
      if (result.error) {
        setApproveError(result.error);
        return;
      }

      // Step 3: Create contribution cycle placeholders
      if (selectedGroup) {
        await createContributionCycles(
          approveTarget.id,
          targetCollectorId,
          approveForm.groupId,
          selectedGroup.total_days
        );
      }
      
      setApproveSuccess(true);
      await refreshContributors();
      // Keep open for a second to show success, or close immediately
      setTimeout(() => setApproveDialogOpen(false), 1000);
    });
  }

  // ── Delete helpers ────────────────────────────────────────────────────────
  function openDelete(c: Contributor) {
    setDeleteTarget(c);
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget || !userId) return;
    startTransition(async () => {
      const result = await deleteContributor(deleteTarget.contributor_id);
      if (result.error) return; // silently fail or could show toast
      await refreshContributors();
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    });
  }

  function openPendingDelete(p: PendingContributor) {
    setPendingDeleteTarget(p);
    setPendingDeleteDialogOpen(true);
  }

  async function handlePendingDelete() {
    if (!pendingDeleteTarget || !userId) return;
    startTransition(async () => {
      const result = await deleteContributor(pendingDeleteTarget.id);
      if (result.error) return; // silently fail or could show toast
      await refreshContributors();
      setPendingDeleteDialogOpen(false);
      setPendingDeleteTarget(null);
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Sticky header */}
      <div className="sticky top-[64px] lg:top-16 z-10 bg-background/95  pb-4 pt-1 -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 border-b border-border mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {t("manageContributors")}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {contributors.length} {t("membersAcrossGroups")}
            </p>
          </div>
          <Button
            onClick={() => setAddDialogOpen(true)}
            id="add-contributor-btn"
            className="gap-2 shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            {t("addContributor")}
          </Button>
        </div>
        <div className="ethiopian-divider mt-3 w-24" />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchContributors")}
          className="pl-10"
          id="contributor-search"
        />
      </div>

      {/* Contributors table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium">
            {search ? t("noResultsFound") : t("noContributorsYet")}
          </p>
          {!search && (
            <p className="text-sm text-muted-foreground mt-1">
              {t("clickAddContributor")}
            </p>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                      {t("contributor")}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground hidden sm:table-cell">
                      {t("phone")}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground hidden md:table-cell">
                      {t("groupName")}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground hidden md:table-cell">
                      {t("amount")}
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                      {t("actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => handleRowClick(c)}
                      className="border-b border-border hover:bg-muted/30 transition-colors group cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-bold shrink-0">
                            {(
                              c.contributor?.full_name ?? "?"
                            )[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">
                              {c.contributor?.full_name ?? "—"}
                            </p>
                            <p className="text-xs text-muted-foreground sm:hidden">
                              {c.contributor?.phone_number}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {c.contributor?.phone_number ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Badge variant="info">{c.group?.name ?? "—"}</Badge>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell font-semibold text-emerald-600">
                        ETB{" "}
                        {(c.group?.contribution_amount ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title={t("editContributor")}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(c);
                            }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title={t("deleteContributor")}
                            onClick={(e) => {
                              e.stopPropagation();
                              openDelete(c);
                            }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════ Pending Invitations ══════════════════ */}
      {pendingContributors.length > 0 && (
        <Card className="border border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-foreground">Pending Invitations ({pendingContributors.length})</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              These contributors have registered and are waiting to be approved and assigned to an Equb Group.
            </p>
            <div className="space-y-2">
              {pendingContributors.map((p) => {
                const link = `https://t.me/TeqemachBot?start=link_${p.id}`;
                return (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.phone_number} · @{p.telegram_username}
                      </p>
                      {p.requested_group_name && (
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                          <span>Requested Equb:</span>
                          <span className="font-bold">{p.requested_group_name}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        className="h-7 text-[11px] px-2.5 rounded-md gap-1 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => openApprove(p)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                      <button
                        type="button"
                        title="Delete invitation"
                        onClick={() => openPendingDelete(p)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <Badge variant="outline" className="text-amber-600 border-amber-500/30 text-[10px]">
                        Pending
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      {/* ══════════════════ Approve Pending Dialog ══════════════════ */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Approve Contributor
            </DialogTitle>
            <DialogDescription>
              Assign {approveTarget?.full_name} to an Equb Group to complete their registration.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleApprove} className="space-y-4">
            {approveError && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{approveError}</span>
              </div>
            )}
            {approveSuccess && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Contributor Approved Successfully!</span>
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="approve-group" className="text-xs">
                  Equb Group <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={approveForm.groupId}
                  onValueChange={(v) => updateApprove("groupId", v)}
                >
                  <SelectTrigger id="approve-group" className="h-9">
                    <SelectValue placeholder="Choose a group..." />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        {t("noEqubGroups")}
                      </div>
                    ) : (
                      groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name} ({g.total_days} {t("days")})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <EthiopianDatePicker
                  label={t("startDate")}
                  value={approveForm.startDate}
                  onChange={(val) => updateApprove("startDate", val)}
                  locale={locale}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setApproveDialogOpen(false)}
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isPending ? "Approving..." : "Approve Contributor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* ══════════════════ Add Contributor Dialog ══════════════════ */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              {t("addContributor")}
            </DialogTitle>
            <DialogDescription>
              {t("registerNewContributor")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-5">
            {addError && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{addError}</span>
              </div>
            )}
            {addSuccess && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{t("contributorAddedSuccess")}</span>
              </div>
            )}

            {/* ── Success Link Section ── */}
            {addGeneratedLink && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                <p className="text-sm text-foreground font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Contributor Added! Share this link with them to connect their Telegram:
                </p>
                <div className="flex gap-2">
                  <Input readOnly value={addGeneratedLink} className="bg-background text-xs font-mono" />
                  <Button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(addGeneratedLink);
                      setAddSuccess(true);
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            )}

            {/* ── Personal Info Section ── */}
            <div className={`space-y-3 ${addGeneratedLink ? "hidden" : ""}`}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {t("personalInfo")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="add-name" className="text-xs">
                    {t("fullName")}
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="add-name"
                      value={addForm.fullName}
                      onChange={(e) => updateAdd("fullName", e.target.value)}
                      placeholder="Abebe Kebede"
                      className="pl-10 h-9"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="add-phone" className="text-xs">
                    {t("phone")}
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="add-phone"
                      value={addForm.phoneNumber}
                      onChange={(e) => updateAdd("phoneNumber", e.target.value)}
                      placeholder="+251911234567"
                      className="pl-10 h-9"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="add-tg-user" className="text-xs">
                    Telegram Username
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="add-tg-user"
                      value={addForm.telegramUsername}
                      onChange={(e) => updateAdd("telegramUsername", e.target.value)}
                      placeholder="@username"
                      className="pl-10 h-9"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Account Section ── */}
            <div className={`space-y-3 ${addGeneratedLink ? "hidden" : ""}`}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                {t("accountCredentials")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="add-email" className="text-xs">
                    {t("email")} (Optional)
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="add-email"
                      type="email"
                      value={addForm.email}
                      onChange={(e) => updateAdd("email", e.target.value)}
                      placeholder="user@example.com"
                      className="pl-10 h-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="add-password" className="text-xs">
                    {t("password")} (Optional)
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="add-password"
                      type="password"
                      value={addForm.password}
                      onChange={(e) => updateAdd("password", e.target.value)}
                      placeholder={t("minSixChars")}
                      className="pl-10 h-9"
                      minLength={6}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Group & Schedule Section ── */}
            <div className={`space-y-3 ${addGeneratedLink ? "hidden" : ""}`}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {t("groupAndSchedule")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("selectEqubGroup")}</Label>
                  <Select
                    value={addForm.groupId}
                    onValueChange={(v) => updateAdd("groupId", v)}
                  >
                    <SelectTrigger id="select-group" className="h-9">
                      <SelectValue placeholder="Choose a group..." />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          {t("noEqubGroups")}
                        </div>
                      ) : (
                        groups.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name} ({g.total_days} {t("days")})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <EthiopianDatePicker
                    label={t("startDate")}
                    value={addForm.startDate}
                    onChange={(val) => updateAdd("startDate", val)}
                    locale={locale}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setAddDialogOpen(false);
                  setAddGeneratedLink(null);
                  setAddForm({
                    fullName: "",
                    phoneNumber: "",
                    email: "",
                    password: "",
                    telegramUsername: "",
                    groupId: "",
                    startDate: todayECStr,
                  });
                }}
              >
                {addGeneratedLink ? "Close" : t("cancel")}
              </Button>
              {!addGeneratedLink && (
                <Button
                  type="submit"
                  disabled={isPending}
                  id="confirm-add-contributor"
                >
                  {isPending ? "Adding..." : t("addContributor")}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ══════════════════ Edit Contributor Dialog ══════════════════ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              {t("editContributor")}
            </DialogTitle>
            <DialogDescription>
              {t("updateContributorProfile")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            {editError && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}
            {editSuccess && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{t("contributorUpdated")}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-xs">
                  {t("fullName")}
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="edit-name"
                    value={editForm.fullName}
                    onChange={(e) => updateEdit("fullName", e.target.value)}
                    className="pl-10 h-9"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-phone" className="text-xs">
                  {t("phone")}
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="edit-phone"
                    value={editForm.phoneNumber}
                    onChange={(e) => updateEdit("phoneNumber", e.target.value)}
                    className="pl-10 h-9"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-email" className="text-xs">
                {t("email")}
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => updateEdit("email", e.target.value)}
                  className="pl-10 h-9"
                  required
                />
              </div>
            </div>

            <EthiopianDatePicker
              label={t("startDate")}
              value={editForm.startDate}
              onChange={(val) => updateEdit("startDate", val)}
              locale={locale}
            />

            {editTarget?.group && (
              <div className="rounded-xl bg-muted/50 border border-border p-3 flex items-center gap-3">
                <Badge variant="info" className="shrink-0">
                  {editTarget.group.name}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  ETB {editTarget.group.contribution_amount.toLocaleString()} ·{" "}
                  {editTarget.group.total_days} {t("days")} ·{" "}
                  {t(editTarget.group.frequency as any) || editTarget.group.frequency}
                </span>
              </div>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditDialogOpen(false)}
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                id="confirm-edit-contributor"
              >
                {isPending ? t("loading") : t("update")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ══════════════════ Delete Confirmation Dialog ══════════════════ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t("deleteContributor")}
            </DialogTitle>
            <DialogDescription>
              {t("deleteContributorConfirm")}
            </DialogDescription>
          </DialogHeader>

          {deleteTarget && (
            <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-sm font-bold shrink-0">
                {(
                  deleteTarget.contributor?.full_name ?? "?"
                )[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-sm">
                  {deleteTarget.contributor?.full_name ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {deleteTarget.contributor?.phone_number} ·{" "}
                  {deleteTarget.group?.name}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteDialogOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
              id="confirm-delete-contributor"
            >
              {isPending ? t("loading") : t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ══════════════════ Delete Pending Confirmation Dialog ══════════════════ */}
      <Dialog open={pendingDeleteDialogOpen} onOpenChange={setPendingDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Invitation
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this pending invitation? They will no longer be able to use the invitation link.
            </DialogDescription>
          </DialogHeader>

          {pendingDeleteTarget && (
            <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-sm font-bold shrink-0">
                {(
                  pendingDeleteTarget.full_name ?? "?"
                )[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-sm">
                  {pendingDeleteTarget.full_name ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {pendingDeleteTarget.phone_number} · @{pendingDeleteTarget.telegram_username}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPendingDeleteDialogOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handlePendingDelete}
              disabled={isPending}
            >
              {isPending ? t("loading") : t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
