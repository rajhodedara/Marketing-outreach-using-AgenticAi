"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, Variants } from "framer-motion";

export default function GlobalStakeholdersDirectory() {
  const router = useRouter();
  const [stakeholders, setStakeholders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchStakeholders();
  }, []);

  const fetchStakeholders = async () => {
    try {
      const res = await fetch("/api/stakeholders/all");
      if (res.ok) {
        const data = await res.json();
        setStakeholders(data.stakeholders || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredStakeholders = stakeholders.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.company_name && s.company_name.toLowerCase().includes(q)) ||
      (s.role && s.role.toLowerCase().includes(q))
    );
  });

  const getInitials = (name: string) => {
    if (!name) return "NA";
    return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const getInfluenceBadge = (influence: string) => {
    const l = (influence || "").toLowerCase();
    if (l.includes("high") || l.includes("decision")) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">Decision Maker</span>;
    }
    if (l.includes("medium") || l.includes("influencer")) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-500 border border-sky-500/20">Influencer</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border">Unknown</span>;
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const rowVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
  };

  return (
    <div className="flex-1 flex flex-col bg-background min-h-[100dvh]">
      {/* High-End Header */}
      <div className="pt-16 pb-8 px-8 border-b border-border bg-card">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-foreground mb-2">Stakeholder Intelligence</h1>
            <p className="text-base text-muted-foreground max-w-xl leading-relaxed">
              Global directory of all identified buyers and influencers across analyzed accounts. Use this command center to orchestrate highly targeted ABM sequences.
            </p>
          </div>
          <div className="relative w-full md:w-80 group">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-muted-foreground/50 group-focus-within:text-primary transition-colors text-[20px]">search</span>
            <input 
              type="text" 
              placeholder="Search by name, role, or company..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* The Intelligent List (Cockpit Mode - Density 8) */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-8">
        
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-4 pb-3 border-b border-border text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
          <div className="col-span-4 md:col-span-3">Stakeholder</div>
          <div className="col-span-4 md:col-span-3 hidden md:block">Account</div>
          <div className="col-span-4 md:col-span-3">Key Priority</div>
          <div className="col-span-4 md:col-span-3 text-right">Actions</div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
             <p className="text-sm font-mono text-muted-foreground uppercase tracking-widest">Compiling Directory...</p>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex flex-col divide-y divide-border/50"
          >
            <AnimatePresence>
              {filteredStakeholders.length > 0 ? (
                filteredStakeholders.map((s, idx) => (
                  <motion.div 
                    layout
                    variants={rowVariants}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    key={`${s.account_id}-${s.stakeholder_index}-${idx}`}
                    className="grid grid-cols-12 gap-4 items-center px-4 py-4 group hover:bg-card/40 transition-colors"
                  >
                    {/* Stakeholder Info */}
                    <div className="col-span-6 md:col-span-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-card border border-border flex flex-shrink-0 items-center justify-center text-primary font-bold text-xs shadow-sm">
                        {getInitials(s.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                           <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{s.role}</p>
                      </div>
                    </div>

                    {/* Account Info */}
                    <div className="col-span-6 md:col-span-3 hidden md:flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-muted-foreground/50">domain</span>
                      <div>
                         <Link href={`/accounts/${s.account_id}`} className="text-sm text-foreground hover:text-primary transition-colors truncate block">
                           {s.company_name || 'Unknown Account'}
                         </Link>
                         <div className="mt-0.5">{getInfluenceBadge(s.influence_level)}</div>
                      </div>
                    </div>

                    {/* Key Priority */}
                    <div className="col-span-6 md:col-span-3">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-muted/50 border border-border/50 max-w-full">
                         <span className="material-symbols-outlined text-[14px] text-muted-foreground">target</span>
                         <span className="text-xs text-foreground truncate">{s.key_concerns?.[0] || 'Unknown Focus'}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="col-span-6 md:col-span-3 flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                      <Link 
                        href={`/accounts/${s.account_id}/outreach`}
                        className="w-8 h-8 flex items-center justify-center bg-card border border-border hover:border-primary/50 hover:bg-primary/5 hover:text-primary rounded-md transition-colors text-muted-foreground"
                        title="Draft Outreach"
                      >
                        <span className="material-symbols-outlined text-[16px]">mail</span>
                      </Link>
                      <Link 
                        href={`/accounts/${s.account_id}/stakeholder/${s.stakeholder_index}`}
                        className="w-8 h-8 flex items-center justify-center bg-card border border-border hover:border-foreground/50 hover:bg-muted hover:text-foreground rounded-md transition-colors text-muted-foreground"
                        title="View Intelligence Dossier"
                      >
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                      </Link>
                    </div>
                  </motion.div>
                ))
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-20 flex flex-col items-center justify-center text-center"
                >
                   <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center mb-4 shadow-sm">
                      <span className="material-symbols-outlined text-3xl text-muted-foreground/50">search_off</span>
                   </div>
                   <h3 className="text-lg font-semibold text-foreground mb-1">No Stakeholders Found</h3>
                   <p className="text-sm text-muted-foreground">
                     {searchQuery ? "No results match your search." : "Analyze an account to populate the directory."}
                   </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
