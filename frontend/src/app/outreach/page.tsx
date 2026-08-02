"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { PaperPlaneRight, CalendarBlank, ChartLineUp, EnvelopeSimple, LinkedinLogo, Phone, Hash } from "@phosphor-icons/react";

export default function GlobalOutreach() {
  const router = useRouter();
  const [sequences, setSequences] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [seqRes, accRes] = await Promise.all([
        fetch("/api/nova/sequences"),
        fetch("/api/accounts")
      ]);

      if (seqRes.ok && accRes.ok) {
        const seqData = await seqRes.json();
        const accData = await accRes.json();
        
        // Map accounts for quick lookup
        const accMap: Record<string, any> = {};
        (accData.accounts || []).forEach((a: any) => {
          accMap[a.id] = a;
        });
        
        setAccounts(accMap);
        setSequences(seqData.sequences || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredSequences = sequences.filter((s) => {
    const q = searchQuery.toLowerCase();
    const accountName = accounts[s.account_id]?.company_name || "";
    return (
      (s.name && s.name.toLowerCase().includes(q)) ||
      (accountName.toLowerCase().includes(q)) ||
      (s.target_persona && s.target_persona.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active": return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>;
      case "Paused": return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">Paused</span>;
      case "Completed": return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">Completed</span>;
      default: return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-zinc-700">{status}</span>;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel.toLowerCase()) {
      case "email": return <EnvelopeSimple className="w-3.5 h-3.5" />;
      case "linkedin": return <LinkedinLogo className="w-3.5 h-3.5" />;
      case "phone": return <Phone className="w-3.5 h-3.5" />;
      case "slack": return <Hash className="w-3.5 h-3.5" />;
      default: return <PaperPlaneRight className="w-3.5 h-3.5" />;
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const rowVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
  };

  return (
    <div className="flex-1 flex flex-col bg-background min-h-[100dvh] relative overflow-hidden">
      {/* Dynamic Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[350px] w-[350px] rounded-full bg-emerald-500/40 opacity-40 blur-[120px]"></div>
      </div>

      {/* High-End Header */}
      <div className="pt-16 pb-8 px-8 border-b border-border bg-card/40 backdrop-blur-xl relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-emerald-600 mb-2">Outreach Command</h1>
            <p className="text-base text-muted-foreground max-w-xl leading-relaxed">
              Global view of active sequences, automated plays, and outreach across all accounts. Orchestrate multi-channel engagements seamlessly.
            </p>
          </div>
          <div className="relative w-full md:w-80 group">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-muted-foreground/50 group-focus-within:text-emerald-500 transition-colors text-[20px] z-10">search</span>
            <input 
              type="text" 
              placeholder="Search sequence, account, or persona..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full backdrop-blur-xl bg-white/5 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] rounded-[12px] pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-muted-foreground/50 relative z-0"
            />
          </div>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] rounded-[16px] p-5 flex items-center justify-between group hover:border-primary/30 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-all duration-300">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 group-hover:text-foreground/80 transition-colors">Total Sequences</p>
              <h3 className="text-3xl font-bold text-foreground bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">{sequences.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-[12px] bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              <ChartLineUp weight="duotone" className="w-6 h-6" />
            </div>
          </div>
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] rounded-[16px] p-5 flex items-center justify-between group hover:border-emerald-500/30 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] transition-all duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 group-hover:text-emerald-500/80 transition-colors">Active</p>
              <h3 className="text-3xl font-bold text-foreground bg-clip-text text-transparent bg-gradient-to-br from-emerald-400 to-emerald-600">{sequences.filter(s => s.status === 'Active').length}</h3>
            </div>
            <div className="relative z-10 w-12 h-12 rounded-[12px] bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              <PaperPlaneRight weight="duotone" className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 pb-8 relative z-10">
        <div className="grid grid-cols-12 gap-4 px-4 pb-3 border-b border-border text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
          <div className="col-span-4 md:col-span-4">Sequence</div>
          <div className="hidden md:block col-span-3">Account</div>
          <div className="col-span-4 md:col-span-2">Target Persona</div>
          <div className="col-span-2 text-center">Status</div>
          <div className="col-span-2 md:col-span-1 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-muted-foreground animate-pulse">Loading global outreach...</p>
          </div>
        ) : filteredSequences.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-border/50 rounded-[16px] mt-4 backdrop-blur-xl bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
            <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-3">
              <PaperPlaneRight className="text-muted-foreground w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">No Sequences Found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {searchQuery ? "Try adjusting your search filters." : "You haven't created any outreach sequences yet."}
            </p>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-2 mt-4"
          >
            <AnimatePresence>
              {filteredSequences.map((seq, idx) => {
                const accountName = accounts[seq.account_id]?.company_name || "Unknown Account";
                return (
                  <motion.div 
                    key={seq.id || idx}
                    variants={rowVariants}
                    layout
                    className="grid grid-cols-12 gap-4 px-4 py-4 backdrop-blur-xl bg-white/5 border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:bg-white/10 hover:border-primary/20 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:scale-[1.01] rounded-[16px] items-center transition-all duration-300 group cursor-pointer"
                    onClick={() => router.push(`/accounts/${seq.account_id}/outreach`)}
                  >
                    {/* Sequence Name */}
                    <div className="col-span-4 md:col-span-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-[8px] bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <CalendarBlank weight="bold" className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{seq.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                          {seq.steps?.length || 0} step{(seq.steps?.length || 0) !== 1 && 's'}
                          {seq.steps && seq.steps.length > 0 && (
                            <span className="flex items-center gap-0.5 ml-1">
                              • 
                              {seq.steps.slice(0, 3).map((step: any, i: number) => (
                                <span key={i} className="text-muted-foreground/70" title={step.channel}>
                                  {getChannelIcon(step.channel)}
                                </span>
                              ))}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Account */}
                    <div className="hidden md:flex col-span-3 items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{accountName}</span>
                    </div>

                    {/* Target Persona */}
                    <div className="col-span-4 md:col-span-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-[6px] bg-muted/50 text-[11px] font-medium text-foreground truncate max-w-full">
                        {seq.target_persona || "Any"}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="col-span-2 flex justify-center">
                      {getStatusBadge(seq.status)}
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 md:col-span-1 flex justify-end">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/accounts/${seq.account_id}/outreach`);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-[8px] transition-all"
                      >
                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
