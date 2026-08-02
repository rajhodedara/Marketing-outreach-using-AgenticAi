"use client";

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Brain, Info, Lightbulb, Warning, Database } from '@phosphor-icons/react';

export interface FeedEvent {
  id: string;
  type: 'info' | 'thought' | 'discovery' | 'warning' | 'user';
  message: string;
  timestamp: string;
  source?: string;
}

export function AgentFeed({ events, isSimulating }: { events: FeedEvent[], isSimulating?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center mt-6">
        <motion.div 
          animate={{ boxShadow: ['0 0 0 0 rgba(255,255,255,0)', '0 0 20px 5px rgba(255,255,255,0.05)', '0 0 0 0 rgba(255,255,255,0)'] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-white/5 to-transparent flex items-center justify-center mb-6 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] relative"
        >
          <div className="absolute inset-0 rounded-full bg-white/[0.02] blur-md" />
          <Brain weight="light" className="text-white/40 w-8 h-8 relative z-10" />
        </motion.div>
        <h3 className="text-white/80 font-medium tracking-wide mb-2">Awaiting Instructions</h3>
        <p className="text-white/40 text-[13px] max-w-[250px] leading-relaxed">
          Command Luna to begin synthesizing account data and formulating an outreach strategy.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-2 space-y-3 mt-4 font-mono text-[13px] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent" ref={scrollRef}>
      <div className="space-y-3">
      <AnimatePresence>
      {events.map((event) => {
        let IconComponent = Info;
        let iconColor = 'text-zinc-500';
        let bgStyle = 'bg-gradient-to-r from-zinc-500/5 to-transparent';
        let borderStyle = 'border-l-2 border-zinc-500/30';
        let alignment = 'justify-start';

        if (event.type === 'user') {
          return (
            <motion.div 
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex justify-end w-full my-4"
            >
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-50 px-4 py-3 rounded-2xl rounded-tr-sm max-w-[85%] shadow-sm">
                <div className="text-[13px] leading-relaxed font-sans font-medium">{event.message}</div>
                <div className="text-[9px] text-emerald-500/50 mt-1 text-right tabular-nums">{event.timestamp}</div>
              </div>
            </motion.div>
          );
        }

        switch (event.type) {
          case 'thought':
            IconComponent = Brain;
            iconColor = 'text-emerald-400';
            bgStyle = 'bg-gradient-to-r from-emerald-500/10 to-transparent';
            borderStyle = 'border-l-2 border-emerald-500/50 shadow-[inset_1px_0_10px_rgba(16,185,129,0.1)]';
            break;
          case 'discovery':
            IconComponent = Lightbulb;
            iconColor = 'text-amber-400';
            bgStyle = 'bg-gradient-to-r from-amber-500/10 to-transparent';
            borderStyle = 'border-l-2 border-amber-500/50 shadow-[inset_1px_0_10px_rgba(245,158,11,0.1)]';
            break;
          case 'warning':
            IconComponent = Warning;
            iconColor = 'text-rose-400';
            bgStyle = 'bg-gradient-to-r from-rose-500/10 to-transparent';
            borderStyle = 'border-l-2 border-rose-500/50 shadow-[inset_1px_0_10px_rgba(244,63,94,0.1)]';
            break;
        }

        return (
          <motion.div 
            key={event.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            exit={{ opacity: 0, filter: 'blur(4px)' }}
            className={`flex gap-4 px-4 py-3 rounded-r-xl ${bgStyle} ${borderStyle}`}
          >
            <div className={`mt-0.5 ${iconColor}`}>
              <IconComponent weight="duotone" size={16} />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="flex justify-between items-start">
                <span className="text-zinc-200 leading-relaxed font-sans text-[13px] font-medium">{event.message}</span>
                <span className="text-[10px] text-zinc-500 whitespace-nowrap ml-4 tabular-nums">{event.timestamp}</span>
              </div>
              {event.source && (
                <div className="inline-flex items-center gap-1.5 text-[10px] text-zinc-400 bg-black/40 px-2 py-1 rounded-md w-fit mt-1 border border-white/5 shadow-inner">
                  <Database weight="duotone" size={12} className="text-zinc-500" />
                  Source: {event.source}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
      {isSimulating && events.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-4 px-4 py-4 rounded-r-xl bg-gradient-to-r from-emerald-500/5 to-transparent border-l-2 border-emerald-500/30"
        >
          <div className="mt-0.5 text-emerald-500">
             <div className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500/50 flex items-center justify-center">
                <Brain weight="fill" size={10} className="text-emerald-100" />
              </span>
            </div>
          </div>
          <div className="flex-1 flex items-center">
            <div className="flex space-x-1">
              <motion.div className="w-1.5 h-1.5 bg-emerald-500/60 rounded-full" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
              <motion.div className="w-1.5 h-1.5 bg-emerald-500/60 rounded-full" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
              <motion.div className="w-1.5 h-1.5 bg-emerald-500/60 rounded-full" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} />
            </div>
            <span className="ml-3 text-emerald-500/60 font-sans text-[12px] font-medium uppercase tracking-widest">Luna is synthesizing...</span>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
      </div>
    </div>
  );
}
