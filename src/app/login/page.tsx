"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Coins, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  
  const [step, setStep] = useState<"init" | "loading" | "options" | "new_user" | "existing_user" | "error">("init");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [initData, setInitData] = useState<string | null>(null);
  
  // Link form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;

    // Small delay to ensure Telegram SDK is fully loaded
    const timer = setTimeout(() => {
      const tg = window.Telegram?.WebApp;
      if (tg && tg.initData) {
        setInitData(tg.initData);
        checkTelegramLogin(tg.initData);
      } else {
        // Direct redirect to telegram bot if accessed outside
        window.location.href = "https://t.me/TeqemachBot";
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

      if (result.linked && result.redirect) {
        router.push(result.redirect);
      } else {
        setStep("options");
      }
    } catch (err: any) {
      setStep("error");
      setErrorMsg(err.message);
    }
  }

  async function handleRegister(role: "contributor" | "collector") {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/telegram/mini-app-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, action: "register", role }),
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

        {(step === "init" || step === "loading") && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground font-medium">Authenticating via Telegram...</p>
          </div>
        )}

        {step === "error" && (
          <div className="text-center py-4">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">{errorMsg}</p>
          </div>
        )}

        {step === "options" && (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Welcome to Teqemach 👋</h2>
            <p className="text-muted-foreground mb-8">Your Telegram account is connected.</p>
            
            <div className="space-y-4">
              <Button 
                className="w-full h-12 text-md" 
                onClick={() => setStep("new_user")}
              >
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

        {step === "new_user" && (
          <div className="text-center">
            <Button 
              variant="ghost" 
              className="mb-4 text-muted-foreground self-start" 
              onClick={() => { setStep("options"); setErrorMsg(null); }}
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
                onClick={() => handleRegister("contributor")}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Contributor"}
              </Button>
              <Button 
                variant="secondary" 
                className="w-full h-14 text-lg" 
                onClick={() => handleRegister("collector")}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Collector"}
              </Button>
            </div>
          </div>
        )}

        {step === "existing_user" && (
          <div>
            <Button 
              variant="ghost" 
              className="mb-4 text-muted-foreground -ml-4" 
              onClick={() => { setStep("options"); setErrorMsg(null); }}
              disabled={isSubmitting}
            >
              &larr; Back
            </Button>
            <h2 className="text-2xl font-bold mb-2">Link Account</h2>
            <p className="text-muted-foreground mb-6">Enter your email and password to link your existing Teqemach account with this Telegram profile.</p>

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
