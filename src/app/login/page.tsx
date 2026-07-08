"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { signIn, signInWithGoogle } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { Coins, Mail, Lock, AlertCircle } from "lucide-react";

function LoginForm() {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "email_not_verified") {
      setError(t("emailNotVerified"));
    } else if (errorParam === "account_not_found") {
      setError(t("accountNotFound"));
    } else if (errorParam === "auth_failed") {
      setError("Authentication failed. Please try again.");
    }
  }, [searchParams, t]);

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError(null);
    try {
      const result = await signInWithGoogle();
      if (result?.error) {
        setError(result.error);
        setGoogleLoading(false);
      } else if (result?.url) {
        window.location.href = result.url;
      }
    } catch {
      setError("An unexpected error occurred");
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signIn({ email, password });
      if (result?.error) {
        setError(result.error);
        return;
      }

      // Custom-session path: role returned directly (collector/contributor)
      if (result.role === "collector") { router.replace("/dashboard/collector"); return; }
      if (result.role === "contributor") { router.replace("/dashboard/contributor"); return; }

      // Supabase Auth path: fetch role from profile (admin)
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Authentication failed"); return; }
      const { data: profile } = (await supabase.from("profiles").select("role").eq("id", user.id).single()) as any;
      const role = profile?.role;
      if (role === "admin") router.replace("/dashboard/admin");
      else if (role === "collector") router.replace("/dashboard/collector");
      else if (role === "contributor") router.replace("/dashboard/contributor");
      else setError("Unknown role. Contact administrator.");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm animate-fadeInUp">
      {/* Mobile logo */}
      <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-hero">
          <Coins className="h-5 w-5 text-white" />
        </div>
        <span className="font-bold text-xl text-foreground">{t("appName")}</span>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">{t("loginTitle")}</h2>
        <p className="text-muted-foreground mt-1">{t("loginSubtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">{t("email")}</Label>
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
              autoComplete="email"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t("password")}</Label>
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
              autoComplete="current-password"
            />
          </div>
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={loading || googleLoading} id="sign-in-btn">
          {loading ? t("loading") : t("signIn")}
        </Button>

        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {t("or")}
            </span>
          </div>
        </div>

        <Button 
          type="button" 
          variant="outline" 
          className="w-full relative bg-background hover:bg-muted" 
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
        >
          {googleLoading ? (
            t("loading")
          ) : (
            <>
              <svg className="absolute left-4 h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {t("continueWithGoogle")}
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  const { t } = useLocale();
  return (
    <div className="min-h-screen flex">
      {/* Left hero panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 relative overflow-hidden gradient-hero p-12">
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              <Coins className="h-6 w-6 text-white" />
            </div>
            <span className="text-white font-bold text-2xl">{t("appName")}</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Ethiopian Traditional<br />Savings Management
          </h1>
          <p className="text-white/80 text-lg leading-relaxed">
            Manage your Equb savings groups digitally. Track contributions, manage collectors, and disburse funds securely — in Amharic or English.
          </p>
        </div>
        <div className="relative z-10">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Groups Managed", value: "500+" },
              { label: "Contributions", value: "25K+" },
              { label: "Members", value: "10K+" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-white/10 backdrop-blur p-4 text-center">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-white/70 text-xs mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-background">
        <div className="absolute top-4 right-4">
          <LanguageToggle />
        </div>
        <Suspense fallback={<div className="text-muted-foreground">{t("loading")}</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
