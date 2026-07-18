"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Coins,
  Mail,
  Lock,
  Phone,
  AlertCircle,
  Loader2,
  Loader2Icon,
  Search,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  UserCircle2,
  ShieldCheck,
  Users,
} from "lucide-react";

type EqubGroup = {
  id: string;
  name: string;
  contribution_amount: number;
  total_days: number;
  frequency: string;
  collector_id: string;
};

type Collector = {
  id: string;
  full_name: string | null;
  email: string | null;
  groups: EqubGroup[];
};

type RoleInfo = {
  id: string;
  role: string;
  full_name: string;
  status: string;
};

type Step =
  | "init"
  | "loading"
  | "options"
  | "new_user"
  | "role_picker"
  | "existing_user"
  | "contributor_pick_collector"
  | "contributor_pick_group"
  | "contributor_confirm"
  | "contributor_success"
  | "error";

export default function LoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("init");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [initData, setInitData] = useState<string | null>(null);

  // Multi-role state
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [availableNewRoles, setAvailableNewRoles] = useState<string[]>([]);

  // Link form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Contributor registration state
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCollector, setSelectedCollector] = useState<Collector | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<EqubGroup | null>(null);
  const [phone, setPhone] = useState("");
  const [collectorsLoading, setCollectorsLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const timer = setTimeout(() => {
      const tg = window.Telegram?.WebApp;
      if (tg && tg.initData) {
        setInitData(tg.initData);
        checkTelegramLogin(tg.initData);
      } else {
        setStep("error");
        setErrorMsg("Please open this app inside Telegram.");
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  async function checkTelegramLogin(data: string) {
    setStep("loading");
    try {
      const res = await fetch("/api/telegram/mini-app-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: data, action: "login" }),
      });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Authentication failed");
      }

      if (result.linked && result.multiRole) {
        // Multiple roles — show role picker
        setRoles(result.roles || []);
        setAvailableNewRoles(result.availableNewRoles || []);
        setStep("role_picker");
      } else if (result.linked && result.redirect) {
        router.push(result.redirect);
      } else {
        // Not linked — show options
        setStep("options");
      }
    } catch (err: any) {
      setStep("error");
      setErrorMsg(err.message);
    }
  }

  async function handleSelectRole(profileId: string) {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/telegram/mini-app-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, action: "select_role", profileId }),
      });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Login failed");
      if (result.redirect) {
        router.push(result.redirect);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
      setIsSubmitting(false);
    }
  }

  async function handleRegisterCollector() {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/telegram/mini-app-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, action: "register", role: "collector" }),
      });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Registration failed");
      if (result.redirect) {
        router.push(result.redirect);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
      setIsSubmitting(false);
    }
  }

  async function startContributorRegistration() {
    setErrorMsg(null);
    setCollectorsLoading(true);
    setStep("contributor_pick_collector");
    try {
      const res = await fetch("/api/telegram/mini-app-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, action: "get_collectors" }),
      });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Failed to load collectors");
      setCollectors(result.data || []);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setCollectorsLoading(false);
    }
  }

  async function handleRegisterContributor() {
    if (!selectedCollector || !selectedGroup) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/telegram/mini-app-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initData,
          action: "register_contributor",
          collectorId: selectedCollector.id,
          groupId: selectedGroup.id,
          phone: phone || "",
        }),
      });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Registration failed");
      setStep("contributor_success");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLinkAccount(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/telegram/mini-app-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, action: "link", email, password }),
      });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Linking failed");
      if (result.redirect) {
        router.push(result.redirect);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
      setIsSubmitting(false);
    }
  }

  const filteredCollectors = collectors.filter((c) => {
    const searchLower = search.toLowerCase();
    const nameMatch = c.full_name ? c.full_name.toLowerCase().includes(searchLower) : false;
    const emailMatch = c.email ? c.email.toLowerCase().includes(searchLower) : false;
    return nameMatch || emailMatch;
  });

  // Helper to figure out which step is part of the contributor flow
  const isContributorFlow = [
    "contributor_pick_collector",
    "contributor_pick_group",
    "contributor_confirm",
  ].includes(step);

  // Back handler for contributor flow
  function handleContributorBack() {
    setErrorMsg(null);
    if (step === "contributor_confirm") {
      setStep("contributor_pick_group");
    } else if (step === "contributor_pick_group") {
      setSelectedCollector(null);
      setSelectedGroup(null);
      setStep("contributor_pick_collector");
    } else if (step === "contributor_pick_collector") {
      setSelectedCollector(null);
      setSelectedGroup(null);
      setSearch("");
      // Go back to new_user or role_picker depending on whether they have existing roles
      if (roles.length > 0) {
        setStep("role_picker");
      } else {
        setStep("new_user");
      }
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md z-10 bg-card border border-border rounded-2xl p-8 shadow-xl animate-fadeInUp">
        <div className="flex justify-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-hero shadow-md">
            <Coins className="h-6 w-6 text-white" />
          </div>
        </div>

        {/* ─── LOADING ─────────────────────────────────────────────── */}
        {(step === "init" || step === "loading") && (
          <div className="flex flex-col items-center py-8">
            <Loader2Icon className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground font-medium">Loading Telegram...</p>
          </div>
        )}

        {/* ─── ERROR ───────────────────────────────────────────────── */}
        {step === "error" && (
          <div className="text-center py-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-foreground">Access Denied</h2>
            <p className="text-muted-foreground mb-6">
              {errorMsg || "Teqemach is a Telegram Mini App. Please open it inside Telegram to continue."}
            </p>
            <Button
              className="w-full h-12 text-md font-bold bg-[#2481cc] hover:bg-[#1d6ba8] text-white"
              onClick={() => (window.location.href = "https://t.me/TeqemachBot")}
            >
              <svg className="w-5 h-5 mr-2 fill-current" viewBox="0 0 24 24">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.892-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              Open in Telegram
            </Button>
          </div>
        )}

        {/* ─── OPTIONS (new user, not linked) ─────────────────────── */}
        {step === "options" && (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Welcome to Teqemach 👋</h2>
            <p className="text-muted-foreground mb-8">Your Telegram account is connected.</p>

            <div className="space-y-4">
              <Button className="w-full h-12 text-md" onClick={() => setStep("new_user")}>
                I am a New User
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 text-md"
                onClick={() => setStep("existing_user")}
              >
                Link Existing Account
              </Button>
            </div>
          </div>
        )}

        {/* ─── NEW USER — CHOOSE ROLE ─────────────────────────────── */}
        {step === "new_user" && (
          <div className="text-center">
            <Button
              variant="ghost"
              className="mb-4 text-muted-foreground self-start"
              onClick={() => {
                setStep("options");
                setErrorMsg(null);
              }}
              disabled={isSubmitting}
            >
              &larr; Back
            </Button>
            <h2 className="text-2xl font-bold mb-2">Choose Account Type</h2>
            <p className="text-muted-foreground mb-8">Select your role to get started.</p>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive mb-6 text-left">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-4">
              <Button
                className="w-full h-14 text-lg"
                onClick={() => startContributorRegistration()}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Contributor"}
              </Button>
              <Button
                variant="secondary"
                className="w-full h-14 text-lg"
                onClick={() => handleRegisterCollector()}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Collector"}
              </Button>
            </div>
          </div>
        )}

        {/* ─── ROLE PICKER (multi-role user) ──────────────────────── */}
        {step === "role_picker" && (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Select Your Role</h2>
            <p className="text-muted-foreground mb-6">
              You have multiple accounts. Choose which to open.
            </p>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive mb-4 text-left">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-3">
              {roles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleSelectRole(r.id)}
                  disabled={isSubmitting || r.status === "pending" || r.status === "rejected"}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    r.role === "collector"
                      ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                      : "bg-gradient-to-br from-indigo-500 to-blue-600"
                  }`}>
                    {r.role === "collector" ? (
                      <ShieldCheck className="h-5 w-5 text-white" />
                    ) : (
                      <Users className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm capitalize">{r.role}</div>
                    <div className="text-xs text-muted-foreground">{r.full_name}</div>
                    {r.status === "pending" && (
                      <div className="text-xs text-amber-500 mt-0.5">Pending approval</div>
                    )}
                    {r.status === "rejected" && (
                      <div className="text-xs text-destructive mt-0.5">Rejected</div>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>

            {/* Register as new role */}
            {availableNewRoles.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide">
                  Register as another role
                </p>
                <div className="space-y-2">
                  {availableNewRoles.includes("collector") && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleRegisterCollector()}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <ShieldCheck className="h-4 w-4 mr-2" />
                      )}
                      Register as Collector
                    </Button>
                  )}
                  {availableNewRoles.includes("contributor") && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => startContributorRegistration()}
                      disabled={isSubmitting}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Register as Contributor
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── CONTRIBUTOR FLOW: PICK COLLECTOR ───────────────────── */}
        {step === "contributor_pick_collector" && (
          <div>
            <Button
              variant="ghost"
              className="mb-4 text-muted-foreground -ml-4 gap-1"
              onClick={handleContributorBack}
              disabled={isSubmitting}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
            <h2 className="text-xl font-bold mb-1">Join a Savings Group</h2>
            <p className="text-muted-foreground text-sm mb-4">Step 1: Select a collector</p>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-4">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex-1">
                  <div
                    className={`h-1.5 rounded-full transition-colors ${
                      s === 1 ? "bg-primary" : "bg-muted"
                    }`}
                  />
                </div>
              ))}
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive mb-4">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="pl-10"
                />
              </div>

              <div className="border rounded-xl max-h-60 overflow-y-auto bg-card">
                {collectorsLoading ? (
                  <div className="p-6 flex flex-col items-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mb-2" />
                    <span className="text-sm">Loading collectors...</span>
                  </div>
                ) : filteredCollectors.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No collectors found.
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredCollectors.map((collector) => (
                      <button
                        key={collector.id}
                        onClick={() => {
                          setSelectedCollector(collector);
                          setSearch("");
                          if (collector.groups.length === 0) {
                            setErrorMsg(
                              "This collector has no equb groups yet. Please choose another."
                            );
                          } else {
                            setErrorMsg(null);
                            setStep("contributor_pick_group");
                          }
                        }}
                        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 text-left transition-colors"
                      >
                        <div>
                          <div className="font-medium text-sm">
                            {collector.full_name || "Unknown"}
                          </div>
                          <div className="text-xs text-muted-foreground">{collector.email}</div>
                          <div className="text-xs text-primary mt-0.5">
                            {collector.groups.length} group
                            {collector.groups.length !== 1 ? "s" : ""}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── CONTRIBUTOR FLOW: PICK GROUP ────────────────────────── */}
        {step === "contributor_pick_group" && selectedCollector && (
          <div>
            <Button
              variant="ghost"
              className="mb-4 text-muted-foreground -ml-4 gap-1"
              onClick={handleContributorBack}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Collectors
            </Button>
            <h2 className="text-xl font-bold mb-1">Select a Group</h2>
            <p className="text-muted-foreground text-sm mb-4">Step 2: Choose an equb group</p>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-4">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex-1">
                  <div
                    className={`h-1.5 rounded-full transition-colors ${
                      s <= 2 ? "bg-primary" : "bg-muted"
                    }`}
                  />
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-sm mb-4">
              Collector: <strong>{selectedCollector.full_name}</strong>
            </div>

            <div className="border rounded-xl max-h-60 overflow-y-auto bg-card">
              {selectedCollector.groups.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No groups available.
                </div>
              ) : (
                <div className="divide-y">
                  {selectedCollector.groups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => {
                        setSelectedGroup(group);
                        setErrorMsg(null);
                        setStep("contributor_confirm");
                      }}
                      className="w-full flex items-center justify-between p-3 hover:bg-muted/50 text-left transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0">
                          <Coins className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{group.name}</div>
                          <div className="text-xs text-muted-foreground">
                            ETB {group.contribution_amount.toLocaleString()} · {group.frequency} ·{" "}
                            {group.total_days} days
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── CONTRIBUTOR FLOW: CONFIRM & PHONE ──────────────────── */}
        {step === "contributor_confirm" && selectedCollector && selectedGroup && (
          <div>
            <Button
              variant="ghost"
              className="mb-4 text-muted-foreground -ml-4 gap-1"
              onClick={handleContributorBack}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Groups
            </Button>
            <h2 className="text-xl font-bold mb-1">Confirm & Register</h2>
            <p className="text-muted-foreground text-sm mb-4">Step 3: Review and submit</p>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-4">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex-1">
                  <div className="h-1.5 rounded-full bg-primary transition-colors" />
                </div>
              ))}
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive mb-4">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-sm space-y-1 mb-4">
              <div>
                Collector: <strong>{selectedCollector.full_name}</strong>
              </div>
              <div>
                Group: <strong>{selectedGroup.name}</strong>{" "}
                <span className="text-muted-foreground">
                  (ETB {selectedGroup.contribution_amount.toLocaleString()})
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (optional)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+251..."
                    className="pl-10"
                  />
                </div>
              </div>

              <Button
                className="w-full h-12"
                onClick={handleRegisterContributor}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  "Submit Registration"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ─── CONTRIBUTOR SUCCESS ─────────────────────────────────── */}
        {step === "contributor_success" && (
          <div className="text-center py-4 space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-foreground">Registration Submitted!</h3>
            <p className="text-sm text-muted-foreground">
              Your request to join <strong>{selectedGroup?.name}</strong> under{" "}
              <strong>{selectedCollector?.full_name}</strong> has been sent. The collector will
              review and approve your account.
            </p>
            <Button
              onClick={() => router.push("/login")}
              variant="outline"
              className="mt-4"
            >
              Go to Login
            </Button>
          </div>
        )}

        {/* ─── LINK EXISTING ACCOUNT ──────────────────────────────── */}
        {step === "existing_user" && (
          <div>
            <Button
              variant="ghost"
              className="mb-4 text-muted-foreground -ml-4"
              onClick={() => {
                setStep("options");
                setErrorMsg(null);
              }}
              disabled={isSubmitting}
            >
              &larr; Back
            </Button>
            <h2 className="text-2xl font-bold mb-2">Link Account</h2>
            <p className="text-muted-foreground mb-6">
              Enter your email and password to link your existing Teqemach account with this
              Telegram profile.
            </p>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive mb-6">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLinkAccount} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 mt-4" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                Link Account & Login
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
