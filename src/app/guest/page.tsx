"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Coins, ShieldCheck, Users, TrendingUp, ChevronRight, Compass, ArrowRight, UserPlus, CheckCircle2 } from "lucide-react";
import { getCollectors } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export default function GuestPage() {
  const [featuredCollectors, setFeaturedCollectors] = useState<{id: string, full_name: string | null}[]>([]);

  useEffect(() => {
    async function fetchFeatured() {
      const res = await getCollectors();
      if (res.data) {
        // Just take the first 3 for display
        setFeaturedCollectors(res.data.slice(0, 3));
      }
    }
    fetchFeatured();
  }, []);

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const stagger = {
    visible: { transition: { staggerChildren: 0.1 } }
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30">
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Coins className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl tracking-tight">Teqemach</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">Log in</Link>
            <Button asChild size="sm" className="rounded-full">
              <Link href="/register">Join Now</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 blur-[120px] rounded-full pointer-events-none -z-10" />
        
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeIn}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6 text-sm font-medium">
              <Compass className="w-4 h-4" />
              <span>Explore Teqemach</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
              Modernizing <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">Traditional Savings</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Discover trusted savings groups, explore collectors, and experience how Teqemach makes managing your Equb safe, transparent, and digital.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="rounded-full w-full sm:w-auto text-base px-8 h-14">
                <Link href="/register">
                  Join as Contributor <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full w-full sm:w-auto text-base px-8 h-14 bg-background">
                <Link href="/register">
                  Become a Collector
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Collectors */}
      <section className="py-20 px-6 bg-muted/30 border-y border-border">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial="hidden" 
            whileInView="visible" 
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold mb-4">Featured Collectors</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Join reputable collectors who are already managing successful savings groups on Teqemach.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredCollectors.length > 0 ? (
              featuredCollectors.map((collector, i) => (
                <motion.div 
                  key={collector.id}
                  variants={fadeIn}
                  whileHover={{ y: -5 }}
                  className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all"
                >
                  <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <UserPlus className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-1">{collector.full_name || 'Anonymous Collector'}</h3>
                  <p className="text-sm text-muted-foreground mb-6">Verified Collector</p>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Active Groups</span>
                      <span className="font-medium">Multiple</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-medium text-green-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Accepting</span>
                    </div>
                  </div>

                  <Button asChild variant="outline" className="w-full">
                    <Link href="/register">Join this Collector</Link>
                  </Button>
                </motion.div>
              ))
            ) : (
              <div className="col-span-3 text-center text-muted-foreground py-10">
                Loading live collectors...
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial="hidden" 
            whileInView="visible" 
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold mb-4">Why choose Teqemach?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">We bring the traditional Ethiopian Equb system into the digital age with modern security and transparency.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <ShieldCheck className="w-6 h-6"/>, title: "Trusted & Secure", desc: "Your data and contributions are tracked with enterprise-grade security." },
              { icon: <Users className="w-6 h-6"/>, title: "Community Savings", desc: "Build wealth together with friends, family, or verified collectors." },
              { icon: <TrendingUp className="w-6 h-6"/>, title: "Transparent Tracking", desc: "See your cycles, past contributions, and payout schedules in real-time." },
              { icon: <Coins className="w-6 h-6"/>, title: "Easy Contributions", desc: "Mark payments seamlessly and let the system handle the ledger." },
            ].map((benefit, i) => (
              <motion.div 
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { delay: i * 0.1 } }
                }}
                className="bg-card border border-border rounded-2xl p-6"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  {benefit.icon}
                </div>
                <h3 className="font-bold text-lg mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{benefit.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-6 bg-muted/30 border-y border-border">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            initial="hidden" 
            whileInView="visible" 
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground">Start saving in 5 simple steps.</p>
          </motion.div>

          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
            {[
              { title: "Register", desc: "Create an account as a collector or contributor." },
              { title: "Select a Collector", desc: "If you're a contributor, find and join a trusted collector's group." },
              { title: "Join Contributions", desc: "Commit to a daily, weekly, or monthly savings cycle." },
              { title: "Track Savings", desc: "Monitor the group's progress and your payment history." },
              { title: "Receive Payouts", desc: "Get your lump sum payout when it's your turn in the cycle." },
            ].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-primary text-primary-foreground font-bold shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                  {i + 1}
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border bg-card shadow-sm">
                  <h3 className="font-bold text-lg mb-1">{step.title}</h3>
                  <p className="text-muted-foreground text-sm">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 -z-10" />
        <div className="max-w-4xl mx-auto text-center">
          <motion.div 
            initial="hidden" 
            whileInView="visible" 
            viewport={{ once: true }}
            variants={fadeIn}
          >
            <h2 className="text-4xl font-bold mb-6">Ready to start saving?</h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Join thousands of users who have modernized their traditional savings with Teqemach.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="rounded-full w-full sm:w-auto h-14 px-8 text-base shadow-lg shadow-primary/25">
                <Link href="/register">Create Account</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border">
        <p>© {new Date().getFullYear()} Teqemach. All rights reserved.</p>
      </footer>
    </div>
  );
}
