"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  rounded?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full" | "none";
  priority?: boolean;
  alt?: string;
}

const sizeMap = {
  xs: 20,
  sm: 28,
  md: 36,
  lg: 48,
  xl: 64,
  "2xl": 80,
};

const pixelClasses = {
  xs: "w-5 h-5",
  sm: "w-7 h-7",
  md: "w-9 h-9",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
  "2xl": "w-20 h-20",
};

const roundedClasses = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  "3xl": "rounded-3xl",
  full: "rounded-full",
};

export function AppLogo({
  className,
  size = "md",
  rounded = "xl",
  priority = false,
  alt = "Teqemach Logo",
}: AppLogoProps) {
  const dimension = sizeMap[size];

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden flex items-center justify-center bg-white shadow-sm border border-white/20",
        pixelClasses[size],
        roundedClasses[rounded],
        className
      )}
    >
      <Image
        src="/logo.png"
        alt={alt}
        width={dimension * 2}
        height={dimension * 2}
        className="w-full h-full object-contain p-1"
        priority={priority}
      />
    </div>
  );
}
