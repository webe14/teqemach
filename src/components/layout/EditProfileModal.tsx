"use client";

import { useState } from "react";
import { UserPen, Eye, EyeOff, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/lib/actions/auth";

interface EditProfileModalProps {
  userName: string;
  role: "admin" | "collector" | "contributor";
  collapsed?: boolean;
}

export function EditProfileModal({ userName, role, collapsed }: EditProfileModalProps) {
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

  function reset() {
    setFullName(userName);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword && newPassword !== confirmPassword) {
      setError("New passwords do not match.");
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
        className={`text-muted-foreground hover:text-foreground hover:bg-muted ${collapsed ? "w-full justify-center px-2" : "flex-1"}`}
        title="Edit Profile"
      >
        <UserPen className="h-4 w-4" />
        {!collapsed && <span className="ml-2 text-xs">Edit Profile</span>}
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
              <div>
                <h2 className="text-base font-bold text-foreground">Edit Profile</h2>
                <p className="text-xs text-muted-foreground">Update name or password</p>
              </div>
              <button
                onClick={() => { setOpen(false); reset(); }}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>

            {success ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <CheckCircle className="h-12 w-12 text-emerald-500" />
                <p className="text-sm font-semibold text-foreground">Profile updated!</p>
                <p className="text-xs text-muted-foreground">Changes saved successfully.</p>
              </div>
            ) : (
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
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
