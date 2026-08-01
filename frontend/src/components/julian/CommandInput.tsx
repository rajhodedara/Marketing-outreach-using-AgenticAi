"use client";

import React, { useState } from 'react';

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
    <form onSubmit={handleSubmit} className="mt-auto pt-4 relative">
      <div className={`relative flex items-center bg-card border rounded-xl overflow-hidden shadow-sm transition-all duration-300 ${disabled ? 'opacity-50 border-border' : 'border-border focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20'}`}>
        <div className="pl-4 pr-2 text-muted-foreground">
          <span className="material-symbols-outlined text-[20px]">psychology</span>
        </div>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={disabled}
          suppressHydrationWarning
          placeholder={disabled ? "Processing..." : (placeholder || "Command Julian (e.g. 'Call Dana Whitfield and focus on API delays')...")}
          className="flex-1 py-3 px-2 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <button 
          type="submit"
          disabled={disabled || !input.trim()}
          className="mr-2 w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">send</span>
        </button>
      </div>
    </form>
  );
}
