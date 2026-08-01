"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface NovaComposerProps {
  accountId: string;
  accountName: string;
}

type Channel = "email" | "linkedin" | "slack";
type Tone = "Professional" | "Friendly" | "Executive" | "Technical";

export function NovaComposer({ accountId, accountName }: NovaComposerProps) {
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
        setBody(data.body || "");
        setCitations(data.citations || []);
      } else {
        // Mock data for MVP
        setTimeout(() => {
          setSubject(channel === "email" ? `Elevate ${accountName}'s growth strategy` : "");
          setBody(`Hi there,\n\nI noticed ${accountName} is expanding its operations. Our platform can help streamline your processes.\n\nLet me know if you'd be open to a brief chat.\n\nBest,\nNova`);
          setCitations(["Recent funding news", "Company career page"]);
          setIsGenerating(false);
        }, 1500);
        return;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Editor Pane */}
        <div className="flex-1 space-y-4">
          <Card className="border-zinc-800 bg-zinc-900/50 shadow-lg">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                  {(["email", "linkedin", "slack"] as Channel[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => setChannel(c)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                        channel === c ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {c === "email" ? "mail" : c === "linkedin" ? "work" : "tag"}
                      </span>
                      <span className="capitalize">{c}</span>
                    </button>
                  ))}
                </div>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as Tone)}
                  className="bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {["Professional", "Friendly", "Executive", "Technical"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-zinc-400 ml-1">Target Persona</label>
                  <Input
                    placeholder="e.g. VP of Engineering"
                    className="bg-zinc-950 border-zinc-800 focus-visible:ring-emerald-500"
                    value={persona}
                    onChange={(e) => setPersona(e.target.value)}
                  />
                </div>
                
                {channel === "email" && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                    <label className="text-xs font-medium text-zinc-400 ml-1">Subject</label>
                    <Input
                      placeholder="Enter subject..."
                      className="bg-zinc-950 border-zinc-800 focus-visible:ring-emerald-500 font-medium text-white"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </motion.div>
                )}

                <div>
                  <label className="text-xs font-medium text-zinc-400 ml-1">Message Body</label>
                  <textarea
                    rows={8}
                    className="w-full rounded-md bg-zinc-950 border border-zinc-800 p-3 text-sm text-zinc-300 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                    placeholder="Write your message here or generate with AI..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button 
                  onClick={handleGenerate} 
                  disabled={isGenerating}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2"
                >
                  {isGenerating ? (
                    <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                  )}
                  {isGenerating ? "Generating..." : "Generate with AI"}
                </Button>

                <div className="flex gap-2">
                  <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={handleCopy} disabled={!body}>
                    <span className="material-symbols-outlined text-[18px] mr-1.5">content_copy</span>
                    Copy
                  </Button>
                  {channel === "email" && (
                    <Button variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" disabled={!body}>
                      <span className="material-symbols-outlined text-[18px] mr-1.5">send</span>
                      Send via Gmail
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <AnimatePresence>
            {citations.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 flex-wrap px-1"
              >
                <span className="text-xs text-zinc-500 font-medium flex items-center">
                  <span className="material-symbols-outlined text-[14px] mr-1">info</span> Sources:
                </span>
                {citations.map((cite, idx) => (
                  <Badge key={idx} variant="outline" className="bg-zinc-900 border-zinc-700 text-zinc-400 text-[10px]">
                    {cite}
                  </Badge>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Preview Pane */}
        <div className="flex-1">
          <div className="sticky top-6">
            <h3 className="text-sm font-semibold text-zinc-400 mb-3 ml-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">visibility</span>
              Live Preview
            </h3>
            <Card className="border-zinc-800 bg-black shadow-xl overflow-hidden liquid-glass">
              <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
              </div>
              <CardContent className="p-6">
                {channel === "email" ? (
                  <div className="space-y-4">
                    <div className="border-b border-zinc-800 pb-3">
                      <div className="flex text-sm mb-1">
                        <span className="text-zinc-500 w-12">To:</span>
                        <span className="text-zinc-300">{persona || "Recipient"} &lt;contact@{accountName.toLowerCase().replace(/\s/g, "")}.com&gt;</span>
                      </div>
                      <div className="flex text-sm font-medium">
                        <span className="text-zinc-500 w-12">Subj:</span>
                        <span className="text-emerald-400">{subject || "(No subject)"}</span>
                      </div>
                    </div>
                    <div className="text-zinc-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                      {body || <span className="text-zinc-600 italic">Your message will appear here...</span>}
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0 flex items-center justify-center text-zinc-500">
                      <span className="material-symbols-outlined text-[20px]">person</span>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-none p-4 w-full text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed shadow-sm">
                      {body || <span className="text-zinc-600 italic">Your message will appear here...</span>}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
