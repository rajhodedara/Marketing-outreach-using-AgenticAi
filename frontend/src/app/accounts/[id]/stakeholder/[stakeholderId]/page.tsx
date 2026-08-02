"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, Variants } from "framer-motion";

export default function StakeholderDetailView({ params }: { params: Promise<{ id: string, stakeholderId: string }> }) {
  const resolvedParams = use(params);
  const accountId = resolvedParams.id;
  const stakeholderId = resolvedParams.stakeholderId; // e.g. "0", "1", "2"
  const router = useRouter();

  const [stakeholders, setStakeholders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccountData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const fetchAccountData = async () => {
    try {
      const res = await fetch(`/api/accounts/${accountId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.latest_analysis?.result?.stakeholders) {
          setStakeholders(data.latest_analysis.result.stakeholders);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const data = stakeholders[parseInt(stakeholderId)];
  if (!data) return (
     <div className="flex-1 flex items-center justify-center bg-background h-[calc(100vh-4rem)]">
        <p className="text-muted-foreground">Stakeholder not found.</p>
      </div>
  );

  const initials = data.name.split(" ").map((n: string) => n[0]).join("").substring(0,2);
  const influence = (data.influence_level || "Unknown").toLowerCase();
  
  let score = 30;
  if (influence.includes("high") || influence.includes("decision")) score = 92;
  else if (influence.includes("medium") || influence.includes("influencer")) score = 65;

  const getStrokeDashoffset = (score: number, circumference: number) => {
    return circumference - (score / 100) * circumference;
  };
  
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as any, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="flex-1 bg-background h-[calc(100vh-4rem)] overflow-y-auto">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-8 py-4 flex items-center justify-between">
         <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href={`/accounts/${accountId}`} className="hover:text-foreground transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Back to Account
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Stakeholder Intelligence</span>
         </div>
         <div className="flex gap-3">
             <Link href={`/accounts/${accountId}/outreach`} className="flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 px-4 py-2 rounded-md text-sm font-medium transition-colors">
               <span className="material-symbols-outlined text-[18px]">campaign</span>
               Generate Outreach
             </Link>
         </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-5xl mx-auto px-8 py-8 space-y-10"
      >
        {/* Hero Strip */}
        <motion.section variants={itemVariants} className="relative overflow-hidden rounded-2xl bg-card border border-border p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
           <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
           
           <div className="flex flex-col md:flex-row items-start md:items-center gap-6 relative z-10">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-background border border-border flex items-center justify-center shadow-inner relative z-10">
                  <span className="text-3xl font-bold text-foreground tracking-tighter uppercase">{initials}</span>
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-primary/40 blur-[2px] animate-pulse"></div>
              </div>
              
              <div>
                 <div className="flex flex-wrap items-center gap-3 mb-2">
                   <h1 className="text-3xl font-bold text-foreground tracking-tight">{data.name}</h1>
                   <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider border border-primary/20 whitespace-nowrap">
                     {data.influence_level || "Unknown Role"}
                   </span>
                 </div>
                 <p className="text-lg text-muted-foreground">{data.role}</p>
                 
                 {/* Quick Action Bar (Glassmorphism) */}
                 <div className="flex flex-wrap items-center gap-2 mt-5">
                    <button onClick={() => router.push(`/accounts/${accountId}/outreach`)} className="active:scale-[0.98] transition-transform flex items-center gap-2 bg-background/50 hover:bg-background backdrop-blur border border-border px-3 py-1.5 rounded-md text-sm text-foreground shadow-sm">
                       <span className="material-symbols-outlined text-[16px]">mail</span> Email
                    </button>
                    <button className="active:scale-[0.98] transition-transform flex items-center gap-2 bg-background/50 hover:bg-background backdrop-blur border border-border px-3 py-1.5 rounded-md text-sm text-foreground shadow-sm">
                       <span className="material-symbols-outlined text-[16px]">calendar_month</span> Meeting
                    </button>
                    <button className="active:scale-[0.98] transition-transform flex items-center gap-2 bg-background/50 hover:bg-background backdrop-blur border border-border px-3 py-1.5 rounded-md text-sm text-foreground shadow-sm">
                       <span className="material-symbols-outlined text-[16px]">add_notes</span> Note
                    </button>
                 </div>
              </div>
           </div>

           {/* Engagement Radial Gauge */}
           <div className="flex items-center gap-4 relative z-10">
              <div className="text-right">
                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Influence Score</p>
                <p className="text-xs text-muted-foreground mt-0.5">Based on parsed context</p>
              </div>
              <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                 <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted/30" />
                    <motion.circle 
                       cx="50" cy="50" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" 
                       className="text-primary"
                       strokeLinecap="round"
                       initial={{ strokeDashoffset: circumference }}
                       animate={{ strokeDashoffset: getStrokeDashoffset(score, circumference) }}
                       transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                       strokeDasharray={circumference}
                    />
                 </svg>
                 <div className="absolute flex items-center justify-center inset-0">
                    <span className="text-xl font-bold text-foreground">{score}</span>
                 </div>
              </div>
           </div>
        </motion.section>

        <div className="grid grid-cols-5 gap-8">
           {/* Left Column (3fr) */}
           <div className="col-span-5 lg:col-span-3 space-y-8">
              {/* Key Concerns */}
              <motion.section variants={itemVariants}>
                 <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-primary">radar</span>
                    <h2 className="text-lg font-semibold text-foreground">Key Concerns & Priorities</h2>
                 </div>
                 {data.key_concerns && data.key_concerns.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                       {data.key_concerns.map((concern: string, i: number) => (
                          <motion.div 
                            key={i}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 + (i * 0.1) }}
                            className="bg-card border border-border border-l-2 border-l-primary rounded-md px-4 py-2 flex items-center gap-2 shadow-sm"
                          >
                             <span className="material-symbols-outlined text-[16px] text-muted-foreground">target</span>
                             <span className="text-sm font-medium text-foreground">{concern}</span>
                          </motion.div>
                       ))}
                    </div>
                 ) : (
                    <div className="bg-card border border-border rounded-lg p-6 text-center shadow-sm flex flex-col items-center">
                       <span className="material-symbols-outlined text-4xl text-muted-foreground/30 mb-2">search_off</span>
                       <p className="text-sm text-muted-foreground">No specific concerns extracted from data sources yet.</p>
                    </div>
                 )}
              </motion.section>

              {/* Communication Intelligence */}
              <motion.section variants={itemVariants}>
                 <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-primary">record_voice_over</span>
                    <h2 className="text-lg font-semibold text-foreground">Extracted Quotes & Context</h2>
                 </div>
                 
                 <div className="space-y-4">
                   {data.quotes && data.quotes.length > 0 ? (
                     data.quotes.map((quote: any, i: number) => (
                       <div key={i} className="bg-[#111111] border border-border rounded-xl p-5 shadow-sm relative overflow-hidden group">
                          <div className="absolute top-0 left-0 w-1 h-full bg-primary/50 group-hover:bg-primary transition-colors"></div>
                          <div className="flex items-center justify-between mb-3">
                             <span className="flex items-center gap-1.5 bg-white/10 text-white/80 text-xs px-2.5 py-1 rounded-full border border-white/10 font-mono">
                               <span className="material-symbols-outlined text-[14px]">source</span>
                               {quote.source || "Transcript"}
                             </span>
                             <span className="text-xs text-white/50 font-mono">{quote.date || "Unknown Date"}</span>
                          </div>
                          <p className="font-mono text-[13px] leading-relaxed text-[#e0e0e0]">
                            "<span className="text-white">{quote.text}</span>"
                          </p>
                       </div>
                     ))
                   ) : (
                     <div className="bg-[#111111] border border-border rounded-xl p-8 shadow-sm flex flex-col items-center justify-center text-center">
                        <span className="material-symbols-outlined text-4xl text-white/10 mb-3">chat_bubble</span>
                        <p className="text-sm text-white/40 font-mono">No direct quotes extracted from available sources.</p>
                     </div>
                   )}
                 </div>
              </motion.section>
           </div>

           {/* Right Column (2fr) */}
           <div className="col-span-5 lg:col-span-2 space-y-8">
              
              {/* Outreach Suggestion */}
              <motion.section variants={itemVariants}>
                 <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex items-center gap-2 mb-3">
                       <span className="material-symbols-outlined text-primary text-[20px]">auto_awesome</span>
                       <h3 className="font-semibold text-primary">Recommended Approach</h3>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed mb-4 relative z-10">
                       Based on {data.name.split(" ")[0]}'s role as {data.role} and focus on {data.key_concerns?.[0] || 'efficiency'}, outreach should emphasize strategic outcomes rather than technical features.
                    </p>
                    <button 
                      onClick={() => router.push(`/accounts/${accountId}/outreach`)}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors py-2 rounded-md text-sm font-medium shadow-sm relative z-10"
                    >
                      Draft Sequence
                    </button>
                 </div>
              </motion.section>

              {/* Relationship Timeline */}
              <motion.section variants={itemVariants}>
                 <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-foreground">history</span>
                    <h2 className="text-lg font-semibold text-foreground">Engagement History</h2>
                 </div>
                 
                 <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    {data.history && data.history.length > 0 ? (
                       <div className="relative border-l-2 border-border/50 ml-3 space-y-6 pb-2">
                          {data.history.map((event: any, i: number) => (
                             <div key={i} className="relative pl-6">
                                <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-card ${i === 0 ? 'bg-primary' : 'bg-muted-foreground/40'}`}></div>
                                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                                   <h4 className={`text-sm font-semibold ${i === 0 ? 'text-foreground' : 'text-foreground/80'}`}>{event.title || 'Event'}</h4>
                                   <span className="text-xs text-muted-foreground whitespace-nowrap">{event.date || 'Past'}</span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                                   {event.desc || event.description || 'No description provided.'}
                                </p>
                             </div>
                          ))}
                       </div>
                    ) : (
                       <div className="flex flex-col items-center justify-center text-center py-6">
                          <div className="w-10 h-10 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center mb-3">
                             <span className="material-symbols-outlined text-muted-foreground/50">hourglass_empty</span>
                          </div>
                          <p className="text-sm text-muted-foreground">No prior engagement history found.</p>
                       </div>
                    )}
                 </div>
              </motion.section>

           </div>
        </div>
      </motion.div>
    </div>
  );
}
