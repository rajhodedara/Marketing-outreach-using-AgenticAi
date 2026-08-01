"use client";

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, User, Warning, TrendUp, Target } from '@phosphor-icons/react';

export interface NovaPlanData {
  companyName: string;
  domain: string;
  industry: string;
  challenges: string[];
  keyInitiatives: string[];
  targetPersona: string;
  suggestedAngle: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15, filter: 'blur(8px)' },
  show: { 
    opacity: 1, 
    y: 0, 
    filter: 'blur(0px)',
    transition: { type: "spring", stiffness: 100, damping: 20 }
  }
};

export function NovaOutput({ data }: { data: NovaPlanData }) {
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll into view when the component mounts (analysis is complete)
    setTimeout(() => {
      outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, []);

  return (
    <motion.div 
      ref={outputRef}
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6 mt-4 w-full max-w-full overflow-hidden"
    >
      <motion.div variants={itemVariants} className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-zinc-100">{data.companyName}</h3>
          <p className="text-[13px] text-zinc-400 mt-1 font-medium">{data.domain} • {data.industry}</p>
        </div>
        <div className="px-3 py-1.5 liquid-glass text-emerald-400 text-[10px] font-mono rounded-full flex items-center gap-2 uppercase tracking-wider shrink-0">
          <CheckCircle weight="fill" size={14} className="text-emerald-400" />
          Verified Strategy
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="liquid-glass rounded-[2rem] p-6 diffusion-shadow flex flex-col gap-6 relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none" />

        <div className="flex items-center gap-3 pb-5 border-b border-white/5">
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
            <User weight="duotone" className="text-zinc-400" size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">Target Persona</span>
            <span className="text-[14px] font-medium text-zinc-200">{data.targetPersona}</span>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <h4 className="text-[11px] uppercase tracking-[0.15em] font-semibold text-zinc-400 mb-3 flex items-center gap-2">
              <Warning weight="duotone" size={16} className="text-rose-400" />
              Key Challenges
            </h4>
            <ul className="space-y-2">
              {data.challenges.length > 0 ? data.challenges.map((challenge, i) => (
                <li key={i} className="text-[13px] text-zinc-300 leading-relaxed pl-4 relative before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:bg-rose-400/50 before:rounded-full">
                  {challenge}
                </li>
              )) : (
                <li className="text-[13px] text-zinc-500 italic pl-4">No challenges identified.</li>
              )}
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] uppercase tracking-[0.15em] font-semibold text-zinc-400 mb-3 flex items-center gap-2">
              <TrendUp weight="duotone" size={16} className="text-emerald-400" />
              Buying Signals & Initiatives
            </h4>
            <ul className="space-y-2">
              {data.keyInitiatives.length > 0 ? data.keyInitiatives.map((initiative, i) => (
                <li key={i} className="text-[13px] text-zinc-300 leading-relaxed pl-4 relative before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:bg-emerald-400/50 before:rounded-full">
                  {initiative}
                </li>
              )) : (
                <li className="text-[13px] text-zinc-500 italic pl-4">No specific initiatives identified.</li>
              )}
            </ul>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="liquid-glass rounded-[2rem] p-6 border-l-2 border-l-emerald-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />
        <h4 className="text-[11px] uppercase tracking-[0.15em] font-semibold text-emerald-400 mb-3 flex items-center gap-2 relative z-10">
          <Target weight="duotone" size={16} />
          Suggested Outreach Angle
        </h4>
        <p className="text-[14px] text-zinc-200 leading-relaxed italic relative z-10">
          "{data.suggestedAngle}"
        </p>
      </motion.div>
    </motion.div>
  );
}
