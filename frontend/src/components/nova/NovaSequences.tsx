"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowsClockwise, Plus, X, GitMerge, EnvelopeSimple, LinkedinLogo, Phone, Hash, User, Trash, Target } from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface NovaSequencesProps {
  accountId: string;
  accountName: string;
}

interface Step {
  day: number;
  channel: "email" | "linkedin" | "phone" | "slack";
  subject?: string;
  content: string;
  status?: "Scheduled" | "Sent" | "Opened" | "Replied" | "Pending";
}

interface Sequence {
  id: string;
  name: string;
  persona: string;
  status: "Draft" | "Active" | "Paused" | "Completed";
  steps: Step[];
}

export function NovaSequences({ accountId, accountName }: NovaSequencesProps) {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  
  // Builder State
  const [bName, setBName] = useState("");
  const [bPersona, setBPersona] = useState("");
  const [bSteps, setBSteps] = useState<Step[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSequences();
  }, [accountId]);

  const fetchSequences = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/nova/sequences?account_id=${accountId}`);
      if (res.ok) {
        const data = await res.json();
        setSequences(data.sequences || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBuilder = () => {
    setBName(`Outreach for ${accountName}`);
    setBPersona("");
    setBSteps([
      { day: 0, channel: "email", subject: "Connecting", content: "Hi there, I wanted to reach out...", status: "Pending" },
      { day: 3, channel: "linkedin", content: "Following up on my email...", status: "Pending" },
      { day: 7, channel: "email", subject: "Any thoughts?", content: "Just floating this to the top...", status: "Pending" }
    ]);
    setShowBuilder(true);
  };

  const handleAddStep = () => {
    const maxDay = bSteps.length > 0 ? Math.max(...bSteps.map(s => s.day)) : 0;
    setBSteps([...bSteps, { day: maxDay + 2, channel: "email", content: "", status: "Pending" }]);
  };

  const handleUpdateStep = (index: number, field: keyof Step, value: any) => {
    const newSteps = [...bSteps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setBSteps(newSteps);
  };

  const handleRemoveStep = (index: number) => {
    setBSteps(bSteps.filter((_, i) => i !== index));
  };

  const handleCreateSequence = async () => {
    setIsSubmitting(true);
    try {
      const newSeq = {
        name: bName,
        persona: bPersona,
        steps: bSteps,
        account_id: accountId
      };
      const res = await fetch("/api/nova/sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSeq),
      });
      if (res.ok) {
        const createdData = await res.json();
        setSequences([createdData.sequence || createdData, ...sequences]);
        setShowBuilder(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivate = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Active" ? "Paused" : "Active";
    try {
      const res = await fetch(`/api/nova/sequences/${id}/activate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setSequences(prev => prev.map(s => s.id === id ? { ...s, status: newStatus as any } : s));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "Paused": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "Completed": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      default: return "bg-zinc-800 text-zinc-400 border-zinc-700";
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email": return <EnvelopeSimple weight="duotone" size={16} />;
      case "linkedin": return <LinkedinLogo weight="duotone" size={16} />;
      case "phone": return <Phone weight="duotone" size={16} />;
      case "slack": return <Hash weight="duotone" size={16} />;
      default: return <EnvelopeSimple weight="duotone" size={16} />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <ArrowsClockwise className="animate-spin text-emerald-500" size={32} weight="duotone" />
      </div>
    );
  }

  return (
    <div className="space-y-8 relative pb-16">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tighter">Outreach Sequences</h2>
          <p className="text-white/40 mt-1 tracking-wide font-medium">Automated multi-channel campaigns for <span className="text-white/60">{accountName}</span></p>
        </div>
        {!showBuilder && (
          <button 
            onClick={handleOpenBuilder} 
            className="group bg-white text-black hover:bg-zinc-200 rounded-full pl-6 pr-2 py-2 flex items-center gap-4 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] font-medium text-sm shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            New Sequence
            <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center transition-transform duration-500 group-hover:scale-105 group-hover:rotate-90">
              <Plus weight="bold" size={14} />
            </div>
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {showBuilder ? (
          <motion.div
            key="builder"
            initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
            className="bg-white/5 border border-white/10 p-1.5 rounded-[2rem] shadow-2xl relative"
          >
            <div className="bg-[#0a0a0a] rounded-[calc(2rem-0.375rem)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-hidden p-8">
              <div className="flex justify-between items-center mb-8 pb-6 border-b border-white/5">
                <h3 className="text-lg font-medium text-white flex items-center gap-3 tracking-tight">
                  <div className="w-10 h-10 rounded-[1rem] bg-white/5 flex items-center justify-center border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                    <GitMerge weight="duotone" className="text-emerald-400" size={20} />
                  </div>
                  Sequence Builder
                </h3>
                <button onClick={() => setShowBuilder(false)} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center active:scale-95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                  <X weight="bold" size={16} />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-8 mb-12">
                <div>
                  <label className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.2em] mb-3 block ml-1">Sequence Name</label>
                  <Input value={bName} onChange={(e) => setBName(e.target.value)} className="bg-[#050505] border-white/10 h-12 rounded-xl text-white focus-visible:ring-emerald-500/50" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.2em] mb-3 block ml-1">Target Persona</label>
                  <Input value={bPersona} onChange={(e) => setBPersona(e.target.value)} placeholder="e.g. CTO" className="bg-[#050505] border-white/10 h-12 rounded-xl text-white placeholder:text-white/20 focus-visible:ring-emerald-500/50" />
                </div>
              </div>

              <div className="space-y-6 mb-12 relative pl-6">
                <div className="absolute left-[39px] top-6 bottom-8 w-[2px] bg-white/5" />
                <AnimatePresence>
                  {bSteps.map((step, idx) => (
                    <motion.div 
                      key={idx} 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.4 }}
                      className="flex gap-6 relative z-10 items-start group"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#050505] border-2 border-white/10 flex items-center justify-center text-[11px] font-bold text-white/60 mt-2 shadow-[0_0_15px_rgba(0,0,0,0.5)] group-hover:border-emerald-500/50 group-hover:text-emerald-400 transition-colors">
                        D{step.day}
                      </div>
                      <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-6 transition-colors group-hover:border-white/20 shadow-sm relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10 space-y-4">
                          <div className="flex gap-4 items-center">
                            <Input 
                              type="number" 
                              value={step.day} 
                              onChange={(e) => handleUpdateStep(idx, "day", parseInt(e.target.value))}
                              className="w-24 bg-[#050505] border-white/10 h-10 text-sm text-center text-white focus-visible:ring-emerald-500/50 rounded-xl"
                              min={0}
                            />
                            <select 
                              value={step.channel}
                              onChange={(e) => handleUpdateStep(idx, "channel", e.target.value)}
                              className="bg-[#050505] border border-white/10 text-xs font-semibold uppercase tracking-widest text-white/80 rounded-xl px-4 h-10 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 cursor-pointer appearance-none hover:bg-white/5 transition-colors"
                            >
                              <option value="email" className="bg-black">Email</option>
                              <option value="linkedin" className="bg-black">LinkedIn</option>
                              <option value="phone" className="bg-black">Phone</option>
                              <option value="slack" className="bg-black">Slack</option>
                            </select>
                            <button onClick={() => handleRemoveStep(idx)} className="ml-auto w-10 h-10 rounded-xl border border-transparent text-white/20 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all flex items-center justify-center">
                              <Trash weight="duotone" size={16} />
                            </button>
                          </div>
                          <AnimatePresence>
                            {step.channel === "email" && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                                <Input 
                                  placeholder="Subject" 
                                  value={step.subject || ""} 
                                  onChange={(e) => handleUpdateStep(idx, "subject", e.target.value)}
                                  className="bg-[#050505] border-white/10 h-10 text-sm text-white focus-visible:ring-emerald-500/50 rounded-xl placeholder:text-white/20"
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <textarea
                            value={step.content}
                            onChange={(e) => handleUpdateStep(idx, "content", e.target.value)}
                            placeholder="Message content..."
                            rows={3}
                            className="w-full rounded-xl bg-[#050505] border border-white/10 p-4 text-sm text-white/80 resize-none focus:ring-1 focus:ring-emerald-500/50 focus:outline-none placeholder:text-white/20 leading-relaxed"
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div className="pl-[4.5rem] pt-4">
                  <button onClick={handleAddStep} className="h-10 px-6 rounded-xl border border-dashed border-white/20 text-white/40 hover:text-emerald-400 hover:border-emerald-500/50 transition-colors text-xs font-semibold uppercase tracking-widest flex items-center gap-2">
                    <Plus weight="bold" size={14} /> Add Step
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-8 border-t border-white/5">
                <button onClick={() => setShowBuilder(false)} className="h-12 px-8 rounded-full border border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-xs font-semibold uppercase tracking-widest transition-all">Cancel</button>
                <button onClick={handleCreateSequence} disabled={isSubmitting || bSteps.length === 0} className="h-12 px-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] min-w-[180px]">
                  {isSubmitting ? <ArrowsClockwise weight="duotone" className="animate-spin" size={16} /> : 'Create Sequence'}
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }} className="space-y-8">
            {sequences.length === 0 ? (
              <div className="text-center py-20 bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                <GitMerge weight="light" size={48} className="text-white/20 mx-auto mb-4" />
                <p className="text-white/40 font-medium tracking-wide">No sequences found for this account.</p>
              </div>
            ) : (
              sequences.map(seq => (
                <div key={seq.id} className="bg-white/5 border border-white/10 p-1.5 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                  <div className="bg-[#0a0a0a] rounded-[calc(2rem-0.375rem)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-hidden relative z-10">
                    <div className="p-8 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white/[0.02]">
                      <div>
                        <h4 className="text-lg font-medium text-white tracking-tight">{seq.name}</h4>
                        <div className="text-[10px] uppercase tracking-widest text-white/40 flex items-center gap-3 mt-2 font-semibold">
                          <span className="flex items-center gap-1.5"><User weight="duotone" size={14} /> {seq.persona || "Any Persona"}</span>
                          <span className="w-1 h-1 rounded-full bg-white/20" />
                          <span>{seq.steps.length} steps</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-[#050505] border border-white/10 px-3 py-1.5 rounded-full shadow-inner">
                          {seq.status === "Active" ? (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-white/20" />
                          )}
                          <span className={`text-[10px] uppercase tracking-widest font-bold ${seq.status === 'Active' ? 'text-emerald-400' : 'text-white/40'}`}>
                            {seq.status}
                          </span>
                        </div>
                        <button 
                          className={`h-10 px-6 rounded-full border text-xs font-bold uppercase tracking-widest transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95 ${seq.status === 'Active' ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10' : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}`}
                          onClick={() => handleActivate(seq.id, seq.status)}
                        >
                          {seq.status === "Active" ? "Pause" : "Activate"}
                        </button>
                      </div>
                    </div>
                    <div className="p-8 overflow-x-auto custom-scrollbar">
                      <div className="flex gap-6 min-w-max pb-4">
                        {seq.steps.map((step, idx) => (
                          <div key={idx} className="w-72 bg-white/5 rounded-2xl p-5 border border-white/10 relative transition-transform hover:-translate-y-1 hover:shadow-lg duration-500">
                            {idx < seq.steps.length - 1 && (
                              <div className="absolute right-[-24px] top-1/2 w-6 h-[2px] bg-white/5" />
                            )}
                            <div className="flex justify-between items-center mb-4">
                              <div className="bg-[#050505] border border-white/10 text-white/60 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-inner">Day {step.day}</div>
                              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-white/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                                {getChannelIcon(step.channel)}
                              </div>
                            </div>
                            <div className="text-sm text-white/50 line-clamp-3 leading-relaxed">
                              {step.subject && <strong className="block text-white mb-1 truncate font-medium">{step.subject}</strong>}
                              {step.content}
                            </div>
                            <div className="mt-4 text-[10px] text-white/30 font-semibold uppercase tracking-widest">
                              {step.status || "Pending"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
