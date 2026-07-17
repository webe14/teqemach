"use client";

import { useState, useEffect } from "react";
import { UserPen, Eye, EyeOff, CheckCircle, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/lib/actions/auth";
import { getNotificationPreferences, updateNotificationPreferences } from "@/lib/actions/notification-prefs";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface EditProfileModalProps {
  userName: string;
  role: "admin" | "collector" | "contributor";
  collapsed?: boolean;
  isMobile?: boolean;
  className?: string;
}

export function EditProfileModal({ userName, role, collapsed, isMobile, className }: EditProfileModalProps) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(userName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  const [prefs, setPrefs] = useState({
    contribution_confirmations: true,
    daily_reports: true,
    weekly_reports: true,
    payment_reminders: true,
    broadcast_announcements: true,
  });
  
  const { t } = useLocale();

  function reset() {
    setFullName(userName);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess(false);
  }

  useEffect(() => {
    if (open) {
      getNotificationPreferences().then(prefsData => {
        if (prefsData) {
          setPrefs({
            contribution_confirmations: prefsData.contribution_confirmations,
            daily_reports: prefsData.daily_reports,
            weekly_reports: prefsData.weekly_reports,
            payment_reminders: prefsData.payment_reminders,
            broadcast_announcements: prefsData.broadcast_announcements,
          });
        }
      }).catch(console.error);
    }
  }, [open]);

  async function handleTogglePref(key: keyof typeof prefs, value: boolean) {
    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);
    try {
      await updateNotificationPreferences(newPrefs);
    } catch (e) {
      console.error(e);
      // Revert on error
      setPrefs(prefs);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword && newPassword !== confirmPassword) {
      setError(t("passwordsDoNotMatch"));
      return;
    }
    if (newPassword && newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const result = await updateProfile({
      fullName: fullName !== userName ? fullName : undefined,
      newPassword: newPassword || undefined,
      currentPassword: currentPassword || undefined,
    });
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
      }, 1800);
    }
  }

  const roleGradients = {
    admin: "from-violet-500 to-indigo-600",
    collector: "from-indigo-500 to-blue-600",
    contributor: "from-blue-500 to-cyan-600",
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => { reset(); setOpen(true); }}
        className={cn(
          "transition-all duration-200",
          className || (isMobile ? "text-white hover:text-white hover:bg-white/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"),
          collapsed ? "w-full justify-center px-2" : "flex-1"
        )}
        title={t("editProfileTitle")}
      >
        <UserPen className="h-4 w-4" />
        {!collapsed && <span className="ml-2 text-xs">{t("editProfileTitle")}</span>}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-end sm:justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setOpen(false); reset(); } }}
        >
          <div className="relative w-full max-w-md bg-card sm:rounded-3xl rounded-t-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-8 duration-300">
            
            {/* Header Background */}
            <div className={cn("h-32 bg-gradient-to-br w-full absolute top-0 left-0", roleGradients[role])} />
            
            <button
              onClick={() => { setOpen(false); reset(); }}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors z-10 bg-black/20 rounded-full p-1.5 backdrop-blur-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>

            {/* Profile Avatar */}
            <div className="relative z-10 pt-16 px-6 pb-2 flex flex-col items-center">
              <div className="h-24 w-24 rounded-full border-4 border-card bg-muted flex items-center justify-center overflow-hidden shadow-lg mb-3">
                <User className="h-12 w-12 text-muted-foreground/50" />
              </div>
              <h2 className="text-xl font-bold text-foreground truncate w-full text-center">{userName}</h2>
              <span className={cn(
                "mt-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                role === "admin" ? "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300" :
                role === "collector" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300" :
                "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
              )}>
                {role}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {success ? (
                <div className="flex flex-col items-center justify-center py-8 text-center animate-in zoom-in-95 duration-300">
                  <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Profile Updated!</h3>
                  <p className="text-sm text-muted-foreground mt-1">Your changes have been saved successfully.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6 pb-6">
                  
                  {/* Basic Info Card */}
                  <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 space-y-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Personal Information</h3>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Full Name</Label>
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your full name"
                        className="bg-background border-border/50 h-11"
                      />
                    </div>
                  </div>

                  {/* Password Card */}
                  <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 space-y-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Security</h3>
                    
                    {role !== "admin" && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Current Password</Label>
                        <div className="relative">
                          <Input
                            type={showCurrent ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Required to change password"
                            className="bg-background border-border/50 h-11 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrent((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">New Password</Label>
                      <div className="relative">
                        <Input
                          type={showNew ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="bg-background border-border/50 h-11 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Confirm New Password</Label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat new password"
                        className="bg-background border-border/50 h-11"
                      />
                    </div>
                  </div>

                  {/* Notifications Card */}
                  <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 space-y-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Telegram Notifications</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium cursor-pointer" htmlFor="pref-contribution">Contribution Confirmations</Label>
                        <input 
                          type="checkbox"
                          id="pref-contribution" 
                          checked={prefs.contribution_confirmations} 
                          onChange={(e) => handleTogglePref("contribution_confirmations", e.target.checked)} 
                          className="h-5 w-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 transition-all"
                        />
                      </div>
                      
                      {role === "admin" && (
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium cursor-pointer" htmlFor="pref-broadcast">Receive Broadcasts</Label>
                          <input 
                            type="checkbox"
                            id="pref-broadcast" 
                            checked={prefs.broadcast_announcements} 
                            onChange={(e) => handleTogglePref("broadcast_announcements", e.target.checked)} 
                            className="h-5 w-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 transition-all"
                          />
                        </div>
                      )}
                      
                      {role === "contributor" && (
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium cursor-pointer" htmlFor="pref-reminders">Payment Reminders</Label>
                          <input 
                            type="checkbox"
                            id="pref-reminders" 
                            checked={prefs.payment_reminders} 
                            onChange={(e) => handleTogglePref("payment_reminders", e.target.checked)} 
                            className="h-5 w-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 transition-all"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="pt-2">
                    <Button
                      type="submit"
                      className="w-full h-12 text-md rounded-xl"
                      disabled={loading}
                    >
                      {loading ? (
                        <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Saving Changes...</>
                      ) : "Save Changes"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Dummy AlertCircle icon since it wasn't imported from lucide-react initially in my rewrite but used in the JSX
function AlertCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}
