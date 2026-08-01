"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function AIProcessingView({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const accountId = resolvedParams.id;
  const router = useRouter();

  const [account, setAccount] = useState<{ company_name: string; domain: string } | null>(null);
  const [messages, setMessages] = useState<string[]>([
    "Initializing Agent Swarm architecture...",
    "Allocating research nodes...",
  ]);
  const [progress, setProgress] = useState(5);
  const [activeAgent, setActiveAgent] = useState("Coordinator");

  useEffect(() => {
    startAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startAnalysis = async () => {
    try {
      // Get basic account info first
      const accountRes = await fetch(`/api/accounts/${accountId}`);
      if (accountRes.ok) {
        const data = await accountRes.json();
        setAccount({ company_name: data.company_name || data.domain, domain: data.domain });
      }

      // Trigger analysis
      const res = await fetch(`/api/accounts/${accountId}/analyze`, {
        method: 'POST'
      });
      
      let sessionId = null;
      if (res.ok) {
          const result = await res.json();
          sessionId = result.session_id;
      }
      
      if (sessionId) {
        subscribeToStream(sessionId);
      } else {
        pollStatus(null);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to start analysis");
      setTimeout(() => router.push(`/accounts/${accountId}`), 2000);
    }
  };

  const subscribeToStream = (sessionId: string) => {
    const eventSource = new EventSource(`/api/analysis/${sessionId}/stream`);
    
    eventSource.onmessage = (event) => {
      if (event.data === '[DONE]') {
        eventSource.close();
        setProgress(100);
        toast.success("Analysis Complete");
        setTimeout(() => router.push(`/accounts/${accountId}`), 1000);
        return;
      }
      
      try {
        const data = JSON.parse(event.data);
        setMessages(prev => {
          const next = [...prev, data.message];
          return next.slice(-8);
        });
        if (data.node && data.node !== 'system') {
          setActiveAgent(data.node);
        }
        setProgress(prev => Math.min(prev + 10, 95));
      } catch (err) {
        console.error("Error parsing SSE data", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("EventSource failed", err);
      eventSource.close();
      pollStatus(sessionId); // fallback to polling
    };
  };



  const pollStatus = async (sessionId: string | null) => {
    const pollInterval = setInterval(async () => {
      try {
        if (!sessionId) {
          // fallback
          const res = await fetch(`/api/accounts/${accountId}`);
          if (res.ok) {
            const data = await res.json();
            const status = data.latest_analysis?.status || data.status;
            if (status === 'completed' || status === 'analyzed') {
              clearInterval(pollInterval);
              setProgress(100);
              toast.success("Analysis Complete");
              setTimeout(() => router.push(`/accounts/${accountId}`), 1000);
            } else {
              setProgress(prev => Math.min(prev + Math.random() * 5, 95));
            }
          }
          return;
        }

        const res = await fetch(`/api/analysis/${sessionId}`);
        if (res.ok) {
          const session = await res.json();
          if (session.status === 'completed') {
            clearInterval(pollInterval);
            setProgress(100);
            setMessages(prev => [...prev, "Pipeline execution completed successfully."]);
            toast.success("Analysis Complete");
            setTimeout(() => router.push(`/accounts/${accountId}`), 1000);
          } else if (session.status === 'failed') {
            clearInterval(pollInterval);
            toast.error("Analysis Failed");
            setTimeout(() => router.push(`/accounts/${accountId}`), 1000);
          } else {
            setProgress(prev => Math.min(prev + Math.random() * 5, 95));
          }
        }
      } catch (e) {
        console.error(e);
      }
    }, 2000);
  };

  const cancelAnalysis = () => {
    router.push(`/accounts/${accountId}`);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative min-h-[calc(100vh-6rem)] overflow-hidden bg-[#0A0A0B]">
      
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />

      <div className="w-full max-w-4xl px-6 py-12 flex flex-col items-center relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[36px] leading-[44px] tracking-tight font-semibold text-white mb-3"
          >
            Synthesizing Intelligence
          </motion.h2>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-3"
          >
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[14px]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Target: {account?.company_name || 'Acme Corp'}
            </div>
            <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-[14px]">
              Active Agent: <span className="text-white font-medium">{activeAgent}</span>
            </div>
          </motion.div>
        </div>

        {/* Central Visualization: The "Agent Swarm" Orb */}
        <div className="relative w-64 h-64 mb-16 flex items-center justify-center">
          {/* Outer ring */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border border-primary/30 border-dashed"
          />
          {/* Middle ring */}
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute inset-4 rounded-full border border-blue-400/20"
          />
          {/* Inner core */}
          <div className="absolute inset-12 bg-primary/20 rounded-full backdrop-blur-xl border border-primary/40 flex items-center justify-center shadow-[0_0_40px_rgba(36,81,255,0.4)]">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="material-symbols-outlined text-[48px] text-white">blur_on</span>
            </motion.div>
          </div>
          
          {/* Orbiting nodes representing sub-agents */}
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"
              animate={{
                rotate: [0, 360],
                transformOrigin: "center 128px", // orbit radius
              }}
              style={{
                top: 0,
                left: "calc(50% - 6px)",
              }}
              transition={{
                duration: 5 + i * 2,
                repeat: Infinity,
                ease: "linear",
                delay: i,
              }}
            />
          ))}
        </div>

        {/* Terminal and Progress */}
        <div className="w-full max-w-2xl bg-black/40 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-2xl">
          {/* Progress Bar */}
          <div className="h-1.5 w-full bg-white/5 relative">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-blue-400"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "easeOut" }}
            />
          </div>
          
          {/* Terminal Header */}
          <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
              Agent logs
            </div>
          </div>

          {/* Terminal Output */}
          <div className="p-4 h-[200px] overflow-hidden flex flex-col justify-end">
            <div className="flex flex-col gap-2 font-mono text-[13px] text-green-400/80">
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => (
                  <motion.div
                    key={`${msg}-${idx}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: idx === messages.length - 1 ? 1 : 0.5, x: 0 }}
                    className="flex gap-2"
                  >
                    <span className="text-white/30">{'>'}</span>
                    <span>{msg}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Cancel Action */}
        <button 
          onClick={cancelAnalysis}
          className="mt-8 px-6 py-2 rounded-full bg-white/5 text-white/60 border border-white/10 text-[12px] uppercase tracking-widest font-medium hover:bg-white/10 hover:text-white transition-all"
        >
          Cancel Operation
        </button>
      </div>
    </div>
  );
}
