"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function OutreachStrategyView({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const accountId = resolvedParams.id;
  const router = useRouter();
  
  const [activeStep, setActiveStep] = useState(1);
  const [showInspector, setShowInspector] = useState(false);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Controlled fields for email sending
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  
  const activeDraft = drafts[activeStep - 1] || null;

  useEffect(() => {
    if (activeDraft) {
      const nameOnly = activeDraft.target_persona?.split('(')[0].trim() || "recipient";
      const fakeEmail = nameOnly.toLowerCase().replace(/[^a-z0-9]/g, '.') + "@example.com";
      setToEmail(fakeEmail);
      setSubject("Addressing your core priorities");
    }
  }, [activeDraft, activeStep]);

  useEffect(() => {
    fetchAccountData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const fetchAccountData = async () => {
    try {
      const res = await fetch(`/api/accounts/${accountId}`);
      if (res.ok) {
        const data = await res.json();
        setAccount(data);
        if (data.latest_analysis?.result?.outreach_drafts) {
          setDrafts(data.latest_analysis.result.outreach_drafts);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const regenerateDraft = async () => {
    if (!accountId || drafts.length === 0) return;
    const toastId = toast.loading("Re-generating draft with AI...", { description: "Agent is rewriting the draft based on latest insights." });
    try {
      const res = await fetch(`/api/accounts/${accountId}/drafts/${activeStep - 1}/regenerate`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Failed to regenerate");
      const data = await res.json();
      
      const newDrafts = [...drafts];
      newDrafts[activeStep - 1] = data.draft;
      setDrafts(newDrafts);
      
      toast.success("Draft successfully re-generated!", { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error("Failed to regenerate draft.", { id: toastId });
    }
  };

  const handleSendEmail = async () => {
    if (!accountId || !activeDraft) return;
    const toastId = toast.loading("Sending email...", { description: "Dispatching via SMTP relay..." });
    try {
      const res = await fetch(`/api/accounts/${accountId}/drafts/${activeStep - 1}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_email: toEmail,
          subject: subject,
          content: activeDraft.content
        })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to send");
      }
      toast.success("Email sent successfully!", { id: toastId });
    } catch (e: any) {
      console.error(e);
      toast.error(`Send failed: ${e.message}`, { id: toastId });
    }
  };

  const getChannelColor = (channel: string) => {
    const ch = (channel || "").toLowerCase();
    if (ch.includes("email")) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (ch.includes("linkedin")) return "text-sky-500 bg-sky-500/10 border-sky-500/20";
    if (ch.includes("call") || ch.includes("phone")) return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    return "text-muted-foreground bg-muted border-border";
  };

  const getChannelIcon = (channel: string) => {
    const ch = (channel || "").toLowerCase();
    if (ch.includes("email")) return "mail";
    if (ch.includes("linkedin")) return "forum";
    if (ch.includes("call") || ch.includes("phone")) return "call";
    return "campaign";
  };

  return (
    <div className="flex-1 flex flex-col bg-background h-[calc(100vh-4rem)] overflow-hidden">
      
      {/* Top Campaign Bar */}
      <div className="h-16 shrink-0 bg-card border-b border-border px-6 flex items-center justify-between shadow-sm z-20">
         <div className="flex items-center gap-4">
            <Link href={`/accounts/${accountId}`} className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
               <span className="material-symbols-outlined text-[18px]">close</span>
            </Link>
            <div>
               <div className="flex items-center gap-2">
                 <h1 className="text-sm font-semibold text-foreground">Campaign Command Center</h1>
                 <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-primary/10 text-primary border border-primary/20">Drafting</span>
               </div>
               <p className="text-xs text-muted-foreground">{account?.company_name || 'Loading Account...'} • Q4 Push</p>
            </div>
         </div>
         
         <div className="flex items-center gap-6">
            <div className="flex flex-col items-end gap-1">
               <span className="text-xs text-muted-foreground">{drafts.length} sequence steps</span>
               <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div 
                     className="h-full bg-primary" 
                     initial={{ width: 0 }} 
                     animate={{ width: `${(activeStep / Math.max(drafts.length, 1)) * 100}%` }}
                  />
               </div>
            </div>
            
            <button 
              onClick={() => setShowInspector(!showInspector)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${showInspector ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80'}`}
            >
              <span className="material-symbols-outlined text-[16px]">menu_book</span>
              Context
            </button>
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Pane: Sequence Timeline */}
        <aside className="w-80 border-r border-border bg-[#0d0d0d] flex flex-col shrink-0 z-10 relative">
          <div className="p-4 border-b border-border/50">
            <h2 className="text-xs tracking-widest font-semibold uppercase text-muted-foreground">Sequence Timeline</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
               <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mb-3"></div>
                  <span className="text-xs">Loading timeline...</span>
               </div>
            ) : drafts.length > 0 ? (
               <div className="relative">
                  <div className="absolute left-[19px] top-4 bottom-4 w-px bg-border/40"></div>
                  
                  {drafts.map((draft, idx) => {
                     const isActive = activeStep === idx + 1;
                     const channel = draft.channel || "Unknown";
                     return (
                        <div key={idx} className="relative pl-12 pb-6 group cursor-pointer" onClick={() => setActiveStep(idx + 1)}>
                           <div className={`absolute left-3 top-2 w-4 h-4 rounded-full flex items-center justify-center transition-colors duration-300 ${isActive ? 'bg-primary ring-4 ring-primary/20' : 'bg-card border border-border group-hover:border-primary/50'}`}>
                              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-background"></div>}
                           </div>
                           
                           <motion.div 
                              layoutId={`step-card-${idx}`}
                              className={`p-4 rounded-xl border transition-all duration-300 ${isActive ? 'bg-card border-primary/50 shadow-md shadow-primary/5' : 'bg-card/50 border-border/50 group-hover:bg-card group-hover:border-border'}`}
                           >
                              <div className="flex items-center justify-between mb-2">
                                 <span className={`text-xs font-semibold ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>Step {idx + 1}</span>
                                 <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getChannelColor(channel)}`}>
                                    <span className="material-symbols-outlined text-[12px]">{getChannelIcon(channel)}</span>
                                    {channel}
                                 </span>
                              </div>
                              <div className={`text-sm mb-1 ${isActive ? 'text-foreground font-medium' : 'text-foreground/80'}`}>
                                 {draft.target_persona?.split('(')[0].trim() || 'Unknown Persona'}
                              </div>
                              <div className="text-xs text-muted-foreground line-clamp-2">
                                 {draft.content || "No content."}
                              </div>
                           </motion.div>
                        </div>
                     );
                  })}
               </div>
            ) : (
               <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                  <span className="material-symbols-outlined text-4xl text-muted-foreground/30 mb-2">history_edu</span>
                  <p className="text-xs text-muted-foreground">No sequence drafts generated for this account.</p>
               </div>
            )}
          </div>
        </aside>

        {/* Center Pane: Composer */}
        <section className="flex-1 flex flex-col bg-background relative min-w-0">
           {activeDraft ? (
              <motion.div 
                key={activeStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col p-6 max-w-4xl mx-auto w-full h-full"
              >
                 {/* Composer Header */}
                 <div className="flex items-center justify-between mb-6">
                    <div>
                       <h2 className="text-xl font-bold text-foreground mb-1">Message Editor</h2>
                       <p className="text-xs text-muted-foreground">Review and refine the AI-generated outreach.</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                       <button 
                         onClick={regenerateDraft}
                         disabled={loading}
                         className="flex items-center gap-2 px-4 py-2 bg-card hover:bg-muted border border-border rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                       >
                          <span className="material-symbols-outlined text-[18px]">magic_button</span>
                          AI Rewrite
                       </button>
                       <button 
                         onClick={handleSendEmail}
                         disabled={loading}
                         className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium shadow-sm transition-colors disabled:opacity-50 active:scale-95"
                       >
                          <span className="material-symbols-outlined text-[18px]">send</span>
                          Approve & Send
                       </button>
                    </div>
                 </div>
                 
                 {/* Glassmorphism Email Fields */}
                 <div className="bg-card/40 backdrop-blur-md border border-border rounded-t-xl p-4 space-y-3">
                    <div className="flex items-center gap-4">
                       <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-16 text-right">To</label>
                       <input 
                         className="flex-1 bg-transparent border-none text-sm text-foreground focus:ring-0 focus:outline-none placeholder:text-muted-foreground/50"
                         value={toEmail}
                         onChange={(e) => setToEmail(e.target.value)}
                         placeholder="recipient@example.com"
                       />
                    </div>
                    <div className="h-px bg-border/50 w-full"></div>
                    <div className="flex items-center gap-4">
                       <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-16 text-right">Subject</label>
                       <input 
                         className="flex-1 bg-transparent border-none text-sm font-medium text-foreground focus:ring-0 focus:outline-none placeholder:text-muted-foreground/50"
                         value={subject}
                         onChange={(e) => setSubject(e.target.value)}
                         placeholder="Email subject..."
                       />
                    </div>
                 </div>
                 
                 {/* Body Editor */}
                 <div className="flex-1 bg-card border-x border-b border-border rounded-b-xl p-6 shadow-sm overflow-y-auto">
                    <textarea 
                       className="w-full h-full min-h-[300px] resize-none bg-transparent border-none text-[15px] leading-relaxed text-foreground focus:ring-0 focus:outline-none placeholder:text-muted-foreground/30"
                       value={activeDraft.content}
                       readOnly 
                       placeholder="Message content..."
                    />
                 </div>
              </motion.div>
           ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                 <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-3xl text-muted-foreground">edit_document</span>
                 </div>
                 <h3 className="text-lg font-semibold text-foreground mb-1">No Draft Selected</h3>
                 <p className="text-sm text-muted-foreground max-w-sm">Select a step from the sequence timeline to view and edit the outreach message.</p>
              </div>
           )}
        </section>

        {/* Right Pane: Intelligence Context */}
        <AnimatePresence>
           {showInspector && (
              <motion.aside 
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: "spring" as any, bounce: 0, duration: 0.4 }}
                className="border-l border-border bg-[#0d0d0d] flex flex-col shrink-0 z-10 overflow-hidden"
              >
                 <div className="p-4 border-b border-border/50 flex items-center justify-between w-[320px]">
                    <div className="flex items-center gap-2 text-primary">
                       <span className="material-symbols-outlined text-[18px]">hub</span>
                       <span className="text-xs font-bold uppercase tracking-widest">Intelligence</span>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground" onClick={() => setShowInspector(false)}>
                       <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-4 space-y-6 w-[320px]">
                    
                    {/* Target Profile */}
                    {activeDraft && (
                       <div>
                          <h3 className="text-[10px] tracking-widest font-semibold uppercase text-muted-foreground mb-3">Target Profile</h3>
                          <div className="bg-card border border-border rounded-lg p-3 flex items-start gap-3">
                             <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                                {activeDraft.target_persona?.split('')[0] || "T"}
                             </div>
                             <div>
                                <p className="text-sm font-semibold text-foreground">{activeDraft.target_persona?.split('(')[0] || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">{activeDraft.target_persona?.includes('(') ? activeDraft.target_persona.split('(')[1].replace(')', '') : 'Decision Maker'}</p>
                             </div>
                          </div>
                       </div>
                    )}

                    {/* Citations / Context */}
                    <div>
                       <h3 className="text-[10px] tracking-widest font-semibold uppercase text-muted-foreground mb-3">Source Data Grounding</h3>
                       
                       {activeDraft?.citations && activeDraft.citations.length > 0 ? (
                          <div className="space-y-3">
                             {activeDraft.citations.map((cite: any, i: number) => (
                                <div key={i} className="bg-card/50 border border-border rounded-lg overflow-hidden">
                                   <div className="bg-card border-b border-border px-3 py-1.5 flex items-center justify-between">
                                      <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                                         <span className="material-symbols-outlined text-[12px]">description</span> {cite.source || 'Document'}
                                      </span>
                                   </div>
                                   <div className="p-3">
                                      <p className="font-mono text-xs text-foreground/80 leading-relaxed">
                                         "{cite.text || cite.quote}"
                                      </p>
                                   </div>
                                </div>
                             ))}
                          </div>
                       ) : (
                          <div className="bg-card border border-border border-dashed rounded-lg p-4 text-center">
                             <span className="material-symbols-outlined text-muted-foreground/50 text-2xl mb-2">find_in_page</span>
                             <p className="text-xs text-muted-foreground">No explicit citations linked to this draft step in the database.</p>
                          </div>
                       )}
                    </div>

                    {/* Critic Guardrail */}
                    <div>
                       <h3 className="text-[10px] tracking-widest font-semibold uppercase text-muted-foreground mb-3">AI Critic Guardrail</h3>
                       {activeDraft?.critic_feedback ? (
                          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-start gap-3">
                             <span className="material-symbols-outlined text-emerald-500 shrink-0">verified_user</span>
                             <div>
                                <p className="text-xs font-semibold text-emerald-500 mb-1">Approved & Grounded</p>
                                <p className="text-xs text-emerald-500/80">{activeDraft.critic_feedback}</p>
                             </div>
                          </div>
                       ) : (
                          <div className="bg-muted border border-border rounded-lg p-3 flex items-start gap-3">
                             <span className="material-symbols-outlined text-muted-foreground shrink-0">fact_check</span>
                             <div>
                                <p className="text-xs font-semibold text-foreground mb-1">Auto-Validation</p>
                                <p className="text-xs text-muted-foreground">No specific critic warnings found in database for this draft. Content appears safe.</p>
                             </div>
                          </div>
                       )}
                    </div>
                 </div>
              </motion.aside>
           )}
        </AnimatePresence>
      </div>
    </div>
  );
}
