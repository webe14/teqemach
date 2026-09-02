"use client";

import { useState, useEffect, useRef } from "react";
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
  ChevronLeft,
  ArrowLeft,
  CheckCircle2,
  UserCircle2,
  ShieldCheck,
  ShieldAlert,
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
import { AppLogo } from "@/components/ui/AppLogo";
import {
  signIn,
  getCurrentProfile,
  checkPhoneRegisteredAction,
  requestRegistrationOtpAction,
  verifyRegistrationOtpAction,
  registerWithPhoneOtpAction,
} from "@/lib/actions/auth";

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

  const [step, setStep] = useState<Step>("contributor_login");
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

  // OTP Registration state
  const [regStep, setRegStep] = useState<"phone" | "otp" | "profile">("phone");
  const [regPhone, setRegPhone] = useState("");
  const [regOtp, setRegOtp] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [regShowConfirmPassword, setRegShowConfirmPassword] = useState(false);
  const [regPreferredFrequency, setRegPreferredFrequency] = useState<"daily" | "weekly" | "monthly">("daily");
  const [regAgreedToTerms, setRegAgreedToTerms] = useState(true);
  const [resendTimer, setResendTimer] = useState(0);
  const [otpLoading, setOtpLoading] = useState(false);

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

  const isLoggingInRef = useRef(false);

  // Helper to extract Telegram initData from all available sources
  function getTelegramInitData(): string | null {
    if (typeof window === "undefined") return null;

    // 1. Check window.Telegram.WebApp.initData (official SDK)
    if (window.Telegram?.WebApp?.initData) {
      return window.Telegram.WebApp.initData;
    }

    // 2. Check URL hash fragment (#tgWebAppData=...)
    try {
      if (window.location.hash) {
        const hash = window.location.hash.replace(/^#/, "");
        const hashParams = new URLSearchParams(hash);
        const tgWebAppData = hashParams.get("tgWebAppData");
        if (tgWebAppData) {
          return tgWebAppData;
        }
      }
    } catch {
      // Ignore hash parse errors
    }

    // 3. Check Telegram cached sessionStorage ('__telegram__initParams')
    try {
      const stored = window.sessionStorage.getItem("__telegram__initParams");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.tgWebAppData) {
          return parsed.tgWebAppData;
        }
      }
    } catch {
      // Ignore sessionStorage parse errors
    }

    return null;
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    let timer: NodeJS.Timeout | null = null;
    let isCancelled = false;

    async function initAuth() {
      // Step 0: If user explicitly signed out, stay on the login page
      const urlParams = new URLSearchParams(window.location.search);
      const isLoggedOutUrl = urlParams.get("logged_out") === "true";
      const isLoggedOutLocal = localStorage.getItem("teqemach_explicit_logout") === "true";

      if (isLoggedOutUrl || isLoggedOutLocal) {
        setStep("contributor_login");
        return;
      }

      // Step 1: Check if user already has an active session cookie
      try {
        const profile = await getCurrentProfile();
        if (profile?.role && !isCancelled) {
          window.location.href = `/dashboard/${profile.role}`;
          return;
        }
      } catch {
        // Ignore and continue checking Telegram
      }

      // Step 2: Check immediately for Telegram initData
      const instantData = getTelegramInitData();
      if (instantData && !isCancelled) {
        setInitData(instantData);
        checkTelegramLogin(instantData);
        return;
      }

      // Step 3: Poll for Telegram WebApp initialization (up to 2.5 seconds)
      let attempts = 0;
      const maxAttempts = 30; // 30 * 80ms = 2.4s

      timer = setInterval(() => {
        if (isCancelled) return;
        attempts++;
        const currentData = getTelegramInitData();
        if (currentData) {
          if (timer) clearInterval(timer);
          setInitData(currentData);
          checkTelegramLogin(currentData);
        } else if (attempts >= maxAttempts) {
          if (timer) clearInterval(timer);
          // Only after waiting with no Telegram initData, show login form
          setStep("contributor_login");
        }
      }, 80);
    }

    initAuth();

    return () => {
      isCancelled = true;
      if (timer) clearInterval(timer);
    };
  }, []);

  async function checkTelegramLogin(data: string) {
    if (isLoggingInRef.current) return;
    isLoggingInRef.current = true;
    setStep("loading");
    try {
      const res = await fetch("/api/telegram/mini-app-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: data, action: "login" }),
      });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Auto-login failed");

      if (result.linked && result.redirect) {
        window.location.href = result.redirect;
        return;
      }

      if (result.linked && result.multiRole) {
        // Multiple roles — show role picker
        setRoles(result.roles || []);
        setAvailableNewRoles(result.availableNewRoles || []);
        setStep("role_picker");
        return;
      }

      // Track if phone is verified
      if (!result.needsPhone) {
        setHasSharedPhone(true);
      }

      if (result.needsPhone) {
        setStep("needs_phone");
      } else {
        // Unlinked new user — show Contributor Login page
        setStep("contributor_login");
      }
    } catch (err: any) {
      isLoggingInRef.current = false;
      // Gracefully show login page with the message
      setStep("contributor_login");
      setErrorMsg(err.message);
    }
  }

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [resendTimer]);

  async function handleSendCode(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setErrorMsg(null);
    const digits = regPhone.replace(/\D/g, "");
    if (!digits || digits.length < 9) {
      setErrorMsg("Please enter a valid phone number (e.g. 0912345678 or 0712345678).");
      return;
    }

    setOtpLoading(true);
    try {
      // 1. First check if phone number already exists in DB
      const checkRes = await checkPhoneRegisteredAction(regPhone);
      if (checkRes.error) {
        setErrorMsg(checkRes.error);
        setOtpLoading(false);
        return;
      }
      if (checkRes.exists) {
        setErrorMsg("This phone number is already registered in Wub Digital Equb. Please log in with your account.");
        setOtpLoading(false);
        return;
      }

      // 2. Dispatch OTP code via SMS gateway
      const res = await requestRegistrationOtpAction(regPhone);
      if (!res.success) {
        setErrorMsg(res.error || "Failed to send verification code. Please try again.");
        setOtpLoading(false);
        return;
      }

      setRegStep("otp");
      setResendTimer(45);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send verification code.");
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleVerifyCode(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setErrorMsg(null);
    if (!regOtp || regOtp.trim().length !== 6) {
      setErrorMsg("Please enter the complete 6-digit verification code.");
      return;
    }

    setOtpLoading(true);
    try {
      const res = await verifyRegistrationOtpAction(regPhone, regOtp.trim());
      if (!res.success) {
        setErrorMsg(res.error || "Invalid or expired verification code.");
        setOtpLoading(false);
        return;
      }

      setRegStep("profile");
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || "Verification failed.");
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleCompleteRegistration(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setErrorMsg(null);
    if (!regFullName || regFullName.trim().length < 2) {
      setErrorMsg("Please enter your full name.");
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMsg("Passwords do not match. Please re-enter your password.");
      return;
    }
    if (!regAgreedToTerms) {
      setErrorMsg("Please accept the Wub Digital Equb terms and rules to continue.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registerWithPhoneOtpAction({
        phone: regPhone,
        fullName: regFullName.trim(),
        email: regEmail.trim() || undefined,
        password: regPassword,
        role: "contributor",
      });

      if (res?.error) {
        setErrorMsg(res.error);
        setIsSubmitting(false);
        return;
      }

      // If inside Telegram, link with telegram profile
      if (initData) {
        try {
          await fetch("/api/telegram/mini-app-auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData, action: "login" }),
          });
        } catch {}
      }

      localStorage.removeItem("teqemach_explicit_logout");
      window.location.href = "/dashboard/contributor";
    } catch (err: any) {
      setErrorMsg(err.message || "Registration failed.");
      setIsSubmitting(false);
    }
  }

  function handleRegisterClick() {
    setErrorMsg(null);
    setRegStep("phone");
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

      // If in Telegram environment, ensure Telegram profile sync
      if (initData) {
        try {
          await fetch("/api/telegram/mini-app-auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData, action: "login" }),
          });
        } catch {
          // Non-blocking
        }
      }

      localStorage.removeItem("teqemach_explicit_logout");

      if (res?.role === "admin") {
        window.location.href = "/dashboard/admin";
      } else if (res?.role === "collector") {
        window.location.href = "/dashboard/collector";
      } else {
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



        {/* ─── CONTRIBUTOR AUTH SCREEN (MATCHING REFERENCE UI DESIGN) ────── */}
        {step === "contributor_login" && (
          <div className="py-2 space-y-6">
            {/* Top Right Language Selector */}
            <div className="flex justify-end -mt-2 -mr-2 mb-2">
              <div className="bg-white dark:bg-card rounded-full px-2 py-1 shadow-sm border border-border/60">
                <LanguageToggle />
              </div>
            </div>

            {/* Brand Logo & Name */}
            <div className="flex flex-col items-center justify-center space-y-2 mb-6">
              <AppLogo size="xl" rounded="2xl" className="shadow-xl border-slate-200" priority />
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-center">
                <span className="text-[#18244f] dark:text-[#9db3ed]">
                  ውብ ዲጂታል እቁብ
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#18244f]/80 dark:text-[#9db3ed]/80 block mt-1">
                  (Wub Digital Equb)
                </span>
              </h1>
            </div>

            {/* Segmented Tab Pill Toggle (Login / Register) */}
            <div className="bg-slate-100 p-1.5 rounded-2xl flex border border-slate-200 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setAuthTab("login");
                  setErrorMsg(null);
                }}
                className={`flex-1 py-3 text-sm rounded-xl transition-all duration-200 ${
                  authTab === "login"
                    ? "bg-primary text-white font-bold shadow-md shadow-primary/20"
                    : "text-slate-600 hover:text-slate-900 font-semibold"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab("register");
                  setRegStep("phone");
                  setErrorMsg(null);
                }}
                className={`flex-1 py-3 text-sm rounded-xl transition-all duration-200 ${
                  authTab === "register"
                    ? "bg-primary text-white font-bold shadow-md shadow-primary/20"
                    : "text-slate-600 hover:text-slate-900 font-semibold"
                }`}
              >
                Register
              </button>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive text-left animate-shake">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* ── TAB 1: LOGIN VIEW ── */}
            {authTab === "login" && (
              <form onSubmit={handlePhonePasswordLogin} className="space-y-4 animate-fadeIn">
                {/* Phone Number Field */}
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="phone-input" className="text-xs font-bold text-slate-900">
                    Phone Number
                  </Label>
                  <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-2xl shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden">
                    <span className="pl-3.5 pr-2 text-sm font-bold text-slate-900 select-none border-r border-slate-200">
                      +251
                    </span>
                    <Input
                      id="phone-input"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter your phone number"
                      className="pl-3 pr-10 h-12 text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none font-semibold text-slate-900 placeholder:text-slate-400"
                    />
                    <Phone className="absolute right-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="pass-input" className="text-xs font-bold text-slate-900">
                    Password
                  </Label>
                  <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-2xl shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden">
                    <Input
                      id="pass-input"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="px-4 pr-10 h-12 text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none font-semibold text-slate-900 placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-slate-400 hover:text-slate-900"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="text-right pt-0.5">
                    <button
                      type="button"
                      onClick={() => setErrorMsg("Please contact your Equb collector to reset your password.")}
                      className="text-xs font-bold text-emerald-600 hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </div>

                {/* Submit Login Button */}
                <Button
                  type="submit"
                  className="w-full h-14 text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl shadow-blue-600/20 rounded-2xl transition-all active:scale-[0.98] mt-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
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
                      setRegStep("phone");
                      setErrorMsg(null);
                    }}
                    className="text-emerald-500 font-bold hover:underline"
                  >
                    Register
                  </button>
                </div>

                {/* How to Use */}
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setShowHowToUse(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-900 dark:text-blue-300 hover:underline"
                  >
                    <Play className="w-3.5 h-3.5 fill-current text-brand-900 dark:text-blue-300" />
                    How to Use
                  </button>
                </div>

              </form>
            )}

            {/* ── TAB 2: REGISTER VIEW (WITH OTP & EXPANDED PROFILE ONBOARDING) ── */}
            {authTab === "register" && (
              <div className="space-y-4 animate-fadeIn text-left">
                {/* ── STEP 1: ENTER PHONE & SEND CODE ── */}
                {regStep === "phone" && (
                  <form onSubmit={handleSendCode} className="space-y-4">
                    {/* Phone Number Field */}
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-phone-input" className="text-xs font-bold text-slate-900">
                        Phone Number
                      </Label>
                      <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-2xl shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden">
                        <span className="pl-3.5 pr-2 text-sm font-bold text-slate-900 select-none border-r border-slate-200">
                          +251
                        </span>
                        <Input
                          id="reg-phone-input"
                          type="tel"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="Enter your phone number"
                          className="pl-3 pr-10 h-12 text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none font-semibold text-slate-900 placeholder:text-slate-400"
                        />
                        <Phone className="absolute right-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Send Code Button */}
                    <Button
                      type="submit"
                      disabled={otpLoading || !regPhone.trim()}
                      className="w-full h-14 text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl shadow-blue-600/20 rounded-2xl transition-all active:scale-[0.98] mt-2 cursor-pointer"
                    >
                      {otpLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      ) : (
                        "Send Code"
                      )}
                    </Button>

                    {/* Footer login prompt */}
                    <div className="text-center pt-2 text-xs text-slate-600 font-medium">
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthTab("login");
                          setErrorMsg(null);
                        }}
                        className="text-emerald-600 font-bold hover:underline"
                      >
                        Login
                      </button>
                    </div>

                    {/* How to Use */}
                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => setShowHowToUse(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                      >
                        <Play className="w-3.5 h-3.5 fill-current text-primary" />
                        How to Use
                      </button>
                    </div>
                  </form>
                )}

                {/* ── STEP 2: ENTER OTP CODE ── */}
                {regStep === "otp" && (
                  <form onSubmit={handleVerifyCode} className="space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-slate-900">Verification Code</h3>
                      <p className="text-xs text-slate-600">
                        Enter the 6-digit code sent to <span className="font-bold text-slate-900">+251 {regPhone}</span>
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-2xl shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden">
                        <Input
                          id="reg-otp-input"
                          type="text"
                          maxLength={6}
                          value={regOtp}
                          onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, ""))}
                          placeholder="6-digit code"
                          className="px-4 h-12 text-center text-lg tracking-[0.3em] font-bold border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none text-slate-900 placeholder:tracking-normal placeholder:text-sm placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-600">Didn&apos;t receive code?</span>
                      {resendTimer > 0 ? (
                        <span className="font-semibold text-slate-600">Resend in {resendTimer}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendCode}
                          disabled={otpLoading}
                          className="font-bold text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <RefreshCw className={`w-3 h-3 ${otpLoading ? "animate-spin" : ""}`} />
                          Resend Code
                        </button>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={otpLoading || regOtp.length !== 6}
                      className="w-full h-14 text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl shadow-blue-600/20 rounded-2xl transition-all active:scale-[0.98] mt-2 cursor-pointer"
                    >
                      {otpLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      ) : (
                        "Verify Code"
                      )}
                    </Button>
                  </form>
                )}

                {/* ── STEP 3: COMPLETE PROFILE (EXPANDED COMPREHENSIVE ONBOARDING) ── */}
                {regStep === "profile" && (
                  <form onSubmit={handleCompleteRegistration} className="space-y-3.5">
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-slate-900">Complete Profile</h3>
                      <p className="text-xs text-emerald-600 font-medium">✓ Phone +251 {regPhone} verified</p>
                    </div>

                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-name" className="text-xs font-bold text-slate-900">
                        Full Name <span className="text-rose-500">*</span>
                      </Label>
                      <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-2xl shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden">
                        <Input
                          id="reg-name"
                          type="text"
                          value={regFullName}
                          onChange={(e) => setRegFullName(e.target.value)}
                          placeholder="e.g. Abebe Kebede"
                          className="px-4 pr-10 h-11 text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none font-semibold text-slate-900 placeholder:text-slate-400"
                        />
                        <UserCircle2 className="absolute right-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Email Address (Optional) */}
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-email" className="text-xs font-bold text-slate-900">
                        Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                      </Label>
                      <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-2xl shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden">
                        <Input
                          id="reg-email"
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="e.g. abebe@gmail.com"
                          className="px-4 pr-10 h-11 text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none font-semibold text-slate-900 placeholder:text-slate-400"
                        />
                        <Mail className="absolute right-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Preferred Savings Frequency */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-900">
                        Preferred Equb Frequency
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["daily", "weekly", "monthly"] as const).map((freq) => (
                          <button
                            key={freq}
                            type="button"
                            onClick={() => setRegPreferredFrequency(freq)}
                            className={`py-2 px-2 text-xs rounded-xl font-bold border transition-all capitalize cursor-pointer ${
                              regPreferredFrequency === freq
                                ? "bg-primary text-white border-primary shadow-sm"
                                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {freq}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-pass" className="text-xs font-bold text-slate-900">
                        Password <span className="text-rose-500">*</span>
                      </Label>
                      <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-2xl shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden">
                        <Input
                          id="reg-pass"
                          type={regShowPassword ? "text" : "password"}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Minimum 6 characters"
                          className="px-4 pr-10 h-11 text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none font-semibold text-slate-900 placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => setRegShowPassword(!regShowPassword)}
                          className="absolute right-3.5 text-slate-400 hover:text-slate-900"
                        >
                          {regShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-confirm-pass" className="text-xs font-bold text-slate-900">
                        Confirm Password <span className="text-rose-500">*</span>
                      </Label>
                      <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-2xl shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden">
                        <Input
                          id="reg-confirm-pass"
                          type={regShowConfirmPassword ? "text" : "password"}
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="Re-type password"
                          className="px-4 pr-10 h-11 text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none font-semibold text-slate-900 placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => setRegShowConfirmPassword(!regShowConfirmPassword)}
                          className="absolute right-3.5 text-slate-400 hover:text-slate-900"
                        >
                          {regShowConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Terms Agreement */}
                    <label className="flex items-start gap-2 pt-1 text-xs text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={regAgreedToTerms}
                        onChange={(e) => setRegAgreedToTerms(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                      />
                      <span>
                        I agree to Wub Digital Equb <span className="font-semibold text-primary underline">Equb Rules & Community Terms</span>
                      </span>
                    </label>

                    {/* Submit Registration Button */}
                    <Button
                      type="submit"
                      disabled={isSubmitting || !regFullName.trim() || regPassword.length < 6 || regPassword !== regConfirmPassword || !regAgreedToTerms}
                      className="w-full h-14 text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98] mt-2 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      ) : (
                        "Complete Registration"
                      )}
                    </Button>
                  </form>
                )}
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
            <h2 className="text-2xl font-bold mb-2">Welcome to Wub Digital Equb 👋</h2>
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
                    r.role === "admin"
                      ? "bg-gradient-to-br from-violet-600 to-indigo-700 shadow-md shadow-violet-500/20"
                      : r.role === "collector"
                      ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                      : "bg-gradient-to-br from-indigo-500 to-blue-600"
                  }`}>
                    {r.role === "admin" ? (
                      <ShieldAlert className="h-5 w-5 text-white" />
                    ) : r.role === "collector" ? (
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
            <h3 className="text-xl font-bold text-foreground">How to Use Wub Digital Equb</h3>
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
