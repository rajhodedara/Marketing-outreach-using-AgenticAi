"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Virtuoso } from "react-virtuoso";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  Flame, 
  Lightbulb, 
  AlertTriangle, 
  Zap, 
  Inbox,
  Activity,
  ArrowUpRight
} from "lucide-react";

type IntentSignal = {
  id: string;
  account_id: string;
  company_name: string;
  signal_type: string;
  content: string;
  source_id: string | null;
  score: number;
  created_at: string;
};

// Helper for relative time
function getTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

function getSignalStyles(type: string) {
  switch (type) {
    case "intent":
      return { 
        Icon: Flame, 
        color: "text-orange-500", 
        bg: "bg-orange-500/10",
        border: "border-orange-500/20",
        glow: "group-hover:shadow-[0_0_15px_rgba(249,115,22,0.15)]"
      };
    case "whitespace":
      return { 
        Icon: Lightbulb, 
        color: "text-blue-500", 
        bg: "bg-blue-500/10",
        border: "border-blue-500/20",
        glow: "group-hover:shadow-[0_0_15px_rgba(59,130,246,0.15)]"
      };
    case "risk":
      return { 
        Icon: AlertTriangle, 
        color: "text-red-500", 
        bg: "bg-red-500/10",
        border: "border-red-500/20",
        glow: "group-hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]"
      };
    default:
      return { 
        Icon: Zap, 
        color: "text-emerald-500", 
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
        glow: "group-hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]"
      };
  }
}

