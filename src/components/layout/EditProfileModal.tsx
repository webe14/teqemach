"use client";

import { useState, useEffect } from "react";
import { UserPen, Eye, EyeOff, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/lib/actions/auth";
import { getTelegramStatus, generateTelegramLinkUrl, unlinkTelegramAccount } from "@/lib/actions/telegram";
import { getNotificationPreferences, updateNotificationPreferences } from "@/lib/actions/notification-prefs";
import { useLocale } from "@/lib/i18n/LocaleProvider";

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
  
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(false);
  
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
      getTelegramStatus().then(res => {
        setTelegramLinked(res.linked);
        if (res.username) setTelegramUsername(res.username);
        
        if (res.linked) {
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
      }).catch(console.error);
    }
  }, [open]);

  async function handleLinkTelegram() {
    setTelegramLoading(true);
    try {
      const url = await generateTelegramLinkUrl();
      window.open(url, "_blank");
    } catch (e) {
      console.error(e);
    }
    setTelegramLoading(false);
  }

  async function handleUnlinkTelegram() {
    setTelegramLoading(true);
    try {
      await unlinkTelegramAccount();
      setTelegramLinked(false);
      setTelegramUsername(null);
    } catch (e) {
      console.error(e);
    }
    setTelegramLoading(false);
  }

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

  return (
    <>
      {/* Trigger button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => { reset(); setOpen(true); }}
        className={className || `${isMobile ? "text-white hover:text-white hover:bg-white/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"} ${collapsed ? "w-full justify-center px-2" : "flex-1"}`}
        title={t("editProfileTitle")}
      >
        <UserPen className="h-4 w-4" />
        {!collapsed && <span className="ml-2 text-xs">{t("editProfileTitle")}</span>}
      </Button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setOpen(false); reset(); } }}
        >
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${
                role === "admin" ? "from-violet-500 to-indigo-600" :
                role === "collector" ? "from-indigo-500 to-blue-600" :
                "from-blue-500 to-cyan-600"
              }`}>
                <UserPen className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-foreground truncate">{t("editProfileTitle")}</h2>
                <p className="text-sm text-muted-foreground mt-0.5 truncate">{role}</p>
              </div>
              <button
                onClick={() => { setOpen(false); reset(); }}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>

            {success && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200/50 p-3 text-sm text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>{t("profileUpdated")}</span>
              </div>
            )}

            {!success && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Full Name</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="h-9 text-sm"
                  />
                </div>

                <div className="border-t border-border pt-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Change Password</p>

                  {/* Current password — not required for admin */}
                  {role !== "admin" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Current Password</Label>
                      <div className="relative">
                        <Input
                          type={showCurrent ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Current password"
                          className="h-9 text-sm pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrent((v) => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs">New Password</Label>
                    <div className="relative">
                      <Input
                        type={showNew ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password (min 6 chars)"
                        className="h-9 text-sm pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Confirm New Password</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-rose-500 font-medium bg-rose-500/10 rounded-lg px-3 py-2">{error}</p>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-xs h-9"
                    onClick={() => { setOpen(false); reset(); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="flex-1 text-xs h-9"
                    disabled={loading}
                  >
                    {loading ? (
                      <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving…</>
                    ) : "Save Changes"}
                  </Button>
                </div>
                
                {/* Telegram Integration */}
                <div className="border-t border-border pt-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Telegram Integration</p>
                  <div className="flex items-center justify-between bg-muted/50 p-3 rounded-xl border border-border">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Status: {telegramLinked ? "✅ Connected" : "❌ Not Connected"}</span>
                      {telegramLinked && telegramUsername && (
                        <span className="text-xs text-muted-foreground">@{telegramUsername}</span>
                      )}
                    </div>
                    {telegramLinked ? (
                      <Button type="button" variant="outline" size="sm" onClick={handleUnlinkTelegram} disabled={telegramLoading}>
                        Disconnect
                      </Button>
                    ) : (
                      <Button type="button" size="sm" onClick={handleLinkTelegram} disabled={telegramLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                        Connect Telegram
                      </Button>
                    )}
                  </div>
                  
                  {telegramLinked && (
                    <div className="space-y-3 pt-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notification Preferences</p>
                      
                      <div className="flex items-center justify-between">
                        <Label className="text-sm cursor-pointer" htmlFor="pref-contribution">Contribution Confirmations</Label>
                        <input 
                          type="checkbox"
                          id="pref-contribution" 
                          checked={prefs.contribution_confirmations} 
                          onChange={(e) => handleTogglePref("contribution_confirmations", e.target.checked)} 
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                      
                      {role === "admin" && (
                        <div className="flex items-center justify-between">
                          <Label className="text-sm cursor-pointer" htmlFor="pref-broadcast">Receive Broadcasts</Label>
                          <input 
                            type="checkbox"
                            id="pref-broadcast" 
                            checked={prefs.broadcast_announcements} 
                            onChange={(e) => handleTogglePref("broadcast_announcements", e.target.checked)} 
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </div>
                      )}
                      
                      {role === "contributor" && (
                        <div className="flex items-center justify-between">
                          <Label className="text-sm cursor-pointer" htmlFor="pref-reminders">Payment Reminders</Label>
                          <input 
                            type="checkbox"
                            id="pref-reminders" 
                            checked={prefs.payment_reminders} 
                            onChange={(e) => handleTogglePref("payment_reminders", e.target.checked)} 
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </div>
                      )}
                      
                    </div>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
