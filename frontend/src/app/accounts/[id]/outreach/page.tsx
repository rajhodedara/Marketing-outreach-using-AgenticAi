"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';

const space = Space_Grotesk({ subsets: ['latin'], weight: ['400', '600', '700'] });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '700'] });

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
    const toastId = toast.loading("EXEC RE-GEN...", { description: "Initializing neural rewrite sequence." });
    try {
      const res = await fetch(`/api/accounts/${accountId}/drafts/${activeStep - 1}/regenerate`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Failed to regenerate");
      const data = await res.json();
      
      const newDrafts = [...drafts];
      newDrafts[activeStep - 1] = data.draft;
      setDrafts(newDrafts);
      
      toast.success("RE-GEN SUCCESSFUL", { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error("RE-GEN FAILED", { id: toastId });
    }
  };

  const handleSendEmail = async () => {
    if (!accountId || !activeDraft) return;
    const toastId = toast.loading("DISPATCHING...", { description: "Uplinking to SMTP relay." });
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
      toast.success("DISPATCH CONFIRMED", { id: toastId });
    } catch (e: any) {
      console.error(e);
      toast.error(`DISPATCH FAILED: ${e.message}`, { id: toastId });
    }
  };

  const getChannelColor = (channel: string) => {
    const ch = (channel || "").toLowerCase();
    if (ch.includes("email")) return "text-cyan-400 bg-cyan-400/10 border-cyan-400/30";
    if (ch.includes("linkedin")) return "text-blue-400 bg-blue-400/10 border-blue-400/30";
    if (ch.includes("call") || ch.includes("phone")) return "text-amber-400 bg-amber-400/10 border-amber-400/30";
    return "text-zinc-400 bg-zinc-800 border-zinc-700";
  };

  const getChannelIcon = (channel: string) => {
    const ch = (channel || "").toLowerCase();
    if (ch.includes("email")) return "mail";
    if (ch.includes("linkedin")) return "forum";
    if (ch.includes("call") || ch.includes("phone")) return "call";
    return "campaign";
  };

  const renderContentWithCitations = (content: string) => {
    if (!content) return null;
    const parts = content.split(/(\[\d+\])/g);
    return parts.map((part, i) => {
      const match = part.match(/\[(\d+)\]/);
      if (match) {
        const id = match[1];
        return (
          <span key={i} className="inline-flex items-center justify-center px-1 mx-1 text-[11px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 cursor-pointer hover:bg-cyan-500/40 transition-colors">
            {id}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className={`${mono.className} flex-1 flex flex-col bg-[#050505] h-[calc(100vh-4rem)] overflow-hidden text-zinc-300 selection:bg-cyan-500/30`}>
      
      {/* Top Command Bar */}
      <div className="h-14 shrink-0 bg-[#0a0a0a] border-b border-zinc-800 px-4 flex items-center justify-between z-20">
         <div className="flex items-center gap-4">
            <Link href={`/accounts/${accountId}`} className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-800 transition-colors">
               <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            </Link>
            <div className="flex items-center gap-3">
               <h1 className={`${space.className} text-sm font-bold uppercase tracking-[0.2em] text-zinc-100`}>
                 CMD_OUTREACH
               </h1>
               <div className="h-4 w-px bg-zinc-800"></div>
               <span className="text-[10px] uppercase text-zinc-500">
                 TARGET // {account?.company_name || 'AWAITING_DATA'}
               </span>
               <span className="px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                 ACTIVE_SYS
               </span>
            </div>
         </div>
         
         <div className="flex items-center gap-4">
            <div className="flex flex-col items-end gap-1">
               <span className="text-[10px] uppercase text-zinc-500 tracking-wider">PROGRESS_ [{activeStep}/{drafts.length}]</span>
               <div className="w-24 h-1 bg-zinc-900 overflow-hidden border border-zinc-800">
                  <motion.div 
                     className="h-full bg-cyan-500" 
                     initial={{ width: 0 }} 
                     animate={{ width: `${(activeStep / Math.max(drafts.length, 1)) * 100}%` }}
                     transition={{ duration: 0.5, ease: "easeOut" }}
                  />
               </div>
            </div>
            
            <button 
              onClick={() => setShowInspector(!showInspector)}
              className={`flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold transition-colors border ${showInspector ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-[#0a0a0a] text-zinc-400 border-zinc-800 hover:text-zinc-200'}`}
            >
              <span className="material-symbols-outlined text-[14px]">memory</span>
              CONTEXT_V
            </button>
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Pane: Sequence Execution Trace */}
        <aside className="w-72 border-r border-zinc-800 bg-[#0a0a0a] flex flex-col shrink-0 z-10 relative">
          <div className="p-3 border-b border-zinc-800 bg-zinc-900/50">
            <h2 className="text-[10px] tracking-widest font-bold uppercase text-zinc-500">EXECUTION_PIPELINE</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
               <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                  <span className="material-symbols-outlined text-2xl animate-pulse mb-2">hourglass_empty</span>
                  <span className="text-[10px] uppercase tracking-widest">AWAITING_SYS...</span>
               </div>
            ) : drafts.length > 0 ? (
               <div className="relative pt-2 space-y-4">
                  {/* Vertical rule */}
                  <div className="absolute left-[15px] top-0 bottom-0 w-px bg-zinc-800/80"></div>
                  
                  {drafts.map((draft, idx) => {
                     const isActive = activeStep === idx + 1;
                     const channel = draft.channel || "UNKNOWN";
                     return (
                        <div key={idx} className="relative pl-10 group cursor-pointer" onClick={() => setActiveStep(idx + 1)}>
                           {/* Node Indicator */}
                           <div className={`absolute left-0 top-2 w-8 h-[1px] ${isActive ? 'bg-cyan-500' : 'bg-zinc-800 group-hover:bg-zinc-600'}`}></div>
                           <div className={`absolute left-[13px] top-[5px] w-1.5 h-1.5 rotate-45 transition-colors ${isActive ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]' : 'bg-zinc-700'}`}></div>
                           
                           <motion.div 
                              className={`p-3 border transition-colors ${isActive ? 'bg-cyan-950/10 border-cyan-500/30' : 'bg-[#050505] border-zinc-800/80 group-hover:border-zinc-700'}`}
                           >
                              <div className="flex items-center justify-between mb-2">
                                 <span className={`text-[10px] font-bold tracking-widest uppercase ${isActive ? 'text-cyan-400' : 'text-zinc-500'}`}>
                                    SEQ_0{idx + 1}
                                 </span>
                                 <span className={`flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest border ${getChannelColor(channel)}`}>
                                    {channel}
                                 </span>
                              </div>
                                 <div className={`text-xs mb-1 truncate ${isActive ? 'text-zinc-200' : 'text-zinc-500'}`}>
                                 {'>'} {draft.target_persona?.split('(')[0].trim() || 'UNKNOWN_TARGET'}
                              </div>
                           </motion.div>
                        </div>
                     );
                  })}
               </div>
            ) : (
               <div className="flex flex-col items-center justify-center h-full text-center">
                  <span className="material-symbols-outlined text-2xl text-zinc-700 mb-2">warning</span>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600">NO_DATA_FOUND</p>
               </div>
            )}
          </div>
        </aside>

        {/* Center Pane: Composer Terminal */}
        <section className="flex-1 flex flex-col bg-[#050505] relative min-w-0">
           {activeDraft ? (
              <motion.div 
                key={activeStep}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col p-6 max-w-4xl mx-auto w-full h-full"
              >
                 {/* Composer Header */}
                 <div className="flex items-end justify-between mb-4 border-b border-zinc-800 pb-4">
                    <div>
                       <h2 className={`${space.className} text-xl font-bold uppercase tracking-wider text-zinc-100 mb-1`}>
                         COMPOSER_TERMINAL
                       </h2>
                       <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                         {'>'} EDIT AND APPROVE TRANSMISSION
                       </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                       <button 
                         onClick={regenerateDraft}
                         disabled={loading}
                         className="flex items-center gap-2 px-3 py-1.5 bg-[#0a0a0a] border border-zinc-700 hover:border-zinc-500 text-[10px] uppercase font-bold tracking-widest text-zinc-300 transition-colors disabled:opacity-50"
                       >
                          <span className="material-symbols-outlined text-[14px]">autorenew</span>
                          RE-GEN_AI
                       </button>
                       <button 
                         onClick={handleSendEmail}
                         disabled={loading}
                         className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500 text-black border border-cyan-400 hover:bg-cyan-400 text-[10px] uppercase font-bold tracking-widest transition-colors disabled:opacity-50"
                       >
                          <span className="material-symbols-outlined text-[14px]">publish</span>
                          EXEC_SEND
                       </button>
                    </div>
                 </div>
                 
                 {/* Email Envelop Headers */}
                 <div className="bg-[#0a0a0a] border border-zinc-800 mb-4 p-3">
                    <div className="flex items-center gap-4 mb-2">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 w-12">TO:</label>
                       <input 
                         className="flex-1 bg-transparent border-none text-xs text-zinc-200 focus:ring-0 focus:outline-none placeholder:text-zinc-700 font-mono"
                         value={toEmail}
                         onChange={(e) => setToEmail(e.target.value)}
                         placeholder="target@system.com"
                       />
                    </div>
                    <div className="h-px bg-zinc-800 w-full mb-2"></div>
                    <div className="flex items-center gap-4">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 w-12">SUBJ:</label>
                       <input 
                         className="flex-1 bg-transparent border-none text-xs font-medium text-cyan-400 focus:ring-0 focus:outline-none placeholder:text-zinc-700 font-mono"
                         value={subject}
                         onChange={(e) => setSubject(e.target.value)}
                         placeholder="INPUT_SUBJECT..."
                       />
                    </div>
                 </div>
                 
                 {/* Body Editor Container */}
                 <div className="flex-1 bg-[#0a0a0a] border border-zinc-800 overflow-y-auto flex flex-col">
                    {/* The fix for the overlap: removing flex-1 from the inner text container so it sizes naturally, and padding bottom to give breathing room for citations */}
                    <div className="w-full text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap p-5">
                       {renderContentWithCitations(activeDraft.content)}
                    </div>
                    
                    {/* Citations Footer */}
                    {activeDraft.citations && activeDraft.citations.length > 0 && (
                      <div className="mt-auto border-t border-zinc-800 bg-[#050505] p-5">
                        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4 flex items-center gap-2">
                           <span className="w-2 h-2 bg-zinc-700 rotate-45"></span>
                           CITATIONS_LOG
                        </h4>
                        <div className="space-y-3">
                          {activeDraft.citations.map((cite: any, i: number) => (
                            <div key={i} className="flex gap-3 text-xs border-l-2 border-zinc-700 pl-3">
                               <div className="flex flex-col gap-1">
                                 <div className="flex items-center gap-2">
                                   <span className="font-bold text-cyan-400 bg-cyan-950/30 px-1 border border-cyan-500/20">[{cite.id}]</span>
                                   <span className="font-bold text-zinc-300">{cite.source_name}</span>
                                   <span className="text-zinc-600">/</span>
                                   <span className="text-zinc-500 uppercase text-[10px] tracking-widest">{cite.context}</span>
                                 </div>
                                 <p className="text-zinc-400/80 font-mono text-[11px] leading-relaxed bg-[#0a0a0a] p-2 border border-zinc-800/50">
                                   {'>'} "{cite.snippet}"
                                 </p>
                               </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                 </div>
              </motion.div>
           ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                 <div className="w-12 h-12 border border-zinc-700 bg-zinc-900 flex items-center justify-center mb-4 rotate-45">
                    <span className="material-symbols-outlined text-xl text-zinc-600 -rotate-45">terminal</span>
                 </div>
                 <h3 className={`${space.className} text-sm tracking-widest font-bold uppercase text-zinc-400 mb-1`}>SYSTEM_IDLE</h3>
                 <p className="text-[10px] uppercase tracking-widest text-zinc-600 max-w-sm">AWAITING SEQUENCE SELECTION FROM LEFT PANE TO INITIALIZE COMPOSER.</p>
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
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="border-l border-zinc-800 bg-[#0a0a0a] flex flex-col shrink-0 z-10 overflow-hidden"
              >
                 <div className="p-3 border-b border-zinc-800 flex items-center justify-between w-[320px] bg-zinc-900/50">
                    <div className="flex items-center gap-2 text-cyan-400">
                       <span className="material-symbols-outlined text-[16px]">data_object</span>
                       <span className="text-[10px] font-bold uppercase tracking-[0.2em]">INTEL_MODULE</span>
                    </div>
                    <button className="text-zinc-500 hover:text-zinc-200 transition-colors" onClick={() => setShowInspector(false)}>
                       <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-4 space-y-6 w-[320px]">
                    
                    {/* Target Profile */}
                    {activeDraft && (
                       <div>
                          <h3 className="text-[9px] tracking-[0.2em] font-bold uppercase text-zinc-500 mb-2">TARGET_PROFILE</h3>
                          <div className="bg-[#050505] border border-zinc-800 p-3 flex items-start gap-3">
                             <div className="w-8 h-8 bg-zinc-900 text-zinc-400 flex items-center justify-center font-bold text-xs shrink-0 border border-zinc-700">
                                {activeDraft.target_persona?.split('')[0] || "X"}
                             </div>
                             <div>
                                <p className="text-xs font-bold text-zinc-200">{activeDraft.target_persona?.split('(')[0] || 'UNKNOWN'}</p>
                                <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">{activeDraft.target_persona?.includes('(') ? activeDraft.target_persona.split('(')[1].replace(')', '') : 'DECISION_MAKER'}</p>
                             </div>
                          </div>
                       </div>
                    )}

                    {/* Source Data Grounding */}
                    <div>
                       <h3 className="text-[9px] tracking-[0.2em] font-bold uppercase text-zinc-500 mb-2">DATA_GROUNDING</h3>
                       
                       {activeDraft?.citations && activeDraft.citations.length > 0 ? (
                          <div className="space-y-2">
                             {activeDraft.citations.map((cite: any, i: number) => (
                                <div key={i} className="bg-[#050505] border border-zinc-800">
                                   <div className="bg-zinc-900/50 border-b border-zinc-800 px-2 py-1 flex items-center">
                                      <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-400 flex items-center gap-2">
                                         <span className="w-1.5 h-1.5 bg-zinc-600"></span>
                                         {cite.source_name || 'DOC'}
                                      </span>
                                   </div>
                                   <div className="p-2">
                                      <p className="font-mono text-[10px] text-zinc-500 leading-relaxed">
                                         {'>'} "{cite.snippet || cite.context}"
                                      </p>
                                   </div>
                                </div>
                             ))}
                          </div>
                       ) : (
                          <div className="bg-[#050505] border border-zinc-800 border-dashed p-4 text-center">
                             <span className="material-symbols-outlined text-zinc-700 text-xl mb-1">warning</span>
                             <p className="text-[10px] uppercase tracking-widest text-zinc-600">NO_EXPLICIT_CITATIONS</p>
                          </div>
                       )}
                    </div>

                    {/* Critic Guardrail */}
                    <div>
                       <h3 className="text-[9px] tracking-[0.2em] font-bold uppercase text-zinc-500 mb-2">SAFETY_GUARDRAIL</h3>
                       {activeDraft?.critic_feedback ? (
                          <div className="bg-emerald-950/20 border border-emerald-900/50 p-3 flex items-start gap-3">
                             <span className="material-symbols-outlined text-emerald-500 text-[16px] shrink-0">verified_user</span>
                             <div>
                                <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-400 mb-1">APPROVED</p>
                                <p className="text-[10px] text-emerald-500/80 leading-relaxed">{activeDraft.critic_feedback}</p>
                             </div>
                          </div>
                       ) : (
                          <div className="bg-[#050505] border border-zinc-800 p-3 flex items-start gap-3">
                             <span className="material-symbols-outlined text-zinc-600 text-[16px] shrink-0">fact_check</span>
                             <div>
                                <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-1">AUTO_VALIDATION</p>
                                <p className="text-[10px] text-zinc-600 leading-relaxed">NO WARNINGS FLAG. SYS_SAFE.</p>
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

