"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signUp, signInWithGoogle, requestRegistrationOtpAction, verifyRegistrationOtpAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, User, Mail, Lock, Phone, KeyRound, ArrowLeft, RefreshCw, CheckCircle2 } from "lucide-react";

export function CollectorRegistration({ hideHeader }: { hideHeader?: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [formattedPhone, setFormattedPhone] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "otp" && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const result = await signInWithGoogle({ role: "collector" });
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
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const result = await requestRegistrationOtpAction(formData.phone, formData.email);
      if (result?.error) {
        setError(result.error);
      } else {
        setFormattedPhone(result.formattedPhone || formData.phone);
        setStep("otp");
        setResendTimer(60);
        setCanResend(false);
      }
    } catch {
      setError("Failed to send verification SMS. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setError(null);
    setOtpLoading(true);
    try {
      const result = await requestRegistrationOtpAction(formData.phone, formData.email);
      if (result?.error) {
        setError(result.error);
      } else {
        setResendTimer(60);
        setCanResend(false);
      }
    } catch {
      setError("Failed to resend code.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otpCode.trim().length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setLoading(true);
    try {
      const verifyRes = await verifyRegistrationOtpAction(formData.phone, otpCode);
      if (verifyRes?.error) {
        setError(verifyRes.error);
        setLoading(false);
        return;
      }

      const result = await signUp({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: "collector",
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/login?success=collector_created");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md animate-fadeInUp">
      {!hideHeader && (
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Collector Registration</h2>
            <p className="text-muted-foreground mt-1">
              {step === "form" ? "Create your collector account" : "Verify your phone number"}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {step === "form" ? (
        <form onSubmit={handleRequestOtp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="fullName" value={formData.fullName} onChange={handleChange} placeholder="John Doe" className="pl-10" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="email" type="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" className="pl-10" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number (SMS OTP)</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="0912345678" className="pl-10" required />
            </div>
            <p className="text-xs text-muted-foreground">A 6-digit SMS verification code will be sent to this number.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" value={formData.password} onChange={handleChange} placeholder="••••••••" className="pl-10" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" className="pl-10" required />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading || googleLoading}>
            {loading ? "Sending verification code..." : "Continue to Verify Phone"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button type="button" variant="outline" className="w-full relative bg-background hover:bg-muted" onClick={handleGoogleLogin} disabled={googleLoading || loading}>
            {googleLoading ? "Loading..." : (
              <>
                <svg className="absolute left-4 h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </>
            )}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyAndRegister} className="space-y-5">
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
            <div className="flex items-center gap-2 text-primary font-medium">
              <CheckCircle2 className="h-5 w-5" />
              <span>SMS Code Sent</span>
            </div>
            <p className="text-sm text-muted-foreground">
              We sent a 6-digit verification code to <span className="font-semibold text-foreground">{formattedPhone}</span>.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="otpCode">Verification Code</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="otpCode"
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="pl-10 text-center tracking-widest text-lg font-mono"
                autoFocus
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Verifying & Registering..." : "Verify & Complete Registration"}
          </Button>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                setStep("form");
                setError(null);
              }}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Change phone number
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={!canResend || otpLoading}
              className={`flex items-center gap-1 text-sm ${
                canResend ? "text-primary hover:underline" : "text-muted-foreground opacity-60 cursor-not-allowed"
              }`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${otpLoading ? "animate-spin" : ""}`} />
              {canResend ? "Resend Code" : `Resend in ${resendTimer}s`}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
