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
  Smartphone,
  RefreshCw,
  Eye,
  EyeOff,
  Play,
  Globe,
  ExternalLink,
} from "lucide-react";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { signIn } from "@/lib/actions/auth";

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
  | "needs_phone"
  | "contributor_login"
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

  // UI tab state
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showHowToUse, setShowHowToUse] = useState(false);

  // Link form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Contributor registration state
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [availableGroups, setAvailableGroups] = useState<EqubGroup[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCollector, setSelectedCollector] = useState<Collector | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<EqubGroup | null>(null);
  const [collectorsLoading, setCollectorsLoading] = useState(false);
  const [phoneCheckLoading, setPhoneCheckLoading] = useState(false);
  const [hasSharedPhone, setHasSharedPhone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // The Telegram Web App SDK loads asynchronously via next/script.
    // Poll until it's available (up to 3 seconds) before giving up.
    let attempts = 0;
    const maxAttempts = 30; // 30 × 100ms = 3 seconds

    const timer = setInterval(() => {
      attempts++;
      const tg = window.Telegram?.WebApp;
      if (tg && tg.initData) {
        clearInterval(timer);
        setInitData(tg.initData);
        checkTelegramLogin(tg.initData);
      } else if (attempts >= maxAttempts) {
        clearInterval(timer);
        setStep("error");
        setErrorMsg("Please open this app inside Telegram.");
      }
    }, 100);

    return () => clearInterval(timer);
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

      if (!res.ok) throw new Error(result.error || "Auto-login failed");

      if (result.explicitLogout) {
        setStep("contributor_login");
        return;
      }

      // Track if phone is verified
      if (!result.needsPhone) {
        setHasSharedPhone(true);
      }

      if (result.linked && result.multiRole) {
        // Multiple roles — show role picker
        setRoles(result.roles || []);
        setAvailableNewRoles(result.availableNewRoles || []);
        setStep("role_picker");
      } else if (result.linked && result.redirect) {
        router.push(result.redirect);
      } else {
        // Unlinked new user — show Contributor Login page
        setStep("contributor_login");
      }
    } catch (err: any) {
      setStep("error");
      setErrorMsg(err.message);
    }
  }

  function handleRegisterClick() {
    setErrorMsg(null);
    if (!hasSharedPhone) {
      setStep("needs_phone");
    } else {
      startContributorRegistration();
    }
  }

  async function handlePhonePasswordLogin(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!phone && !email) {
      setErrorMsg("Please enter your phone number.");
      return;
    }
    if (!password) {
      setErrorMsg("Please enter your password.");
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await signIn({ phone, email, password });
      if (res?.error) {
        setErrorMsg(res.error);
        setIsSubmitting(false);
        return;
      }
      if (res?.role === "admin" || res?.role === "collector") {
        localStorage.removeItem("teqemach_explicit_logout");
        window.location.href = "/dashboard/admin";
      } else {
        localStorage.removeItem("teqemach_explicit_logout");
        window.location.href = "/dashboard/contributor";
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Login failed");
      setIsSubmitting(false);
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
        localStorage.removeItem("teqemach_explicit_logout");
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
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/telegram/mini-app-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, action: "register_contributor" }),
      });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Registration failed");
      
      // Navigate to contributor dashboard where they can see groups
      if (result.redirect) {
        router.push(result.redirect);
      } else {
        setStep("contributor_success");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
      setIsSubmitting(false);
    }
  }

  async function handleRegisterContributor() {
    if (!selectedGroup) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/telegram/mini-app-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initData,
          action: "register_contributor",
          collectorId: selectedCollector?.id || selectedGroup.collector_id || "admin",
          groupId: selectedGroup.id,
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
        localStorage.removeItem("teqemach_explicit_logout");
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

  // Check if phone number has been shared via bot
  async function checkPhoneStatus() {
    if (!initData) return;
    setPhoneCheckLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/telegram/mini-app-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, action: "check_phone" }),
      });
      const result = await res.json();
      if (result.hasPhone) {
        setHasSharedPhone(true);
        startContributorRegistration();
      } else {
        setErrorMsg("Phone number not received yet. Please share your number with the bot first.");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setPhoneCheckLoading(false);
    }
  }

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
      setStep("contributor_login");
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md z-10 bg-card border border-border rounded-2xl p-8 shadow-xl animate-fadeInUp">

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
              className="w-full h-12 text-md font-bold bg-primary hover:bg-brand-700 text-white mb-3"
              onClick={() => (window.location.href = "https://t.me/TeqemachBot")}
            >
              <svg className="w-5 h-5 mr-2 fill-current" viewBox="0 0 24 24">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.892-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              Open in Telegram
            </Button>

            {/* Direct Browser Dev Testing Bypass */}
            <div className="pt-4 border-t border-border mt-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                🛠️ Testing Locally in Browser?
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="w-full text-xs font-semibold h-10 border-primary/30 hover:bg-primary/5"
                  onClick={() => router.push("/dashboard/contributor")}
                >
                  📱 Test Contributor Mini App View
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-xs font-semibold h-10 border-indigo-500/30 hover:bg-indigo-500/5"
                  onClick={() => router.push("/dashboard/admin")}
                >
                  👑 Test Admin Dashboard View
                </Button>
              </div>
            </div>
          </div>
        )}


        {/* ─── CONTRIBUTOR AUTH SCREEN (MATCHING REFERENCE UI DESIGN) ────── */}
        {step === "contributor_login" && (
          <div className="py-2 space-y-6">
            {/* Top Right Language Selector */}
            <div className="flex justify-end -mt-2 -mr-2 mb-2">
              <div className="bg-muted/50 rounded-full px-1 border border-border/40">
                <LanguageToggle />
              </div>
            </div>

            {/* Brand Logo & Name */}
            <div className="flex flex-col items-center justify-center space-y-2 mb-6">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-xl shadow-blue-500/20">
                <Coins className="h-9 w-9 text-white" />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                ተቀማጭ <span className="text-sm font-medium text-muted-foreground">(Teqemach)</span>
              </h1>
            </div>

            {/* Segmented Tab Pill Toggle (Login / Register) */}
            <div className="bg-muted/80 p-1.5 rounded-2xl flex border border-border/60 shadow-inner">
              <button
                type="button"
                onClick={() => setAuthTab("login")}
                className={`flex-1 py-3 text-sm rounded-xl transition-all duration-200 ${
                  authTab === "login"
                    ? "bg-card text-foreground font-bold shadow-md border border-border/40"
                    : "text-muted-foreground hover:text-foreground font-medium"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab("register");
                  handleRegisterClick();
                }}
                className={`flex-1 py-3 text-sm rounded-xl transition-all duration-200 ${
                  authTab === "register"
                    ? "bg-card text-foreground font-bold shadow-md border border-border/40"
                    : "text-muted-foreground hover:text-foreground font-medium"
                }`}
              >
                Register
              </button>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive text-left">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* ── TAB 1: LOGIN VIEW ── */}
            {authTab === "login" && (
              <form onSubmit={handlePhonePasswordLogin} className="space-y-5 animate-fadeIn">
                {/* Phone Number Field */}
                <div className="space-y-2 text-left">
                  <Label htmlFor="phone-input" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Phone Number
                  </Label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-xs font-bold text-muted-foreground">
                      +251
                    </span>
                    <Input
                      id="phone-input"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter your phone number"
                      className="pl-14 pr-10 h-12 text-sm rounded-2xl border-border bg-card/50"
                    />
                    <Phone className="absolute right-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2 text-left">
                  <Label htmlFor="pass-input" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Password
                  </Label>
                  <div className="relative flex items-center">
                    <Input
                      id="pass-input"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="pr-10 h-12 text-sm rounded-2xl border-border bg-card/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="text-right pt-1">
                    <button
                      type="button"
                      onClick={() => setErrorMsg("Please contact your Equb admin to reset your password.")}
                      className="text-xs font-bold text-emerald-500 hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </div>

                {/* Submit Login Button */}
                <Button
                  type="submit"
                  className="w-full h-14 text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl shadow-blue-600/20 rounded-2xl transition-all active:scale-[0.98]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Login"
                  )}
                </Button>

                {/* Footer Register Prompt */}
                <div className="text-center pt-2 text-xs text-muted-foreground font-medium">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab("register");
                      handleRegisterClick();
                    }}
                    className="text-emerald-500 font-bold hover:underline"
                  >
                    Register
                  </button>
                </div>

              </form>
            )}

            {/* ── TAB 2: REGISTER VIEW ── */}
            {authTab === "register" && (
              <div className="space-y-4 animate-fadeIn">
                {!hasSharedPhone ? (
                  <div className="space-y-4 py-2">
                    <p className="text-xs text-muted-foreground text-center">
                      Step 1: Verify your phone number with Telegram to start registering.
                    </p>
                    <Button
                      className="w-full h-13 text-sm font-bold bg-primary hover:bg-brand-700 text-white rounded-2xl"
                      onClick={() => {
                        const tg = window.Telegram?.WebApp;
                        if (tg && tg.requestContact) {
                          tg.requestContact((shared: boolean) => {
                            if (shared) setTimeout(checkPhoneStatus, 1500);
                          });
                        } else {
                          window.open("https://t.me/TeqemachBot?start=share_phone", "_blank");
                        }
                      }}
                    >
                      <Smartphone className="h-5 w-5 mr-2" />
                      Share Phone Number
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full h-11 text-xs rounded-2xl"
                      onClick={checkPhoneStatus}
                      disabled={phoneCheckLoading}
                    >
                      {phoneCheckLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      I&apos;ve Shared My Number
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 py-2">
                    <Button
                      className="w-full h-13 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl"
                      onClick={() => startContributorRegistration()}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Complete Registration"}
                    </Button>
                  </div>
                )}

                <div className="text-center pt-2 text-xs text-muted-foreground font-medium">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setAuthTab("login")}
                    className="text-emerald-500 font-bold hover:underline"
                  >
                    Login
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center pt-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setShowHowToUse(true)}
                    className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800/60 px-4 py-2 rounded-full border border-slate-700/60 transition-all"
                  >
                    <Play className="h-3.5 w-3.5 fill-current text-blue-400" />
                    How to Use
                  </button>
                  <a
                    href="/admin-secure"
                    className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800/60 px-4 py-2 rounded-full border border-slate-700/60 transition-all"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-violet-400" />
                    Admin
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── NEEDS PHONE ─────────────────────────────────────────── */}
        {step === "needs_phone" && (
          <div className="text-center py-4">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Smartphone className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-foreground">Phone Number Required</h2>
            <p className="text-muted-foreground mb-6">
              To continue, we need your verified phone number from Telegram. Tap the button below to share it with our bot.
            </p>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive mb-4 text-left">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-3">
              <Button
                className="w-full h-12 text-md font-bold bg-primary hover:bg-brand-700 text-white"
                onClick={() => {
                  const tg = window.Telegram?.WebApp;
                  if (tg && tg.requestContact) {
                    tg.requestContact((shared: boolean) => {
                      if (shared) {
                        // User accepted native prompt; webhook will receive the contact.
                        // Give it a moment to process, then auto-check.
                        setTimeout(checkPhoneStatus, 1500);
                      }
                    });
                  } else {
                    window.open("https://t.me/TeqemachBot?start=share_phone", "_blank");
                  }
                }}
              >
                <Smartphone className="h-5 w-5 mr-2" />
                Share Phone Number
              </Button>

              <Button
                variant="outline"
                className="w-full h-12 text-md"
                onClick={checkPhoneStatus}
                disabled={phoneCheckLoading}
              >
                {phoneCheckLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    I&apos;ve Shared My Number
                  </>
                )}
              </Button>
            </div>
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
                className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                onClick={() => startContributorRegistration()}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continue as Contributor"}
              </Button>
            </div>
          </div>
        )}


        {/* ─── ROLE PICKER (multi-role user) ──────────────────────── */}
        {step === "role_picker" && (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Select Your Role</h2>
            <p className="text-muted-foreground mb-6">
              Choose an account to log in to, or register a new role.
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

        {/* ─── CONTRIBUTOR FLOW: PICK GROUP DIRECTLY (NO COLLECTORS) ───── */}
        {step === "contributor_pick_group" && (
          <div>
            <Button
              variant="ghost"
              className="mb-4 text-muted-foreground -ml-4 gap-1"
              onClick={() => setStep("contributor_login")}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
            <h2 className="text-xl font-bold mb-1 text-foreground">Select Equb Group</h2>
            <p className="text-muted-foreground text-sm mb-4">Choose an Equb group to join</p>

            <div className="border border-border/60 rounded-2xl max-h-72 overflow-y-auto bg-card divide-y border-border/40">
              {collectorsLoading ? (
                <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center">
                  <Loader2 className="h-6 w-6 animate-spin mb-2 text-primary" />
                  Loading Equb groups...
                </div>
              ) : availableGroups.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No Equb groups available right now.
                </div>
              ) : (
                availableGroups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => {
                      setSelectedGroup(group);
                      setSelectedCollector({ id: group.collector_id || "admin", full_name: "Teqemach Admin", email: null, groups: [] });
                      setErrorMsg(null);
                      setStep("contributor_confirm");
                    }}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0 shadow-md">
                        <Coins className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-foreground">{group.name}</div>
                        <div className="text-xs font-semibold text-emerald-500 mt-0.5">
                          ETB {group.contribution_amount.toLocaleString()} · {group.frequency}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* ─── CONTRIBUTOR FLOW: CONFIRM ──────────────────── */}
        {step === "contributor_confirm" && selectedGroup && (
          <div>
            <Button
              variant="ghost"
              className="mb-4 text-muted-foreground -ml-4 gap-1"
              onClick={() => setStep("contributor_pick_group")}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Groups
            </Button>
            <h2 className="text-xl font-bold mb-1 text-foreground">Confirm & Register</h2>
            <p className="text-muted-foreground text-sm mb-4">Review and submit your registration</p>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive mb-4">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 text-sm space-y-2 mb-6">
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Selected Equb Group</div>
              <div className="text-base font-extrabold text-foreground">{selectedGroup.name}</div>
              <div className="text-xs font-bold text-emerald-500">
                Contribution: ETB {selectedGroup.contribution_amount.toLocaleString()} ({selectedGroup.frequency})
              </div>
            </div>

            <div className="space-y-4">
              <Button
                className="w-full h-13 text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl shadow-lg"
                onClick={handleRegisterContributor}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
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

      {/* ─── HOW TO USE GUIDANCE MODAL ───────────────────────────────────── */}
      {showHowToUse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70  animate-fadeIn">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center mx-auto">
              <Play className="h-6 w-6 fill-current" />
            </div>
            <h3 className="text-xl font-bold text-foreground">How to Use Teqemach</h3>
            <div className="text-xs text-muted-foreground space-y-2 text-left bg-muted/40 p-4 rounded-2xl border border-border/50">
              <p>1. <strong>Register / Share Phone</strong>: Connect your Telegram phone number to create your profile.</p>
              <p>2. <strong>Join Equb Group</strong>: Select your preferred Equb Collector and choose a Daily, Weekly, or Monthly group.</p>
              <p>3. <strong>Track Contributions</strong>: Make regular payments, track cycle progress, and receive payouts digitally.</p>
            </div>
            <Button
              className="w-full h-11 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
              onClick={() => setShowHowToUse(false)}
            >
              Got it!
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
