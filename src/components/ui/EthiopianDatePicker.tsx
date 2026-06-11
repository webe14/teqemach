"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  getCurrentEthiopianDate,
  getDaysInEthiopianMonth,
  getEthiopianMonths,
} from "@/lib/ethiopian-calendar";

interface EthiopianDatePickerProps {
  value: string;
  onChange: (val: string) => void;
  label: string;
  locale: "en" | "am";
}

export function EthiopianDatePicker({ value, onChange, label, locale }: EthiopianDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [currentYear, setCurrentYear] = useState(2018);
  const [currentMonth, setCurrentMonth] = useState(10);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Click-outside closes picker
  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (
        popupRef.current && !popupRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  // Sync calendar to current value
  useEffect(() => {
    if (value) {
      const parts = value.split("/");
      if (parts.length === 3) {
        const m = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);
        if (!isNaN(y) && y >= 2000 && y <= 2100) setCurrentYear(y);
        if (!isNaN(m) && m >= 1 && m <= 13) setCurrentMonth(m);
      }
    } else {
      const today = getCurrentEthiopianDate();
      setCurrentYear(today.year);
      setCurrentMonth(today.month);
    }
  }, [value]);

  function openPicker() {
    setOpen((v) => !v);
  }

  const months = getEthiopianMonths(locale);
  const daysInMonth = getDaysInEthiopianMonth(currentYear, currentMonth);

  function handleSelectDay(day: number) {
    const fd = String(day).padStart(2, "0");
    const fm = String(currentMonth).padStart(2, "0");
    onChange(`${fd}/${fm}/${currentYear}`);
    setOpen(false);
  }

  function adjustMonth(offset: number) {
    let nextMonth = currentMonth + offset;
    let nextYear = currentYear;
    if (nextMonth > 13) { nextMonth = 1; nextYear += 1; }
    else if (nextMonth < 1) { nextMonth = 13; nextYear -= 1; }
    setCurrentMonth(nextMonth);
    setCurrentYear(nextYear);
  }

  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="relative">
        <Input
          type="text"
          placeholder="DD/MM/YYYY"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-xs pr-8 w-full"
        />
        <button
          ref={triggerRef}
          type="button"
          onClick={openPicker}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
        >
          <CalendarDays className="h-4 w-4" />
        </button>

        {open && (
          <div
            ref={popupRef}
            className="absolute right-0 top-full z-[100] mt-1 w-64 rounded-xl border border-border bg-card p-3 text-card-foreground shadow-2xl"
          >
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => adjustMonth(-1)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-xs font-bold select-none">
                {months[currentMonth - 1]} {currentYear}
              </div>
              <button
                type="button"
                onClick={() => adjustMonth(1)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-5 gap-1 text-center">
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const fd = String(day).padStart(2, "0");
                const fm = String(currentMonth).padStart(2, "0");
                const isSelected = value === `${fd}/${fm}/${currentYear}`;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    className={`h-7 w-full rounded-md text-[11px] font-medium transition-all ${isSelected
                        ? "bg-primary text-white font-bold shadow-sm"
                        : "hover:bg-muted text-foreground/80 hover:text-foreground"
                      }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Year controls */}
            <div className="mt-3 pt-2 border-t border-border flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{locale === "am" ? "ዓመት" : "Year"}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentYear((y) => y - 1)}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-muted hover:bg-accent hover:text-accent-foreground transition-colors"
                >−1</button>
                <span className="text-xs font-bold px-1 min-w-[34px] text-center">{currentYear}</span>
                <button
                  type="button"
                  onClick={() => setCurrentYear((y) => y + 1)}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-muted hover:bg-accent hover:text-accent-foreground transition-colors"
                >+1</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
