"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { signIn } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { Coins, Mail, Lock, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

            <Button type="submit" className="w-full" size="lg" disabled={loading} id="sign-in-btn">
              {loading ? t("loading") : t("signIn")}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Administrator?{" "}
            <a href="/admin-secure" className="text-primary hover:underline font-medium">
              Admin Portal →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
