"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signUp, signInWithGoogle, getCollectors } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, User, Mail, Lock, Phone, Search, ChevronRight } from "lucide-react";

type Collector = { id: string; full_name: string | null; email: string | null };

export function ContributorRegistration({ hideHeader }: { hideHeader?: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCollector, setSelectedCollector] = useState<Collector | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const fetchCollectors = async () => {
      const res = await getCollectors();
      if (res.data) {
        setCollectors(res.data);
      }
    };
    fetchCollectors();
  }, []);

  const filteredCollectors = collectors.filter(c => 
    (c.full_name?.toLowerCase().includes(search.toLowerCase())) || 
    (c.email?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const result = await signInWithGoogle("contributor");
      if (result?.error) {
        setError(result.error);
        setGoogleLoading(false);
      } else if (result?.url) {
        window.location.href = result.url;
      }
    } catch {
      setError("An unexpected error occurred");
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!selectedCollector) {
      setError("Please select a collector first");
      return;
    }

    setLoading(true);
    try {
      const result = await signUp({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: "contributor",
        collectorId: selectedCollector.id
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/login?success=contributor_created");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md animate-fadeInUp">
      {!hideHeader && (
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Contributor Registration</h2>
            <p className="text-muted-foreground mt-1">Join an existing savings group</p>
          </div>
          <Button variant="ghost" onClick={() => setStep(1)} size="sm">Back</Button>
        </div>
      )}
      
      {hideHeader && step === 2 && (
        <Button variant="ghost" onClick={() => setStep(1)} size="sm" className="mb-4">
          ← Back to Collector Search
        </Button>
      )}

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {step === 1 ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Search for a Collector</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Search by name or email..." 
                className="pl-10" 
              />
            </div>
          </div>

          <div className="border rounded-xl max-h-60 overflow-y-auto bg-card">
            {filteredCollectors.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No collectors found.</div>
            ) : (
              <div className="divide-y">
                {filteredCollectors.map((collector) => (
                  <button
                    key={collector.id}
                    onClick={() => {
                      setSelectedCollector(collector);
                      setStep(2);
                    }}
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/50 text-left transition-colors"
                  >
                    <div>
                      <div className="font-medium text-sm">{collector.full_name || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">{collector.email}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 mb-4 rounded-xl bg-primary/10 border border-primary/20 text-sm">
            Joining Collector: <strong>{selectedCollector?.full_name}</strong>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="fullName" value={formData.fullName} onChange={handleChange} placeholder="Jane Doe" className="pl-10" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="email" type="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" className="pl-10" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="+251..." className="pl-10" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" value={formData.password} onChange={handleChange} placeholder="••••••••" className="pl-10" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" className="pl-10" required />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading || googleLoading}>
            {loading ? "Creating account..." : "Register as Contributor"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button type="button" variant="outline" className="w-full relative bg-background hover:bg-muted" onClick={handleGoogleLogin} disabled={googleLoading || loading}>
            {googleLoading ? "Loading..." : (
              <>
                <svg className="absolute left-4 h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </>
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
