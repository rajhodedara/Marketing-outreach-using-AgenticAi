"use client";

import React, { useEffect, useRef } from 'react';

export type MessageRole = 'system' | 'julian' | 'prospect';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  citations?: string[];
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
          Start a simulation to see Julian's real-time conversation and dynamic script adaptation.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 border-t border-border mt-6" ref={scrollRef}>
      {messages.map((msg) => {
        if (msg.role === 'system') {
          return (
            <div key={msg.id} className="flex justify-center my-4">
              <div className="px-3 py-1 bg-muted rounded-full border border-border text-[11px] font-mono text-muted-foreground uppercase tracking-widest">
                {msg.content}
              </div>
            </div>
          );
        }

        const isJulian = msg.role === 'julian';
        
        return (
          <div key={msg.id} className={`flex gap-4 max-w-[85%] ${isJulian ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}>
            <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center overflow-hidden border ${isJulian ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-secondary border-border text-foreground'}`}>
              {isJulian ? (
                <img src="/julian-portrait.png" alt="Julian" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-[16px]">person</span>
              )}
            </div>
            
            <div className={`flex flex-col gap-1 ${isJulian ? 'items-start' : 'items-end'}`}>
              <div className="flex items-center gap-2 px-1">
                <span className="text-[12px] font-semibold text-foreground">
                  {isJulian ? 'Julian' : 'Prospect'}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">{msg.timestamp}</span>
              </div>
              
              <div className={`p-3 rounded-2xl text-[14px] leading-[22px] ${isJulian ? 'bg-muted border border-border rounded-tl-sm text-foreground' : 'bg-primary text-primary-foreground rounded-tr-sm'}`}>
                {msg.content}
                
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
