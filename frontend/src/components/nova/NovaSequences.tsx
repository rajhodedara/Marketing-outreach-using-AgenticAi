"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
      } else {
        setSequences(mockSequences);
      }
    } catch (err) {
      console.error(err);
      setSequences(mockSequences);
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
      if (res.ok || !res.ok) { // Mock for MVP
        const created: Sequence = {
          id: Math.random().toString(36).substring(7),
          name: bName,
          persona: bPersona,
          status: "Draft",
          steps: bSteps
        };
        setSequences([created, ...sequences]);
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
      if (res.ok || !res.ok) { // Mock for MVP
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
      case "email": return "mail";
      case "linkedin": return "work";
      case "phone": return "call";
      case "slack": return "tag";
      default: return "send";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <span className="material-symbols-outlined animate-spin text-emerald-500 text-4xl">sync</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Outreach Sequences</h2>
          <p className="text-sm text-zinc-400">Automated multi-channel campaigns for {accountName}</p>
        </div>
        {!showBuilder && (
          <Button onClick={handleOpenBuilder} className="bg-emerald-600 hover:bg-emerald-500 text-white">
            <span className="material-symbols-outlined text-[18px] mr-2">add</span>
            New Sequence
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {showBuilder ? (
          <motion.div
            key="builder"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 liquid-glass"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-500">route</span>
                Sequence Builder
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowBuilder(false)} className="text-zinc-400">
                <span className="material-symbols-outlined">close</span>
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1 block">Sequence Name</label>
                <Input value={bName} onChange={(e) => setBName(e.target.value)} className="bg-zinc-950 border-zinc-800" />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1 block">Target Persona</label>
                <Input value={bPersona} onChange={(e) => setBPersona(e.target.value)} placeholder="e.g. CTO" className="bg-zinc-950 border-zinc-800" />
              </div>
            </div>

            <div className="space-y-4 mb-8 relative pl-4">
              <div className="absolute left-[27px] top-4 bottom-4 w-px bg-zinc-800" />
              {bSteps.map((step, idx) => (
                <div key={idx} className="flex gap-4 relative z-10 items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-950 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 mt-1">
                    D{step.day}
                  </div>
                  <Card className="flex-1 bg-zinc-950/50 border-zinc-800">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex gap-3 items-center">
                        <Input 
                          type="number" 
                          value={step.day} 
                          onChange={(e) => handleUpdateStep(idx, "day", parseInt(e.target.value))}
                          className="w-20 bg-zinc-900 h-8 text-sm"
                          min={0}
                        />
                        <select 
                          value={step.channel}
                          onChange={(e) => handleUpdateStep(idx, "channel", e.target.value)}
                          className="bg-zinc-900 border border-zinc-800 text-sm text-zinc-300 rounded-md px-3 h-8"
                        >
                          <option value="email">Email</option>
                          <option value="linkedin">LinkedIn</option>
                          <option value="phone">Phone</option>
                          <option value="slack">Slack</option>
                        </select>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveStep(idx)} className="ml-auto text-red-400 hover:bg-red-950/30 h-8 px-2">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </Button>
                      </div>
                      {step.channel === "email" && (
                        <Input 
                          placeholder="Subject" 
                          value={step.subject || ""} 
                          onChange={(e) => handleUpdateStep(idx, "subject", e.target.value)}
                          className="bg-zinc-900 h-8 text-sm"
                        />
                      )}
                      <textarea
                        value={step.content}
                        onChange={(e) => handleUpdateStep(idx, "content", e.target.value)}
                        placeholder="Message content..."
                        rows={3}
                        className="w-full rounded-md bg-zinc-900 border border-zinc-800 p-2 text-sm text-zinc-300 resize-none focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </CardContent>
                  </Card>
                </div>
              ))}
              <div className="pl-12 pt-2">
                <Button variant="outline" size="sm" onClick={handleAddStep} className="border-dashed border-zinc-700 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/50">
                  <span className="material-symbols-outlined text-[18px] mr-1">add</span> Add Step
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <Button variant="ghost" onClick={() => setShowBuilder(false)} className="text-zinc-400">Cancel</Button>
              <Button onClick={handleCreateSequence} disabled={isSubmitting || bSteps.length === 0} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                {isSubmitting ? <span className="material-symbols-outlined animate-spin text-[18px] mr-2">sync</span> : null}
                Create Sequence
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            {sequences.length === 0 ? (
              <div className="text-center py-12 bg-zinc-900/50 rounded-xl border border-zinc-800 border-dashed">
                <span className="material-symbols-outlined text-zinc-600 text-4xl mb-2">route</span>
                <p className="text-zinc-400">No sequences found for this account.</p>
              </div>
            ) : (
              sequences.map(seq => (
                <Card key={seq.id} className="bg-zinc-900/40 border-zinc-800 overflow-hidden">
                  <div className="p-4 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/60">
                    <div>
                      <h4 className="font-semibold text-white">{seq.name}</h4>
                      <p className="text-xs text-zinc-500 flex items-center gap-2 mt-1">
                        <span className="material-symbols-outlined text-[14px]">person</span> {seq.persona || "Any Persona"}
                        <span className="w-1 h-1 rounded-full bg-zinc-700" />
                        {seq.steps.length} steps
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={`px-2 py-0.5 ${getStatusColor(seq.status)}`}>
                        {seq.status === "Active" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5 inline-block" />}
                        {seq.status}
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className={`h-8 border-zinc-700 ${seq.status === 'Active' ? 'text-amber-400 hover:text-amber-300' : 'text-emerald-400 hover:text-emerald-300'}`}
                        onClick={() => handleActivate(seq.id, seq.status)}
                      >
                        {seq.status === "Active" ? "Pause" : "Activate"}
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 overflow-x-auto">
                    <div className="flex gap-4 min-w-max">
                      {seq.steps.map((step, idx) => (
                        <div key={idx} className="w-64 bg-zinc-950 rounded-lg p-3 border border-zinc-800/80 relative">
                          {idx < seq.steps.length - 1 && (
                            <div className="absolute right-[-16px] top-1/2 w-4 h-px bg-zinc-700" />
                          )}
                          <div className="flex justify-between items-center mb-2">
                            <Badge variant="outline" className="bg-zinc-900 text-zinc-300 text-[10px] border-zinc-700">Day {step.day}</Badge>
                            <span className="material-symbols-outlined text-[16px] text-zinc-500">{getChannelIcon(step.channel)}</span>
                          </div>
                          <div className="text-xs text-zinc-400 line-clamp-2">
                            {step.subject && <strong className="block text-zinc-300 mb-0.5 truncate">{step.subject}</strong>}
                            {step.content}
                          </div>
                          <div className="mt-3 text-[10px] text-zinc-500 font-medium">
                            {step.status || "Pending"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const mockSequences: Sequence[] = [
  {
    id: "seq_1",
    name: "Enterprise Q3 Outreach",
    persona: "VP of Engineering",
    status: "Active",
    steps: [
      { day: 0, channel: "email", subject: "Scaling your team", content: "I saw your recent post about scaling the engineering team...", status: "Sent" },
      { day: 3, channel: "linkedin", content: "Hi, following up on my email regarding your team expansion.", status: "Pending" },
      { day: 7, channel: "email", subject: "Thoughts?", content: "Just bubbling this up.", status: "Pending" }
    ]
  },
  {
    id: "seq_2",
    name: "Cold Warmup",
    persona: "CTO",
    status: "Completed",
    steps: [
      { day: 0, channel: "linkedin", content: "Great talking to you at the event.", status: "Sent" },
      { day: 2, channel: "email", subject: "Resources from the event", content: "Here are the slides...", status: "Sent" }
    ]
  }
];
