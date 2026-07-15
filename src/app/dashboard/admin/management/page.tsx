"use client";

import { useState, useTransition, useEffect } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { registerUser, getCollectors } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserPlus, CheckCircle2, AlertCircle, Mail, Phone, User, Lock, Shield } from "lucide-react";

interface Collector {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  email: string | null;
}

export default function ManagementHubPage() {
  const { t } = useLocale();
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collectors, setCollectors] = useState<Collector[]>([]);

  const [form, setForm] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    password: "",
    role: "" as "collector" | "contributor" | "",
    collectorId: "",
  });

  // Fetch collectors when component mounts or when role changes to contributor
  useEffect(() => {
    if (form.role === "contributor") {
      getCollectors().then((res) => {
        setCollectors((res.data as Collector[]) ?? []);
      });
    }
  }, [form.role]);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setSuccess(false);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.role) { setError(t("pleaseSelectRole")); return; }
    if (form.role === "contributor" && !form.collectorId) {
      setError(t("pleaseSelectCollector"));
      return;
    }
    startTransition(async () => {
      const result = await registerUser({
        fullName: form.fullName,
        phoneNumber: form.phoneNumber,
        email: form.email,
        password: form.password,
        role: form.role as "collector" | "contributor",
        collectorId: form.collectorId || undefined,
      });
      if (result.error) { setError(result.error); }
      else {
        setSuccess(true);
        setForm({ fullName: "", phoneNumber: "", email: "", password: "", role: "", collectorId: "" });
      }
    });
  }

  return (
    <div className="space-y-8 stagger-children max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("managementHub")}</h1>
        <p className="text-muted-foreground mt-1">{t("registerAndProvision")}</p>
        <div className="ethiopian-divider mt-3 w-24" />
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>{t("provisionUser")}</CardTitle>
              <CardDescription>{t("fillDetails")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {success && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-600 mb-6">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span className="font-medium">{t("userRegistered")}</span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive mb-6">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="fullName">{t("fullName")}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    value={form.fullName}
                    onChange={(e) => update("fullName", e.target.value)}
                    placeholder="Abebe Kebede"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">{t("phone")}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phoneNumber"
                    value={form.phoneNumber}
                    onChange={(e) => update("phoneNumber", e.target.value)}
                    placeholder="+251911234567"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="regEmail">{t("email")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="regEmail"
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="user@example.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="regPassword">{t("password")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="regPassword"
                    type="password"
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    placeholder={t("minSixChars")}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("selectRole")}</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => {
                    update("role", v);
                    // reset collectorId when switching roles
                    setForm((f) => ({ ...f, role: v as any, collectorId: "" }));
                  }}
                >
                  <SelectTrigger id="roleSelect">
                    <SelectValue placeholder="Select role..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="collector">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-indigo-500" />
                        {t("collector")}
                      </div>
                    </SelectItem>
                    <SelectItem value="contributor">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-emerald-500" />
                        {t("contributor")}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Collector selector — only shown when role is contributor */}
            {form.role === "contributor" && (
              <div className="space-y-2">
                <Label htmlFor="collectorSelect">{t("assignToCollector")} <span className="text-destructive">*</span></Label>
                <Select
                  value={form.collectorId}
                  onValueChange={(v) => update("collectorId", v)}
                >
                  <SelectTrigger id="collectorSelect">
                    <SelectValue placeholder={t("selectCollector")} />
                  </SelectTrigger>
                  <SelectContent>
                    {collectors.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        {t("noCollectorsYet")}
                      </div>
                    ) : (
                      collectors.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{c.full_name ?? "—"}</span>
                            <span className="text-xs text-muted-foreground">{c.email ?? c.phone_number ?? ""}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t("contributorAssociated")}
                </p>
              </div>
            )}

            {/* Role preview */}
            {form.role && (
              <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-center gap-3">
                <Badge variant={form.role === "collector" ? "info" : "success"} className="capitalize">
                  {t(form.role as any)}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {form.role === "collector"
                    ? t("collectorRoleDesc")
                    : t("contributorRoleDesc")}
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isPending}
              id="register-user-btn"
            >
              {isPending ? t("loading") : t("registerUser")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
