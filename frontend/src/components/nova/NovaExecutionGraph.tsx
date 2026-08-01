"use client";

import React from 'react';

export type NovaStepStatus = 'pending' | 'active' | 'completed' | 'flagged';

export interface NovaExecutionStep {
  id: string;
  label: string;
  description: string;
  status: NovaStepStatus;
  result?: string;
}

export function NovaExecutionGraph({ steps }: { steps: NovaExecutionStep[] }) {
  return (
    <div className="flex flex-col gap-6 relative px-4 py-6">
      {/* Vertical Connecting Line */}
      <div className="absolute left-9 top-10 bottom-10 w-px bg-border/50 z-0"></div>

      {steps.map((step) => {
        let dotColor = 'bg-card border-border';
        let textColor = 'text-muted-foreground';
        let titleColor = 'text-foreground';
        let icon = <div className="w-2 h-2 rounded-full bg-border" />;
        let pulse = false;
        let cardStyle = 'bg-card border-border';

        if (step.status === 'completed') {
          dotColor = 'bg-primary border-primary';
          titleColor = 'text-foreground';
          textColor = 'text-muted-foreground';
          cardStyle = 'bg-card border-border opacity-75';
          icon = <span className="material-symbols-outlined text-[12px] text-primary-foreground font-bold">check</span>;
        } else if (step.status === 'active') {
          dotColor = 'bg-primary border-primary shadow-[0_0_10px_rgba(16,185,129,0.4)]';
          titleColor = 'text-primary';
          textColor = 'text-foreground';
          pulse = true;
          cardStyle = 'bg-primary/5 border-primary/20 shadow-sm';
          icon = <div className="w-2 h-2 rounded-full bg-primary-foreground" />;
        } else if (step.status === 'flagged') {
          dotColor = 'bg-amber-500 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]';
          titleColor = 'text-amber-500';
          textColor = 'text-foreground';
          cardStyle = 'bg-amber-500/5 border-amber-500/20 shadow-sm';
          icon = <span className="material-symbols-outlined text-[12px] text-white font-bold">search</span>; // Different icon for Nova's flag
        }

        return (
          <div key={step.id} className="relative flex items-start gap-4 z-10">
            <div className="flex items-center justify-center w-10 h-10 shrink-0 mt-1">
               <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${dotColor} ${pulse ? 'animate-pulse' : ''}`}>
                 {icon}
               </div>
            </div>
            <div className={`flex-1 p-4 rounded-lg border transition-all duration-300 ${cardStyle}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className={`font-semibold text-[14px] ${titleColor}`}>{step.label}</div>
                <div className="font-mono text-[10px] tracking-wider uppercase opacity-70">
                  {step.status === 'active' ? (
                    <span className="flex items-center gap-1 text-primary">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
                      Executing
                    </span>
                  ) : step.status}
                </div>
              </div>
              <div className={`text-[12px] leading-[18px] ${textColor}`}>
                {step.description}
              </div>
              {step.result && (
                <div className="mt-3 p-2 bg-black/20 border border-white/5 rounded text-[11px] font-mono text-muted-foreground whitespace-pre-wrap">
                  {step.result}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
