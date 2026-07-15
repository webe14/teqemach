"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getCurrentProfile } from "@/lib/actions/auth";
import { addRule, getRulesByCollector, deleteRule } from "@/lib/actions/rules";
import { gregorianToEthiopianString } from "@/lib/ethiopian-calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";

const MAX_CHARS = 1000;

type Rule = { id: string; rule_text: string; created_at: string };

export default function AddRulePage() {
  const { t, locale } = useLocale();
  const [isPending, startTransition] = useTransition();
  const [userId, setUserId] = useState<string | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [ruleText, setRuleText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charsLeft = MAX_CHARS - ruleText.length;
  const isOverLimit = charsLeft < 0;

  // Auto-resize textarea
  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setRuleText(e.target.value);
    setError(null);
    setSuccess(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }

  useEffect(() => {
    (async () => {
      const profile = await getCurrentProfile();
      if (!profile) return;
      setUserId(profile.id);
      const res = await getRulesByCollector(profile.id);
      setRules((res.data as Rule[]) ?? []);
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    if (isOverLimit) { setError(t("ruleMaxLength")); return; }
    if (!ruleText.trim()) { setError("Rule text cannot be empty"); return; }
    startTransition(async () => {
      const result = await addRule({ collectorId: userId, ruleText: ruleText.trim() });
      if (result.error) { setError(result.error); return; }
      setSuccess(true);
      setRuleText("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      const res = await getRulesByCollector(userId);
      setRules((res.data as Rule[]) ?? []);
    });
  }

  async function handleDelete(ruleId: string) {
    startTransition(async () => {
      await deleteRule(ruleId);
      if (userId) {
        const res = await getRulesByCollector(userId);
        setRules((res.data as Rule[]) ?? []);
      }
    });
  }

  return (
    <div className="space-y-8 stagger-children max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("systemRules")}</h1>
        <p className="text-muted-foreground mt-1">{t("postContributionRules")}</p>
        <div className="ethiopian-divider mt-3 w-24" />
      </div>

      {/* Add Rule form */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>{t("newRule")}</CardTitle>
              <CardDescription>{t("rulesVisibleToAll")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {success && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-600 mb-4">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {t("ruleAdded")}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive mb-4">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="rule-textarea">{t("ruleText")}</Label>
                <span className={`text-xs font-mono ${isOverLimit ? "text-destructive font-bold" : charsLeft < 100 ? "text-amber-500" : "text-muted-foreground"}`}>
                  {charsLeft < 0 ? `-${Math.abs(charsLeft)}` : charsLeft} {isOverLimit ? "over limit!" : "chars left"}
                </span>
              </div>
              <Textarea
                id="rule-textarea"
                ref={textareaRef}
                value={ruleText}
                onChange={handleChange}
                placeholder={t("rulePlaceholder")}
                className={`min-h-[120px] transition-all resize-none overflow-hidden ${isOverLimit ? "border-destructive focus-visible:ring-destructive" : ""}`}
                maxLength={1100}
              />
              {/* Character progress bar */}
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isOverLimit ? "bg-destructive" : charsLeft < 100 ? "bg-amber-500" : "bg-primary"
                  }`}
                  style={{ width: `${Math.min(100, (ruleText.length / MAX_CHARS) * 100)}%` }}
                />
              </div>
            </div>
            <Button type="submit" disabled={isPending || isOverLimit} className="gap-2" id="submit-rule-btn">
              <Plus className="h-4 w-4" />
              {isPending ? t("loading") : t("addRule")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing rules */}
      {rules.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            {t("postedRulesCount").replace("{count}", rules.length.toString())}
          </h2>
          {rules.map((rule, i) => (
            <Card key={rule.id} className="group relative card-hover">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Badge variant="info" className="shrink-0 mt-0.5">#{i + 1}</Badge>
                    <p className="text-sm text-foreground leading-relaxed">{rule.rule_text}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(rule.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 ml-12">
                  {gregorianToEthiopianString(new Date(rule.created_at), locale)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
