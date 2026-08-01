"use client";

import React from 'react';

export interface SourceData {
  type: 'crm' | 'transcript' | 'email' | 'web';
  name: string;
  preview: string;
}

export function SourceDataView({ sources }: { sources: SourceData[] }) {
  if (sources.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
      {sources.map((src, i) => {
        let icon = 'description';
        switch (src.type) {
          case 'crm': icon = 'contact_page'; break;
          case 'transcript': icon = 'record_voice_over'; break;
          case 'email': icon = 'mail'; break;
          case 'web': icon = 'language'; break;
        }

        return (
          <div key={i} className="flex-shrink-0 w-[200px] bg-muted/20 border border-border rounded-lg p-3 group hover:border-primary/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[16px] text-muted-foreground group-hover:text-primary transition-colors">{icon}</span>
              <span className="text-[12px] font-semibold text-foreground truncate">{src.name}</span>
            </div>
            <p className="text-[10px] text-muted-foreground line-clamp-2 font-mono">
              "{src.preview}"
            </p>
          </div>
        );
      })}
    </div>
  );
}
