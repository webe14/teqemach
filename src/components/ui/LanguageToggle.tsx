"use client";

import * as React from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export function LanguageToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLocale(locale === "en" ? "am" : "en")}
      className="gap-2 font-semibold"
      id="language-toggle"
    >
      <Languages className="h-4 w-4" />
      <span className="text-xs">{locale === "en" ? "አማ" : "EN"}</span>
    </Button>
  );
}
