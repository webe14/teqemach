import type { Metadata, Viewport } from "next";
import "./globals.css";

import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { TelegramProvider } from "@/components/TelegramProvider";

const inter = { variable: "font-sans" };

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0F172A",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://teqemach.com"),
  title: "Teqemach",
  description:
    "A modern, enterprise-grade platform for managing Ethiopian traditional Equb (Teqemach) savings groups. Track contributions, manage collectors, and disburse funds securely.",
  keywords: ["Equb", "Teqemach", "Ethiopian savings", "Iqub", "finance"],
  authors: [{ name: "Teqemach Team" }],
  openGraph: {
    title: "Teqemach — Ethiopian Equb Management",
    description: "Manage Ethiopian traditional Equb savings groups digitally.",
    type: "website",
    images: ["/logo.png"],
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
    shortcut: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://telegram.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://telegram.org" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
        <TelegramProvider />
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
