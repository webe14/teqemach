"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CollectorRegistration } from "@/components/auth/CollectorRegistration";
import { ContributorRegistration } from "@/components/auth/ContributorRegistration";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<"collector" | "contributor" | "guest">("collector");

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10 bg-card border border-border rounded-2xl p-8 shadow-xl"
      >
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-foreground">Join Teqemach</h1>
          <p className="text-muted-foreground mt-2">Select your role to get started</p>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6 p-1 bg-muted rounded-xl">
          {(["collector", "contributor", "guest"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`py-2 px-3 text-sm font-medium rounded-lg capitalize transition-all ${
                role === r 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={role}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {role === "collector" && (
              <CollectorRegistration hideHeader />
            )}
            {role === "contributor" && (
              <ContributorRegistration hideHeader />
            )}
            {role === "guest" && (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-6">Explore Teqemach without creating an account.</p>
                <Button onClick={() => router.push("/guest")} className="w-full" size="lg">
                  Continue to Guest Page
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Log in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
