"use client";

import React from 'react';

export interface CallBriefData {
  companyName: string;
  targetPersona: string;
  painPoints: string[];
  buyingSignals: string[];
}

export function CallBrief({ data }: { data: CallBriefData | null }) {
  if (!data) {
    return (
      <div className="p-4 border border-border rounded-lg bg-card text-center text-muted-foreground text-sm">
        Select an account to load the verified call brief.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[18px] font-semibold text-foreground tracking-tight">{data.companyName}</h3>
          <p className="text-[13px] text-muted-foreground mt-0.5">Target: <span className="font-medium text-foreground">{data.targetPersona}</span></p>
        </div>
        <div className="px-2 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] font-mono rounded flex items-center gap-1.5 uppercase">
          <span className="material-symbols-outlined text-[14px]">verified</span>
          Verified Brief
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-muted/50 border border-border rounded p-3">
          <h4 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-destructive">warning</span>
            Verified Pain Points
          </h4>
          <ul className="space-y-2">
            {data.painPoints.map((point, i) => (
              <li key={i} className="text-[12px] text-foreground leading-[18px] pl-3 relative before:absolute before:left-0 before:top-1.5 before:w-1 before:h-1 before:bg-destructive/50 before:rounded-full">
                {point}
              </li>
            ))}
            {data.painPoints.length === 0 && (
              <li className="text-[12px] text-muted-foreground italic">No verified pain points found.</li>
            )}
          </ul>
        </div>

        <div className="bg-muted/50 border border-border rounded p-3">
          <h4 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-primary">trending_up</span>
            Buying Signals
          </h4>
          <ul className="space-y-2">
            {data.buyingSignals.map((signal, i) => (
              <li key={i} className="text-[12px] text-foreground leading-[18px] pl-3 relative before:absolute before:left-0 before:top-1.5 before:w-1 before:h-1 before:bg-primary/50 before:rounded-full">
                {signal}
              </li>
            ))}
            {data.buyingSignals.length === 0 && (
              <li className="text-[12px] text-muted-foreground italic">No verified buying signals found.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
