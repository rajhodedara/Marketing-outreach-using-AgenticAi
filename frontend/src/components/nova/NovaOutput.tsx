"use client";

import React from 'react';
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

export function NovaOutput({ data }: { data: NovaPlanData }) {
  return (
    <div className="flex flex-col gap-4 mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[18px] font-semibold text-foreground tracking-tight">{data.companyName}</h3>
          <p className="text-[13px] text-muted-foreground mt-0.5">{data.domain} • {data.industry}</p>
        </div>
        <div className="px-2 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] font-mono rounded flex items-center gap-1.5 uppercase tracking-wider">
          <CheckCircle weight="fill" size={14} />
          Verified Strategy
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="border-b border-border bg-muted/30 p-3">
          <div className="flex items-center gap-2">
            <User weight="duotone" className="text-muted-foreground" size={18} />
            <span className="text-[14px] font-semibold text-foreground">Target Persona: <span className="font-normal">{data.targetPersona}</span></span>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <h4 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <Warning weight="bold" size={14} className="text-destructive" />
              Key Challenges
            </h4>
            <ul className="space-y-1.5">
              {data.challenges.map((challenge, i) => (
                <li key={i} className="text-[12px] text-foreground leading-[18px] pl-3 relative before:absolute before:left-0 before:top-1.5 before:w-1 before:h-1 before:bg-destructive/50 before:rounded-full">
                  {challenge}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <TrendUp weight="bold" size={14} className="text-primary" />
              Buying Signals & Initiatives
            </h4>
            <ul className="space-y-1.5">
              {data.keyInitiatives.map((initiative, i) => (
                <li key={i} className="text-[12px] text-foreground leading-[18px] pl-3 relative before:absolute before:left-0 before:top-1.5 before:w-1 before:h-1 before:bg-primary/50 before:rounded-full">
                  {initiative}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-border bg-primary/5 p-4">
          <h4 className="text-[11px] uppercase tracking-wider font-semibold text-primary mb-2 flex items-center gap-1.5">
            <Target weight="bold" size={14} />
            Suggested Outreach Angle
          </h4>
          <p className="text-[12px] text-foreground leading-[20px] italic border-l-2 border-primary/50 pl-3">
            "{data.suggestedAngle}"
          </p>
        </div>
      </div>
    </div>
  );
}
