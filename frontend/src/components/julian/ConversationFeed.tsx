"use client";

import React, { useEffect, useRef } from 'react';

export type MessageRole = 'system' | 'julian' | 'prospect';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  partialContent?: string;
  isStreaming?: boolean;
  timestamp: string;
  citations?: string[];
  link?: string;
  linkText?: string;
}

export function ConversationFeed({ messages }: { messages: ChatMessage[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border-t border-border mt-6">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-muted-foreground text-[32px]">record_voice_over</span>
        </div>
        <h3 className="text-foreground font-semibold mb-2">No Active Call</h3>
        <p className="text-muted-foreground text-sm max-w-[250px]">
          Start a simulation to see Armin&apos;s real-time conversation and dynamic script adaptation.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 border-t border-border mt-6" ref={scrollRef}>
      {messages.map((msg) => {
        if (msg.role === 'system') {
          // ── Meeting booked ? prominent card ──
          if (msg.link) {
            return (
              <div key={msg.id} className="flex justify-center my-4">
                <div className="w-full max-w-sm bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-[22px]">event_available</span>
                    <span className="text-[14px] font-semibold text-emerald-400">Meeting Scheduled</span>
                  </div>
                  <p className="text-[12px] text-muted-foreground text-center">{msg.content}</p>
                  <a
                    href={msg.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-[13px] font-semibold rounded-lg transition-all active:scale-95 shadow-md"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    {msg.linkText || 'Open in Google Calendar'}
                  </a>
                </div>
              </div>
            );
          }

          // ── Escalation messages ? amber card ──
          if (msg.content.startsWith('🚩')) {
            return (
              <div key={msg.id} className="flex justify-center my-4">
                <div className="w-full max-w-sm bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-400 text-[20px] mt-0.5 shrink-0">flag</span>
                  <div>
                    <div className="text-[12px] font-semibold text-amber-400 mb-0.5">Escalated to Luna</div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{msg.content.replace('🚩 ', '')}</p>
                  </div>
                </div>
              </div>
            );
          }

          // ── Error messages ? red ──
          if (msg.content.startsWith('❌')) {
            return (
              <div key={msg.id} className="flex justify-center my-4">
                <div className="px-4 py-2 bg-destructive/10 border border-destructive/30 rounded-lg text-[12px] text-destructive font-medium text-center">
                  {msg.content}
                </div>
              </div>
            );
          }

          // ── Default system message ? status pill ──
          return (
            <div key={msg.id} className="flex justify-center my-4">
              <div className="px-3 py-1 bg-muted rounded-full border border-border text-[11px] font-mono text-muted-foreground uppercase tracking-widest text-center">
                {msg.content}
              </div>
            </div>
          );
        }

        const isArmin = msg.role === 'julian';
        
        return (
          <div key={msg.id} className={`flex gap-4 max-w-[85%] ${isArmin ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}>
            <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center overflow-hidden border ${isArmin ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-secondary border-border text-foreground'}`}>
              {isArmin ? (
                <img src="/armin-portrait.png" alt="Armin" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-[16px]">person</span>
              )}
            </div>
            
            <div className={`flex flex-col gap-1 ${isArmin ? 'items-start' : 'items-end'}`}>
              <div className="flex items-center gap-2 px-1">
                <span className="text-[12px] font-semibold text-foreground">
                  {isArmin ? 'Armin' : 'You'}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">{msg.timestamp}</span>
              </div>
              
              <div className={`p-3 rounded-2xl text-[14px] leading-[22px] ${isArmin ? 'bg-muted border border-border rounded-tl-sm text-foreground' : 'bg-primary text-primary-foreground rounded-tr-sm'}`}>
                {msg.content}
                {msg.content && msg.partialContent && " "}
                {msg.partialContent && (
                  <span className="opacity-70">{msg.partialContent}</span>
                )}
                {msg.isStreaming && (
                  <span className="inline-block w-1.5 h-3 ml-1 bg-current opacity-50 animate-pulse" />
                )}
                
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/50 flex gap-2 flex-wrap">
                    {msg.citations.map((cite, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-black/20 rounded text-[10px] font-mono opacity-80 cursor-help" title={cite}>
                        <span className="material-symbols-outlined text-[10px]">data_check</span>
                        Source Data
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
