"use client";

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Brain, Info, Lightbulb, Warning, Database } from '@phosphor-icons/react';

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
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
          <Brain weight="light" className="text-muted-foreground w-8 h-8" />
        </div>
        <h3 className="text-foreground font-semibold mb-2">Awaiting Instructions</h3>
        <p className="text-muted-foreground text-sm max-w-[250px]">
          Command Luna to begin synthesizing account data and formulating an outreach strategy.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 border-t border-border mt-6 font-mono text-[13px]" ref={scrollRef}>
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
        } as Variants}
        className="space-y-4"
      >
      <AnimatePresence>
      {events.map((event) => {
        let IconComponent = Info;
        let iconColor = 'text-muted-foreground';
        let bgStyle = 'bg-muted/30';
        let borderStyle = 'border-border/50';

        switch (event.type) {
          case 'thought':
            IconComponent = Brain;
            iconColor = 'text-primary';
            bgStyle = 'bg-primary/5';
            borderStyle = 'border-primary/20';
            break;
          case 'discovery':
            IconComponent = Lightbulb;
            iconColor = 'text-amber-500';
            bgStyle = 'bg-amber-500/5';
            borderStyle = 'border-amber-500/20';
            break;
          case 'warning':
            IconComponent = Warning;
            iconColor = 'text-destructive';
            bgStyle = 'bg-destructive/5';
            borderStyle = 'border-destructive/20';
            break;
        }

        return (
          <motion.div 
            key={event.id}
            variants={{
              hidden: { opacity: 0, y: 10 },
              visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20 } }
            } as Variants}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`flex gap-3 p-3 rounded-lg border shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${bgStyle} ${borderStyle}`}
          >
            <div className={`mt-0.5 ${iconColor}`}>
              <IconComponent weight="duotone" size={16} />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex justify-between items-start">
                <span className="text-foreground leading-relaxed font-sans text-sm">{event.message}</span>
                <span className="text-[10px] text-muted-foreground opacity-70 whitespace-nowrap ml-4">{event.timestamp}</span>
              </div>
              {event.source && (
                <div className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-black/20 px-1.5 py-0.5 rounded w-fit mt-1 border border-white/5 shadow-inner">
                  <Database weight="duotone" size={12} />
                  Source: {event.source}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
      </AnimatePresence>
      </motion.div>
    </div>
  );
}
