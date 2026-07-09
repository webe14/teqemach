import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Teqemach",
  description:
    "A modern, enterprise-grade platform for managing Ethiopian traditional Equb (Teqemach) savings groups. Track contributions, manage collectors, and disburse funds securely.",
  keywords: ["Equb", "Teqemach", "Ethiopian savings", "Iqub", "finance"],
  authors: [{ name: "Teqemach Team" }],
  openGraph: {
    title: "Teqemach — Ethiopian Equb Management",
    description: "Manage Ethiopian traditional Equb savings groups digitally.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
