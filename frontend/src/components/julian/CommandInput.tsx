"use client";

import React, { useState } from 'react';
import { Brain, PaperPlaneRight } from '@phosphor-icons/react';

export function CommandInput({ onCommand, disabled, placeholder }: { onCommand: (cmd: string) => void, disabled: boolean, placeholder?: string }) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onCommand(input.trim());
      setInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-auto pt-6 pb-2 relative shrink-0">
      <div className="absolute inset-x-0 -top-10 h-10 bg-gradient-to-t from-[#0a0a0a]/80 to-transparent pointer-events-none z-10" />
      <div className={`relative flex items-center bg-white/[0.02] backdrop-blur-xl border rounded-2xl overflow-hidden transition-all duration-500 z-20 ${disabled ? 'opacity-50 border-white/5' : 'border-white/10 hover:border-white/20 focus-within:border-emerald-500/50 focus-within:shadow-[0_0_20px_rgba(16,185,129,0.15)] focus-within:bg-white/[0.04]'}`}>
        <div className="pl-4 pr-2 text-emerald-500/70">
          <Brain weight="duotone" size={20} />
        </div>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={disabled}
          suppressHydrationWarning
          placeholder={disabled ? "Processing..." : (placeholder || "Command Luna (e.g. 'Synthesize account data and prepare angle')...")}
          className="flex-1 py-3.5 px-2 bg-transparent text-[14px] text-white placeholder:text-zinc-600 focus:outline-none font-medium tracking-wide"
        />
        <button 
          type="submit"
          disabled={disabled || !input.trim()}
          className="mr-2 w-10 h-10 rounded-xl bg-emerald-500 text-black flex items-center justify-center disabled:opacity-50 hover:bg-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <PaperPlaneRight weight="fill" size={18} />
        </button>
      </div>
    </form>
  );
}
