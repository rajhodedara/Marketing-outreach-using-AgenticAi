"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EnvelopeSimple, LinkedinLogo, Hash, Sparkle, Copy, PaperPlaneRight, Info, Eye } from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { toast } from "sonner";

interface LunaComposerProps {
  accountId: string;
  accountName: string;
}

type Channel = "email" | "linkedin" | "slack";
type Tone = "Professional" | "Friendly" | "Executive" | "Technical";

export function LunaComposer({ accountId, accountName }: LunaComposerProps) {
  const [channel, setChannel] = useState<Channel>("email");
  const [tone, setTone] = useState<Tone>("Professional");
  const [persona, setPersona] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [citations, setCitations] = useState<string[]>([]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/nova/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: accountId, channel, tone, target_persona: persona }),
      });
      if (res.ok) {
        const data = await res.json();
        setSubject(data.subject || "");
        setBody(data.content || "");
        setCitations(data.citations?.map((c: any) => c.quote || c.topic || "Source") || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = channel === "email" ? `Subject: ${subject}\n\n${body}` : body;
    navigator.clipboard.writeText(textToCopy);
  };

  const handleSendEmail = async () => {
    if (!accountId || !body) return;
    const toastId = toast.loading("DISPATCHING...", { description: "Uplinking to SMTP relay." });
    
    const nameOnly = persona?.split('(')[0].trim() || "recipient";
    const toEmail = nameOnly.toLowerCase().replace(/[^a-z0-9]/g, '.') + "@" + (accountName ? accountName.toLowerCase().replace(/\s/g, "") : "example") + ".com";
    
    try {
      const res = await fetch(`/api/accounts/${accountId}/drafts/0/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_email: toEmail,
          subject: subject || "Update",
          content: body
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

  return (
    <div className="space-y-12 pb-16">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Editor Pane (Double-Bezel) */}
        <div className="flex-1 space-y-4">
          <div className="bg-white/5 border border-white/10 p-1.5 rounded-[2rem] shadow-2xl relative overflow-hidden">
            <div className="bg-[#0a0a0a] rounded-[calc(2rem-0.375rem)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-hidden flex flex-col h-full">
              <div className="p-8 space-y-8 flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 bg-white/5 p-1.5 rounded-full border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]">
                    {(["email", "linkedin", "slack"] as Channel[]).map((c) => (
                      <button
                        key={c}
                        onClick={() => setChannel(c)}
                        className={`px-4 py-2 rounded-full text-[11px] uppercase tracking-widest font-medium transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] flex items-center gap-2 ${
                          channel === c ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <div className="mr-2">
                          {c === "email" ? <EnvelopeSimple size={16} weight="duotone" /> : c === "linkedin" ? <LinkedinLogo size={16} weight="duotone" /> : <Hash size={16} weight="duotone" />}
                        </div>
                        <span>{c}</span>
                      </button>
                    ))}
                  </div>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as Tone)}
                    className="bg-transparent border border-white/10 text-xs tracking-wider uppercase text-white/70 rounded-full px-4 py-2 focus:outline-none focus:ring-1 focus:ring-white/20 appearance-none hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    {["Professional", "Friendly", "Executive", "Technical"].map((t) => (
                      <option key={t} value={t} className="bg-black text-white">{t}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.2em] ml-2 mb-2 block">Target Persona</label>
                    <Input
                      placeholder="e.g. VP of Engineering"
                      className="bg-white/5 border-white/10 focus-visible:ring-white/20 rounded-2xl h-12 px-4 text-white placeholder:text-white/20"
                      value={persona}
                      onChange={(e) => setPersona(e.target.value)}
                    />
                  </div>
                  
                  <AnimatePresence>
                    {channel === "email" && (
                      <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}>
                        <label className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.2em] ml-2 mb-2 block mt-2">Subject</label>
                        <Input
                          placeholder="Enter subject..."
                          className="bg-white/5 border-white/10 focus-visible:ring-white/20 rounded-2xl h-12 px-4 font-medium text-white placeholder:text-white/20"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div>
                    <label className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.2em] ml-2 mb-2 block">Message Body</label>
                    <textarea
                      rows={8}
                      className="w-full rounded-2xl bg-white/5 border border-white/10 p-4 text-sm text-zinc-300 font-mono focus:outline-none focus:ring-1 focus:ring-white/20 resize-none placeholder:text-white/20"
                      placeholder="Write your message here or generate with AI..."
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white/5 border-t border-white/10 flex items-center justify-between">
                <button 
                  onClick={handleGenerate} 
                  disabled={isGenerating}
                  className="group bg-white text-black hover:bg-zinc-200 rounded-full pl-6 pr-2 py-2 flex items-center gap-4 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] font-medium text-sm"
                >
                  {isGenerating ? "Generating..." : "Generate with AI"}
                  <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center transition-transform duration-500 group-hover:scale-105 group-hover:translate-x-1">
                    <div className={isGenerating ? 'animate-spin' : ''}>
                      <Sparkle weight="duotone" size={16} />
                    </div>
                  </div>
                </button>

                <div className="flex gap-2">
                  <button onClick={handleCopy} disabled={!body} className="group rounded-full pl-5 pr-2 py-2 border border-white/10 text-white/70 hover:text-white hover:bg-white/5 flex items-center gap-3 transition-all duration-500 active:scale-[0.98] text-sm">
                    Copy
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center transition-transform duration-500 group-hover:bg-white/10 group-hover:scale-105">
                      <Copy weight="duotone" size={14} />
                    </div>
                  </button>
                  {channel === "email" && (
                    <button onClick={handleSendEmail} disabled={!body} className="group rounded-full pl-5 pr-2 py-2 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-3 transition-all duration-500 active:scale-[0.98] text-sm">
                      Send
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center transition-transform duration-500 group-hover:bg-emerald-500/30 group-hover:scale-105 group-hover:translate-x-1">
                        <PaperPlaneRight weight="duotone" size={14} />
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <AnimatePresence>
            {citations.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }} 
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                className="flex items-center gap-2 flex-wrap px-4 py-2"
              >
                <span className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-medium flex items-center">
                  <Info weight="duotone" size={14} className="mr-1" /> Sources:
                </span>
                {citations.map((cite, idx) => (
                  <Badge key={idx} variant="outline" className="bg-white/5 border-white/10 text-white/60 text-[10px] rounded-full px-3 py-1">
                    {cite}
                  </Badge>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Preview Pane (Double-Bezel) */}
        <div className="flex-1">
          <div className="sticky top-6">
            <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.2em] mb-4 ml-2 flex items-center gap-2">
              <Eye weight="duotone" size={16} />
              Live Preview
            </h3>
            <div className="bg-white/5 border border-white/10 p-1.5 rounded-[2rem] shadow-2xl overflow-hidden">
              <div className="bg-[#050505] rounded-[calc(2rem-0.375rem)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-hidden">
                <div className="bg-white/5 px-6 py-3 border-b border-white/5 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                </div>
                <div className="p-8">
                  {channel === "email" ? (
                    <div className="space-y-6">
                      <div className="border-b border-white/5 pb-4 space-y-2">
                        <div className="flex text-sm">
                          <span className="text-white/40 w-16 text-[11px] uppercase tracking-widest mt-0.5">To:</span>
                          <span className="text-white/80">{persona || "Recipient"} <span className="text-white/40">&lt;contact@{accountName.toLowerCase().replace(/\s/g, "")}.com&gt;</span></span>
                        </div>
                        <div className="flex text-sm font-medium">
                          <span className="text-white/40 w-16 text-[11px] uppercase tracking-widest mt-0.5">Subj:</span>
                          <span className="text-white">{subject || <span className="text-white/20 font-normal italic">(No subject)</span>}</span>
                        </div>
                      </div>
                      <div className="text-white/80 text-[15px] whitespace-pre-wrap font-sans leading-relaxed tracking-wide">
                        {body || <span className="text-white/20 italic">Your message will appear here...</span>}
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex-shrink-0 flex items-center justify-center text-white/40 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                        <span className="text-[20px] font-medium text-white/40">
                          {channel === "linkedin" ? <LinkedinLogo weight="duotone" /> : <Hash weight="duotone" />}
                        </span>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-3xl rounded-tl-none p-6 w-full text-[15px] text-white/80 whitespace-pre-wrap leading-relaxed shadow-sm">
                        {body || <span className="text-white/20 italic">Your message will appear here...</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