export default function IntelligenceFeedPage() {
  const [signals, setSignals] = useState<IntentSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // 1. Fetch initial signals
  useEffect(() => {
    async function fetchInitial() {
      try {
        const res = await fetch("http://localhost:8000/api/intelligence/signals?limit=500");
        if (res.ok) {
          const data = await res.json();
          setSignals(data.signals || []);
        }
      } catch (err) {
        console.error("Failed to fetch initial signals:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchInitial();
  }, []);

  // 2. Connect WebSocket
  useEffect(() => {
    const wsUrl = "ws://localhost:8000/ws/intelligence";
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Connected to intelligence feed");
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        if (event.data === "pong") return;
        const newSignal: IntentSignal = JSON.parse(event.data);
        setSignals((prev) => [newSignal, ...prev]);
      } catch (err) {
        console.error("Failed to parse websocket message", err);
      }
    };

    ws.onclose = () => {
      console.log("Disconnected from intelligence feed");
      setIsConnected(false);
    };

    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send("ping");
      }
    }, 15000);

    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, []);

  // Derived metrics
  const highIntentCount = useMemo(() => signals.filter(s => s.score >= 80).length, [signals]);
  const avgScore = useMemo(() => signals.length ? Math.round(signals.reduce((acc, curr) => acc + curr.score, 0) / signals.length) : 0, [signals]);

  const renderSignal = useCallback((index: number, signal: IntentSignal) => {
    const { Icon, color, bg, border, glow } = getSignalStyles(signal.signal_type);

    return (
      <div className="py-2.5 px-1 w-full">
        <Link href={`/accounts/${signal.account_id}`} className="block w-full cursor-pointer focus:outline-none">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`bg-card/60 backdrop-blur-md border border-border/40 rounded-2xl p-5 flex gap-5 items-start shadow-sm transition-all duration-300 relative overflow-hidden group ${glow} hover:border-border/80 hover:-translate-y-[2px]`}
          >
            {/* Accent Glow Background */}
          <div className={`absolute -inset-24 opacity-0 group-hover:opacity-10 transition-opacity duration-700 blur-3xl pointer-events-none rounded-full ${bg}`} />
          
          <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-1/2 w-1 ${bg} rounded-r-full group-hover:h-3/4 transition-all duration-300`} />
          
          <div className={`p-3 rounded-xl ${bg} ${color} flex-shrink-0 relative z-10 ring-1 ${border} shadow-inner`}>
            <Icon size={22} strokeWidth={2.5} />
          </div>

          <div className="flex-1 min-w-0 relative z-10 pt-0.5">
            <div className="flex justify-between items-start mb-2 gap-4">
              <h3 className="text-[17px] font-semibold text-foreground truncate tracking-tight flex items-center gap-2">
                {signal.company_name || "Unknown Account"}
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground">
                  <ArrowUpRight size={16} />
                </span>
              </h3>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${border} ${bg} ${color}`}>
                  <Activity size={12} strokeWidth={3} />
                  <span className="text-[12px] font-bold tracking-wide">
                    {signal.score}
                  </span>
                </div>
                <span className="text-[13px] text-muted-foreground/80 font-medium whitespace-nowrap min-w-[50px] text-right">
                  {getTimeAgo(signal.created_at)}
                </span>
              </div>
            </div>
            <p className="text-[15px] text-muted-foreground leading-relaxed font-medium">
              {signal.content}
            </p>
          </div>
          </motion.div>
        </Link>
      </div>
    );
  }, []);

  return (
    <div className="flex-1 h-screen flex flex-col bg-[#0A0A0A] relative overflow-hidden">
      {/* Global Background Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none opacity-50 mix-blend-screen" />
      
      <div className="px-8 pt-10 pb-6 border-b border-white/5 backdrop-blur-xl flex flex-col md:flex-row justify-between items-start md:items-end gap-6 z-20 sticky top-0 bg-background/40">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary ring-1 ring-primary/20">
              <Activity size={20} strokeWidth={2.5} />
            </div>
            <h1 className="text-[36px] leading-none font-bold text-foreground tracking-tight">
              Intelligence
            </h1>
          </div>
          <p className="text-[16px] text-muted-foreground mt-2 max-w-xl">
            Real-time feed of whitespace opportunities and high-value intent signals.
          </p>
        </div>
        
        <div className="flex gap-4 items-center">
          {/* Quick Metrics */}
          <div className="bg-card/50 backdrop-blur-md border border-white/10 rounded-xl px-5 py-3 flex items-center gap-6 shadow-xl">
            <div className="flex flex-col">
              <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Total Signals</span>
              <span className="text-[20px] font-bold tabular-nums leading-none text-foreground">{signals.length.toLocaleString()}</span>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="flex flex-col">
              <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Avg Score</span>
              <span className="text-[20px] font-bold tabular-nums leading-none text-primary">{avgScore}</span>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="flex flex-col">
              <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">High Intent</span>
              <span className="text-[20px] font-bold tabular-nums leading-none text-orange-500">{highIntentCount}</span>
            </div>
          </div>

          {/* Connection Status Indicator */}
          <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full border shadow-sm backdrop-blur-md transition-colors ${isConnected ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}`}>
            <div className="relative flex h-2.5 w-2.5">
              {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </div>
            <span className="text-[13px] font-semibold tracking-wide uppercase">
              {isConnected ? "Live" : "Reconnecting"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="p-3 bg-muted/50 rounded-2xl"
            >
              <Activity size={28} className="text-muted-foreground" />
            </motion.div>
            <p className="text-muted-foreground font-medium animate-pulse">Initializing feed...</p>
          </div>
        ) : signals.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto"
          >
            <div className="w-20 h-20 rounded-full bg-card border border-border/50 flex items-center justify-center mb-6 shadow-xl relative">
              <div className="absolute inset-0 bg-primary/5 rounded-full animate-ping opacity-20" />
              <Inbox size={32} className="text-muted-foreground" strokeWidth={1.5} />
            </div>
            <h3 className="text-[22px] font-semibold text-foreground mb-3 tracking-tight">Listening for signals</h3>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              As your agents analyze interactions and CRM data, high-fidelity intent signals will stream here automatically.
            </p>
          </motion.div>
        ) : (
          <div className="h-full w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Virtuoso
              data={signals}
              itemContent={renderSignal}
              className="h-full w-full py-6 scrollbar-hide"
              followOutput="auto"
            />
          </div>
        )}
      </div>
    </div>
  );
}
