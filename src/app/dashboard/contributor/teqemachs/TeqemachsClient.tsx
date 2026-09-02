"use client";

import { useState, useEffect, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Coins, 
  Sparkles,
  ArrowLeft,
  Calendar,
  Layers,
  Building2,
  Clock,
  X,
  ChevronDown,
  Phone,
  CheckCircle2,
  ScrollText,
  ShieldCheck,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { requestJoinGroup } from "@/lib/actions/contributor";

type EqubTypeCategory = "daily" | "weekly" | "monthly" | "corporate";

const TERMS_OF_SERVICE = `የተጠቃሚዎች መተዳደሪያ ደንብ እና የውል ስምምነት - ውብ ዲጂታል እቁብ (Wub Digital Equb)

አንቀጽ 1፡ ጠቅላላ ድንጋጌዎች

ይህ መተዳደሪያ ደንብ በተጠቃሚው እና በውብ ዲጂታል እቁብ (Wub Digital Equb) አገልግሎት ሰጪው መካከል ያለውን የሕግ፣ የመብት እና የግብዴታ ግንኙነት ይገዛል።

ማንኛውም ተጠቃሚ መተግበሪያውን ማውረድ እና መጠቀም ሲጀምር እነዚህን ውሎች እና ሁኔታዎች ሙሉ በሙሉ እንደተቀበለ ይቆጠራል።

አንቀጽ 2፡ የተጠቃሚ ምዝገባ እና ማንነት ማረጋገጫ (KYC)

ተጠቃሚው ሂሳብ ለመክፈት ትክክለኛ የግል መረጃ፣ ሕጋዊ መታወቂያ (ብሔራዊ ዲጂታል መታወቂያ/ፋይዳ፣ ፓስፖርት ወይም የቀበሌ መታወቂያ) እና በስሙ የተመዘገበ ንቁ የስልክ ቁጥር ማቅረብ አለበት።

ምዝገባው እና የገንዘብ ዝውውሮች የሚረጋገጡት በስልክ በሚላክ የአንድ ጊዜ ሚስጥር ቁጥር (OTP) አማካኝነት ነው።

አንቀጽ 3፡ የእቁብ እና የቁጠባ አሠራር

ተጠቃሚው ከተፈቀደ የባንክ ሂሳብ፣ ከቴሌብር ወይም ከሌሎች ዲጂታል የክፍያ አማራጮች በቀጥታ ወደ እቁብ ሂሳቡ ገንዘብ ገቢ ማድረግ ይችላል።

እያንዳንዱ የእቁብ ገንዘብ ዝውውር በኤስኤምኤስ (SMS) ወይም በመተግበሪያው ማሳወቂያ ወዲያውኑ ለተጠቃሚው ይደርሳል።

አንቀጽ 4፡ ገንዘብ ወጪ የማድረግ የጊዜ ገደብ (Lock-in Period & Withdrawal)

ዝቅተኛው የማቆያ ጊዜ፦ ተጠቃሚው ያስቀመጠውን ሙሉ እቁብ ገንዘብ ወጪ ለማድረግ የሚችለው ቁጠባው ከተጀመረበት ቀን ጀምሮ አንድ ወር ከአስራ አምስት (15) ቀናት (45 ቀናት) ሲሞላው ብቻ ነው።

የገንዘብ ጥያቄ አፈጻጸም፦ የተጠቀሰው የ45 ቀናት ጊዜ እንደተጠናቀቀ፣ ተጠቃሚው በመተግበሪያው በኩል የክፍያ ጥያቄ (Withdrawal Request) ማቅረብ ይችላል፤ ጥያቄው በቀረበ በ24 የሥራ ሰዓታት ውስጥ ገንዘቡ ወደ ተጠቃሚው የባንክ ሂሳብ ወይም ዲጂታል ቦርሳ ይተላለፋል።

ከጊዜው በፊት ወጪ ስለማድረግ (Early Withdrawal)፦ ከተወሰነው 1 ወር ከ15 ቀን በፊት ሂሳብ እንዲዘጋ ወይም ገንዘብ እንዲወጣ ከተጠየቀ፣ የአስተዳደራዊ አገልግሎት ቅጣት ተቀናሽ ይደረጋል።

አንቀጽ 5፡ የደህንነት ጥበቃ እና የተጠቃሚው ኃላፊነት

ተጠቃሚው የመለያውን የይለፍ ቃል እና ሚስጥር ቁጥር (PIN/OTP) የመጠበቅ ሙሉ ኃላፊነት አለበት። የይለፍ ቃል ለሦስተኛ ወገን አሳልፎ በመስጠት ለሚደርስ ጉድለት አገልግሎት ሰጪው ተጠያቂ አይሆንም።

ስልክ ወይም ሲም ካርድ ሲጠፋ አሊያም ያልተፈቀደ ዝውውር ሲጠረጠር ተጠቃሚው በአስቸኳይ ለደንበኞች አገልግሎት የማሳወቅ ግዴታ አለበት።

አንቀጽ 6፡ የገንዘብ ደህንነት እና ሕጋዊ ቁጥጥር (AML/CFT)

የተሰበሰበው ተቀማጭ ገንዘብ በኢትዮጵያ ብሔራዊ ባንክ ፈቃድ ባለው የታመነ አጋር የፋይናንስ ተቋም ዝግ ሂሳብ (Escrow Account) ውስጥ በደህንነት ይቀመጣል።

ሂሳቡን ለሕገወጥ የገንዘብ ዝውውር፣ ለማጭበርበር ወይም ለማንኛውም ወንጀል መጠቀም በጥብቅ የተከለከለ ነው። አጠራጣሪ እንቅስቃሴ የታየበት ሂሳብ ያለቅድመ ማስጠንቀቂያ ይታገዳል።

አንቀጽ 7፡ የመረጃ ሚስጥራዊነት (Data Privacy)

የተጠቃሚው የግል መረጃ እና የግብይት ታሪክ በሚስጥር ይጠበቃል።

መረጃ ለሦስተኛ ወገን የሚተላለፈው በተጠቃሚው ፈቃድ ወይም በፍርድ ቤት እና በሕግ አስገዳጅ ትዕዛዝ ሲኖር ብቻ ነው።

አንቀጽ 8፡ ቅሬታ አፈታት እና ተፈጻሚነት ያለው ሕግ

ተጠቃሚው የሚያጋጥመውን ችግር በይፋዊ የደንበኞች ቅሬታ ማስተናገጃ ማቅረብ የሚችል ሲሆን፣ በ7 የሥራ ቀናት ውስጥ ምላሽ ይሰጣል።

ይህ መተዳደሪያ ደንብ በኢትዮጵያ ፌዴራላዊ ዴሞክራሲያዊ ሪፐብሊክ ሕጎች መሠረት የሚመራ እና የሚተረጎም ነው።`;

export default function TeqemachsClient({ 
  userName = "Webshet W.",
  userId,
  allGroups = []
}: { 
  userName?: string;
  userId?: string;
  allGroups?: any[];
}) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = (searchParams.get("type") as EqubTypeCategory) || "daily";
  
  const [selectedType, setSelectedType] = useState<EqubTypeCategory>(initialType);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [joinStep, setJoinStep] = useState<"details" | "terms" | "success">("details");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const queryType = searchParams.get("type") as EqubTypeCategory;
    if (queryType && ["daily", "weekly", "monthly", "corporate"].includes(queryType)) {
      setSelectedType(queryType);
    }
  }, [searchParams]);

  // Filter active groups based on selected type category
  const filteredGroups = allGroups.filter((g) => {
    if (selectedType === "daily") return g.frequency?.toLowerCase() === "daily" || !g.frequency;
    if (selectedType === "weekly") return g.frequency?.toLowerCase() === "weekly";
    if (selectedType === "monthly") return g.frequency?.toLowerCase() === "monthly";
    return true;
  });

  const categories: { id: EqubTypeCategory; label: string; icon: any }[] = [
    { id: "daily", label: "Daily Equbs", icon: Clock },
    { id: "weekly", label: "Weekly Equbs", icon: Calendar },
    { id: "monthly", label: "Monthly Equbs", icon: Layers },
    { id: "corporate", label: "Corporate Equbs", icon: Building2 },
  ];

  function openGroupSheet(group: any) {
    setSelectedGroup(group);
    setJoinStep("details");
  }

  function closeSheet() {
    setSelectedGroup(null);
    setJoinStep("details");
  }

  function handleJoinClick() {
    if (joinStep === "details") {
      // First click: show terms
      setJoinStep("terms");
    }
  }

  const [joinError, setJoinError] = useState<string | null>(null);

  function handleAcceptTerms() {
    if (!userId || !selectedGroup) {
      setJoinError("User or Group ID missing. Please log in.");
      return;
    }
    setJoinError(null);
    startTransition(async () => {
      const startDateISO = new Date().toISOString();
      const result = await requestJoinGroup(userId, selectedGroup.id, startDateISO);
      if (result.success) {
        setJoinStep("success");
        setTimeout(() => {
          closeSheet();
          router.refresh();
        }, 2000);
      } else {
        setJoinError(result.error || "Failed to submit join request");
      }
    });
  }

  // Calculate group details for the sheet
  const groupDetails = selectedGroup ? (() => {
    const amount = selectedGroup.contribution_amount || selectedGroup.amount || 0;
    const days = selectedGroup.total_days || selectedGroup.days || 0;
    const totalAmount = amount * days;
    
    // Base payout is calculated on 100 days (or 100/105 ratio for other group lengths)
    const payoutDays = days >= 105 ? 100 : Math.round(days * (100 / 105));
    const payoutAmount = amount * payoutDays;
    const serviceCharge = totalAmount - payoutAmount;
    
    return {
      totalAmount,
      quota: days,
      duration: `${days} days`,
      startDate: selectedGroup.created_at ? new Date(selectedGroup.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBD",
      payoutAmount,
      serviceCharge,
    };
  })() : null;

  return (
    <div className="min-h-screen bg-background pb-20 -m-4 md:-m-6 lg:-m-8 text-foreground">
      
      {/* ─── 1. TOP HEADER BANNER (GRADIENT CURVED CONTAINER) ──────────────── */}
      <div className="relative bg-gradient-to-br from-brand-900 via-brand-800 to-brand-900 text-white pt-6 pb-12 px-5 rounded-b-[2rem] shadow-xl border-b border-indigo-500/20 overflow-hidden">

        {/* Top Header Row: Back Link & Icons */}
        <div className="flex items-center justify-between relative z-10 mb-6">
          <Link 
            href="/dashboard/contributor" 
            className="flex items-center gap-2 text-xs font-semibold text-blue-200 hover:text-white bg-white/10  border border-white/20 px-3 py-1.5 rounded-full transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Home Dashboard
          </Link>

          <div className="flex items-center gap-2">
            {userId && (
              <div className="w-9 h-9 rounded-full bg-white/10  border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all">
                <NotificationBell userId={userId} />
              </div>
            )}
            <div className="w-9 h-9 rounded-full bg-white/10  border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all">
              <LanguageToggle />
            </div>
          </div>
        </div>

        {/* Banner Tagline & Title */}
        <div className="relative z-10 space-y-1">
          <span className="text-xs font-medium text-blue-300 uppercase tracking-wider block">
            {locale === "am" ? "ንቁ የእቁብ ቡድኖች" : "Active Equb Groups"}
          </span>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white leading-snug">
            {locale === "am" ? "ያሉ " : "Available "}
            <span className="text-blue-400 font-extrabold">{selectedType.toUpperCase()}</span>
            {locale === "am" ? " እቁቦች" : " Equbs"}
          </h1>
          <div className="ethiopian-divider mt-2 w-24" />
        </div>
      </div>

      {/* ─── 2. MAIN CONTAINER ────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-6 relative z-20 space-y-6">

        {/* ─── CATEGORY TAB SWITCHER PILLS ─────────────────────────────── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedType === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedType(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-blue-600/30 shadow-md"
                    : "bg-card border border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* ─── DYNAMIC EQUBS LIST SECTION ──── */}
        <div className="bg-card border border-border rounded-3xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-card-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                {selectedType === "daily" && (locale === "am" ? "ዕለታዊ እቁቦች" : "Daily Equbs")}
                {selectedType === "weekly" && (locale === "am" ? "ሳምንታዊ እቁቦች" : "Weekly Equbs")}
                {selectedType === "monthly" && (locale === "am" ? "ወርሃዊ እቁቦች" : "Monthly Equbs")}
                {selectedType === "corporate" && (locale === "am" ? "የድርጅት እቁቦች" : "Corporate Equbs")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {locale === "am" ? `ለመቀላቀል የተዘጋጁ ንቁ የ${selectedType} እቁቦች` : `Active ${selectedType} savings groups available for quick join`}
              </p>
            </div>
            <Badge className="rounded-full text-xs font-semibold px-3 py-1 bg-blue-600 text-white">
              {filteredGroups.length} {locale === "am" ? "ንቁ" : "Active"}
            </Badge>
          </div>

          {/* List items */}
          {filteredGroups.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl">
              <Layers className="w-10 h-10 mx-auto mb-2 opacity-30 text-muted-foreground" />
              <p className="text-sm font-medium">
                {locale === "am" ? `በአሁኑ ሰዓት ምንም ንቁ የ${selectedType} እቁብ አልተገኘም።` : `No active ${selectedType} Equbs available at the moment.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGroups
                .map((g) => ({
                  id: g.id,
                  name: g.name,
                  amount: g.contribution_amount,
                  days: g.total_days,
                  rate: g.frequency ? `Every ${g.frequency}` : (selectedType === "daily" ? "Every daily" : selectedType === "weekly" ? "Every week" : "Every month"),
                  collector: g.collector?.full_name ? `Collector: ${g.collector.full_name}` : "Collector: Assigned Collector",
                  created_at: g.created_at,
                  contribution_amount: g.contribution_amount,
                  total_days: g.total_days,
                }))
                .sort((a, b) => (b.amount || 0) - (a.amount || 0))
                .map((g) => (
                  <button 
                    key={g.id}
                    onClick={() => openGroupSheet(g)}
                    className="w-full text-left p-4 rounded-2xl border border-border bg-card hover:bg-muted/30 transition-all flex items-center justify-between gap-4 shadow-sm"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-600/30 shrink-0">
                        <Coins className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-base text-card-foreground leading-tight">{g.name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{g.collector}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs font-semibold text-blue-400">
                          <span>ETB {g.amount.toLocaleString()} ({g.rate})</span>
                          <span>•</span>
                          <span>{g.days} Days</span>
                        </div>
                      </div>
                    </div>

                    <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                  </button>
                ))}
            </div>
          )}
        </div>

      </div>

      {/* ─── BOTTOM SHEET OVERLAY ─────────────────────────────────────── */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50" onClick={closeSheet}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" />
          
          {/* Sheet */}
          <div 
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-emerald-500 rounded-full" />
            </div>

            <div className="px-6 pb-8">
              {/* ─── DETAILS VIEW ─── */}
              {joinStep === "details" && (
                <>
                  <h2 className="text-xl font-bold text-card-foreground mb-5">
                    {selectedGroup.name} – ETB
                  </h2>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="border border-border rounded-2xl p-4">
                      <p className="text-xs text-muted-foreground mb-1">Total amount</p>
                      <p className="text-lg font-bold text-card-foreground">
                        {groupDetails?.totalAmount.toLocaleString()}
                      </p>
                    </div>
                    <div className="border border-border rounded-2xl p-4">
                      <p className="text-xs text-muted-foreground mb-1">Quota</p>
                      <p className="text-lg font-bold text-card-foreground">
                        {groupDetails?.quota}
                      </p>
                    </div>
                    <div className="border border-border rounded-2xl p-4">
                      <p className="text-xs text-muted-foreground mb-1">Duration</p>
                      <p className="text-lg font-bold text-card-foreground">
                        {groupDetails?.duration}
                      </p>
                    </div>
                    <div className="border border-border rounded-2xl p-4">
                      <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                      <p className="text-lg font-bold text-card-foreground">
                        {groupDetails?.startDate}
                      </p>
                    </div>
                    <div className="border border-border rounded-2xl p-4">
                      <p className="text-xs text-muted-foreground mb-1">Payout amount</p>
                      <p className="text-lg font-bold text-card-foreground">
                        {groupDetails?.payoutAmount.toLocaleString()}
                      </p>
                    </div>
                    <div className="border border-border rounded-2xl p-4">
                      <p className="text-xs text-muted-foreground mb-1">Service charge</p>
                      <p className="text-lg font-bold text-card-foreground">
                        {groupDetails?.serviceCharge.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      onClick={handleJoinClick}
                      className="flex-1 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg shadow-lg shadow-emerald-600/20"
                    >
                      Join
                    </Button>
                    <a 
                      href="tel:+251911000000"
                      className="w-14 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20"
                    >
                      <Phone className="w-5 h-5" />
                    </a>
                  </div>
                </>
              )}

              {/* ─── TERMS OF SERVICE VIEW ─── */}
              {joinStep === "terms" && (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center">
                      <ScrollText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-card-foreground">
                        መተዳደርያ ደንብ
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        ከመቀላቀልዎ በፊት ያንብቡ
                      </p>
                    </div>
                  </div>

                  {joinError && (
                    <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs font-semibold text-destructive">
                      {joinError}
                    </div>
                  )}

                  <div className="border border-border rounded-2xl p-4 mb-5 max-h-[45vh] overflow-y-auto bg-muted/30">
                    <p className="text-sm text-card-foreground whitespace-pre-line leading-relaxed">
                      {TERMS_OF_SERVICE}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      variant="outline"
                      onClick={() => setJoinStep("details")}
                      className="flex-1 h-14 rounded-2xl font-bold text-base"
                    >
                      {locale === "am" ? "ተመለስ" : "Back"}
                    </Button>
                    <Button 
                      onClick={handleAcceptTerms}
                      disabled={isPending}
                      className="flex-1 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-lg shadow-emerald-600/20 gap-2"
                    >
                      {isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-5 h-5" />
                      )}
                      {locale === "am" ? "ተቀበል እና ተቀላቀል" : "Accept & Join"}
                    </Button>
                  </div>
                </>
              )}

              {/* ─── SUCCESS VIEW ─── */}
              {joinStep === "success" && (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  </div>
                  <h2 className="text-xl font-bold text-card-foreground text-center">
                    {locale === "am" ? "ጥያቄዎ ተልኳል!" : "Request Sent!"}
                  </h2>
                  <p className="text-sm text-muted-foreground text-center max-w-xs">
                    {locale === "am" 
                      ? "የመቀላቀል ጥያቄዎ ለአስተዳዳሪ ተልኳል። ሲፈቀድ ማሳወቂያ ይደርስዎታል።"
                      : "Your join request has been sent to the administrator. You will be notified once approved."
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
