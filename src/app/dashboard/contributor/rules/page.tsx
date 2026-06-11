import { getCurrentProfile } from "@/lib/actions/auth";
import { getContributorRules } from "@/lib/actions/contributor";
import { gregorianToEthiopianString } from "@/lib/ethiopian-calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ScrollText } from "lucide-react";

export const metadata = { title: "System Rules — Teqemach" };

export default async function ContributorRulesPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const { data: rules } = await getContributorRules(profile.id);

  return (
    <div className="space-y-8 stagger-children max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">System Rules</h1>
        <p className="text-muted-foreground mt-1">
          Guidelines posted by your Equb collector
        </p>
        <div className="ethiopian-divider mt-3 w-24" />
      </div>

      {rules.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <ScrollText className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="font-medium text-muted-foreground">No rules posted yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your collector hasn&apos;t published any rules yet. Check back later.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{rules.length} rule{rules.length !== 1 ? "s" : ""} posted</span>
          </div>

          {rules.map((rule, i) => (
            <Card key={rule.id} className="card-hover border-border/60 hover:border-primary/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Rule number badge */}
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-bold shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-relaxed">{rule.rule_text}</p>
                    <p className="text-xs text-muted-foreground mt-3">
                      Posted:{" "}
                      <span className="font-medium">
                        {gregorianToEthiopianString(new Date(rule.created_at), "en")}
                      </span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
