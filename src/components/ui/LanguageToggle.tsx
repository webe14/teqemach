"use client";

import * as React from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  className?: string;
}

export function LanguageToggle({ className }: LanguageToggleProps = {}) {
  const { locale, setLocale } = useLocale();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLocale(locale === "en" ? "am" : "en")}
      className={cn("gap-1.5 font-semibold text-xs h-8 px-2.5 rounded-full", className)}
      id="language-toggle"
    >
      <Languages className="h-3.5 w-3.5" />
      <span className="text-xs font-bold">{locale === "en" ? "አማ" : "EN"}</span>
    </Button>
  );
}
