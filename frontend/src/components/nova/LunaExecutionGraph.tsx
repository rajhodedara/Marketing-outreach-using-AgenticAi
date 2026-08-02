"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, MagnifyingGlass, CaretDown, CirclesThreePlus, Brain, Layout, Textbox, ShareNetwork } from '@phosphor-icons/react';

export type LunaStepStatus = 'pending' | 'active' | 'completed' | 'flagged';

export interface LunaExecutionStep {
  id: string;
  label: string;
  description: string;
  status: LunaStepStatus;
  result?: string;
}

export function LunaExecutionGraph({ steps }: { steps: LunaExecutionStep[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Helper to assign a nice icon to each step based on its label
  const getIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('ingest')) return <ShareNetwork weight="duotone" className="w-4 h-4" />;
    if (l.includes('persona')) return <Brain weight="duotone" className="w-4 h-4" />;
    if (l.includes('intent')) return <Textbox weight="duotone" className="w-4 h-4" />;
    if (l.includes('strategy')) return <Layout weight="duotone" className="w-4 h-4" />;
    if (l.includes('fact')) return <MagnifyingGlass weight="duotone" className="w-4 h-4" />;
    return <CirclesThreePlus weight="duotone" className="w-4 h-4" />;
  };

  return (
    <div className="flex flex-col gap-2 relative w-full h-full p-4 sm:p-6 pb-20 overflow-y-auto">
      {/* Background connecting line */}
      <div className="absolute left-[31px] sm:left-[39px] top-10 bottom-20 w-[2px] bg-gradient-to-b from-emerald-500/50 via-emerald-500/10 to-transparent z-0"></div>

      <AnimatePresence>
        {steps.map((step, index) => {
          const isExpanded = expandedId === step.id;
          
          let dotColor = 'bg-[#0a0a0a] border-white/10 text-white/20';
          let textColor = 'text-zinc-500';
          let titleColor = 'text-zinc-500';
          let pulse = false;
          let cardStyle = 'bg-transparent border-transparent hover:bg-white/[0.02]';

          if (step.status === 'completed') {
            dotColor = 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]';
            titleColor = 'text-zinc-300';
            textColor = 'text-zinc-400';
            cardStyle = 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] shadow-sm';
          } else if (step.status === 'active') {
            dotColor = 'bg-emerald-400 border-emerald-300 text-black shadow-[0_0_20px_rgba(52,211,153,0.5)]';
            titleColor = 'text-emerald-400 font-semibold tracking-wide';
            textColor = 'text-zinc-300';
            pulse = true;
            cardStyle = 'bg-emerald-500/[0.03] border-emerald-500/30 shadow-[0_8px_30px_-10px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/20 backdrop-blur-md';
          } else if (step.status === 'flagged') {
            dotColor = 'bg-rose-500/10 border-rose-500/50 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]';
            titleColor = 'text-rose-400 font-semibold tracking-wide';
            textColor = 'text-zinc-300';
            cardStyle = 'bg-rose-500/[0.03] border-rose-500/30 shadow-sm ring-1 ring-rose-500/20 backdrop-blur-md';
          }

          return (
            <motion.div 
              key={step.id} 
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 20, delay: index * 0.1 }}
              className="relative flex items-start gap-4 sm:gap-6 z-10 py-2 group"
            >
              {/* Connector Node */}
              <div className="flex items-center justify-center shrink-0 w-[32px] sm:w-[32px] h-12">
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-500 ${dotColor} ${pulse ? 'animate-pulse scale-110' : 'group-hover:scale-110'}`}>
                   {step.status === 'completed' ? (
                     <Check weight="bold" className="w-4 h-4" />
                   ) : step.status === 'flagged' ? (
                     <MagnifyingGlass weight="bold" className="w-4 h-4" />
                   ) : (
                     getIcon(step.label)
                   )}
                 </div>
              </div>

              {/* Content Card */}
              <div 
                className={`flex-1 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${cardStyle} ${isExpanded ? 'ring-1 ring-white/10 bg-white/[0.02]' : ''}`}
                onClick={() => setExpandedId(isExpanded ? null : step.id)}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-5 select-none">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-3">
                      <h3 className={`text-[14px] sm:text-[15px] ${titleColor}`}>
                        {step.label}
                      </h3>
                      {step.status === 'active' && (
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] sm:text-[10px] font-mono text-emerald-400 uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                          Running
                        </span>
                      )}
                    </div>
                    <p className={`text-[12px] sm:text-[13px] leading-relaxed ${textColor}`}>
                      {step.description}
                    </p>
                  </div>
                  
                  <div className={`shrink-0 p-2 rounded-full transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-white/5' : 'group-hover:bg-white/5'}`}>
                    <CaretDown className="w-4 h-4 text-zinc-500" />
                  </div>
                </div>

                {/* Expandable Result Area */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0">
                        {step.result ? (
                          <div className="p-4 sm:p-5 rounded-xl bg-black/60 border border-white/5 font-mono text-[11px] sm:text-[12px] text-zinc-300 whitespace-pre-wrap leading-[1.6] shadow-inner">
                            {step.result}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-white/10 bg-black/20">
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mb-3">
                              <Brain className="w-4 h-4 text-zinc-500" />
                            </div>
                            <span className="text-zinc-500 text-[10px] sm:text-[11px] font-mono uppercase tracking-widest">
                              Awaiting Intelligence
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
