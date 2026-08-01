"use client";

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface FeedEvent {
  id: string;
  type: 'info' | 'thought' | 'discovery' | 'warning';
  message: string;
  timestamp: string;
  source?: string;
}

export function AgentFeed({ events }: { events: FeedEvent[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border-t border-border mt-6">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-muted-foreground text-[32px]">neurology</span>
        </div>
        <h3 className="text-foreground font-semibold mb-2">Awaiting Instructions</h3>
        <p className="text-muted-foreground text-sm max-w-[250px]">
          Command Nova to begin synthesizing account data and formulating an outreach strategy.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 border-t border-border mt-6 font-mono text-[13px]" ref={scrollRef}>
      <AnimatePresence>
      {events.map((event) => {
        let icon = 'info';
        let iconColor = 'text-muted-foreground';
        let bgStyle = 'bg-muted/30';
        let borderStyle = 'border-border/50';

        switch (event.type) {
          case 'thought':
            icon = 'psychology';
            iconColor = 'text-primary';
            bgStyle = 'bg-primary/5';
            borderStyle = 'border-primary/20';
            break;
          case 'discovery':
            icon = 'lightbulb';
            iconColor = 'text-amber-500';
            bgStyle = 'bg-amber-500/5';
            borderStyle = 'border-amber-500/20';
            break;
          case 'warning':
            icon = 'warning';
            iconColor = 'text-destructive';
            bgStyle = 'bg-destructive/5';
            borderStyle = 'border-destructive/20';
            break;
        }

        return (
          <motion.div 
            key={event.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex gap-3 p-3 rounded-lg border ${bgStyle} ${borderStyle}`}
          >
            <span className={`material-symbols-outlined text-[16px] mt-0.5 ${iconColor}`}>{icon}</span>
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex justify-between items-start">
                <span className="text-foreground leading-relaxed">{event.message}</span>
                <span className="text-[10px] text-muted-foreground opacity-70 whitespace-nowrap ml-4">{event.timestamp}</span>
              </div>
              {event.source && (
                <div className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-black/20 px-1.5 py-0.5 rounded w-fit mt-1">
                  <span className="material-symbols-outlined text-[10px]">database</span>
                  Source: {event.source}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
      </AnimatePresence>
    </div>
  );
}
