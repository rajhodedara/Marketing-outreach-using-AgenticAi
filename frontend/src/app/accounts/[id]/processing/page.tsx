"use client";

import { useEffect, useState, use, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ---------------------------------------------------------------------------
// Scramble Text — isolated client component (performance)
// ---------------------------------------------------------------------------

const ScrambleText = memo(function ScrambleText({
  text,
  isActive,
}: {
  text: string;
  isActive: boolean;
}) {
  const [displayText, setDisplayText] = useState("");
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  useEffect(() => {
    if (!isActive) {
      setDisplayText(text);
      return;
    }

    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayText(
        text
          .split("")
          .map((letter, index) => {
            if (index < iteration) return text[index];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("")
      );

      if (iteration >= text.length) clearInterval(interval);
      iteration += 1 / 3;
    }, 15);

    return () => clearInterval(interval);
  }, [text, isActive]);

  return <span>{displayText}</span>;
});

// ---------------------------------------------------------------------------
// Orbiting Agent Node — isolated for animation perf
// ---------------------------------------------------------------------------

const AGENTS = [
  { name: "Coordinator", icon: "hub" },
  { name: "Researcher", icon: "search" },
  { name: "Analyst", icon: "analytics" },
  { name: "Strategist", icon: "psychology" },
  { name: "Writer", icon: "edit_note" },
];

const OrbitNode = memo(function OrbitNode({
  agent,
  index,
  isActive,
  onClick,
}: {
  agent: { name: string; icon: string };
  index: number;
  isActive: boolean;
  onClick: () => void;
}) {
  // Position nodes in a circle using static angles
  const angle = (2 * Math.PI * index) / AGENTS.length - Math.PI / 2;
  const radius = 115;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  return (
    <motion.button
      title={`${agent.name} Agent`}
      className="absolute flex flex-col items-center gap-1 z-10 group"
      style={{
        left: `calc(50% + ${x}px - 24px)`,
        top: `calc(50% + ${y}px - 24px)`,
      }}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
    >
      {/* Node circle */}
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
          isActive
            ? "bg-primary/20 border-primary shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            : "bg-secondary border-border hover:border-muted-foreground/40"
        }`}
      >
        <span
          className={`material-symbols-outlined text-[18px] transition-colors duration-300 ${
            isActive ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {agent.icon}
        </span>
      </div>

      {/* Label */}
      <span
        className={`text-[9px] tracking-[0.06em] uppercase font-semibold transition-colors duration-300 ${
          isActive ? "text-primary" : "text-muted-foreground/60"
        }`}
      >
        {agent.name}
      </span>

      {/* Active pulse ring */}
      {isActive && (
        <motion.div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-11 h-11 rounded-full border border-primary"
          animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </motion.button>
  );
});

// ---------------------------------------------------------------------------
// Main Processing View
// ---------------------------------------------------------------------------

export default function AIProcessingView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const accountId = resolvedParams.id;
  const router = useRouter();

  const [account, setAccount] = useState<{
    company_name: string;
    domain: string;
  } | null>(null);
  const [messages, setMessages] = useState<string[]>([
    "Initializing Agent Swarm architecture...",
    "Allocating research nodes...",
  ]);
  const [progress, setProgress] = useState(5);
  const [activeAgent, setActiveAgent] = useState("Coordinator");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    startAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startAnalysis = async () => {
    try {
      const accountRes = await fetch(`/api/accounts/${accountId}`);
      if (accountRes.ok) {
        const data = await accountRes.json();
        setAccount({
          company_name: data.company_name || data.domain,
          domain: data.domain,
        });
      }

      const res = await fetch(`/api/accounts/${accountId}/analyze`, {
        method: "POST",
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
      setFailed(true);
      toast.error("Failed to start analysis");
    }
  };

  const subscribeToStream = (sessionId: string) => {
    const eventSource = new EventSource(`/api/analysis/${sessionId}/stream`);

    eventSource.onmessage = (event) => {
      if (event.data === "[DONE]") {
        eventSource.close();
        setProgress(100);
        toast.success("Analysis Complete");
        setTimeout(() => router.push(`/accounts/${accountId}`), 1200);
        return;
      }

      try {
        const data = JSON.parse(event.data);
        setMessages((prev) => {
          const next = [...prev, data.message];
          return next.slice(-8);
        });
        if (data.node && data.node !== "system") {
          setActiveAgent(data.node);
        }
        setProgress((prev) => Math.min(prev + 10, 95));
      } catch (err) {
        console.error("Error parsing SSE data", err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      pollStatus(sessionId);
    };
  };

  const pollStatus = useCallback(
    async (sessionId: string | null) => {
      const interval = setInterval(async () => {
        try {
          if (!sessionId) {
            const res = await fetch(`/api/accounts/${accountId}`);
            if (res.ok) {
              const data = await res.json();
              const s = data.latest_analysis?.status || data.status;
              if (s === "completed" || s === "analyzed") {
                clearInterval(interval);
                setProgress(100);
                toast.success("Analysis Complete");
                setTimeout(
                  () => router.push(`/accounts/${accountId}`),
                  1200
                );
              } else if (s === "failed") {
                clearInterval(interval);
                setFailed(true);
              } else {
                setProgress((prev) =>
                  Math.min(prev + Math.random() * 5, 95)
                );
              }
            }
            return;
          }

          const res = await fetch(`/api/analysis/${sessionId}`);
          if (res.ok) {
            const session = await res.json();
            if (session.status === "completed") {
              clearInterval(interval);
              setProgress(100);
              setMessages((prev) => [
                ...prev,
                "Pipeline execution completed successfully.",
              ]);
              toast.success("Analysis Complete");
              setTimeout(
                () => router.push(`/accounts/${accountId}`),
                1200
              );
            } else if (session.status === "failed") {
              clearInterval(interval);
              setFailed(true);
              toast.error("Analysis Failed");
            } else {
              setProgress((prev) =>
                Math.min(prev + Math.random() * 5, 95)
              );
            }
          }
        } catch (e) {
          console.error(e);
        }
      }, 2000);
    },
    [accountId, router]
  );

  const cancelAnalysis = () => {
    router.push(`/accounts/${accountId}`);
  };

  const progressPercent = Math.round(progress);

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative min-h-[100dvh] overflow-hidden bg-background">
      {/* Ambient glow — fixed, pointer-events-none, no scroll repaint */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/15 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -30, 0] }}
          transition={{ duration: 18, repeat: Infinity }}
          className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-primary/8 rounded-full blur-[80px]"
        />
      </div>

      <div className="w-full max-w-3xl px-6 py-10 flex flex-col items-center relative z-10">
        {/* --------------------------------------------------------------- */}
        {/* Header                                                          */}
        {/* --------------------------------------------------------------- */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-[28px] md:text-[34px] leading-[40px] tracking-tight font-semibold text-foreground mb-4">
            Synthesizing Intelligence
          </h2>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            {/* Target pill */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary border border-border text-foreground text-[13px]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              {account?.company_name || "Loading..."}
            </div>

            {/* Active agent pill */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[13px] font-medium">
              <span className="material-symbols-outlined text-[14px]">
                memory
              </span>
              <ScrambleText text={activeAgent} isActive={true} />
            </div>
          </div>
        </motion.div>

        {/* --------------------------------------------------------------- */}
        {/* Agent Swarm Orb                                                 */}
        {/* --------------------------------------------------------------- */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative w-[280px] h-[280px] mb-12 flex items-center justify-center"
        >
          {/* Outer orbit ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border border-border/50 border-dashed"
          />

          {/* Inner orbit ring */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
            className="absolute inset-8 rounded-full border border-primary/10"
          />

          {/* Core orb */}
          <div className="absolute inset-16 rounded-full bg-card border border-border flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.08)] overflow-hidden">
            {/* Subtle inner glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent rounded-full pointer-events-none" />

            <motion.div
              animate={{
                rotateX: [0, 8, -8, 0],
                rotateY: [0, 12, -12, 0],
              }}
              transition={{ duration: 8, repeat: Infinity }}
              className="z-10"
            >
              <span className="material-symbols-outlined text-[40px] text-primary/80">
                blur_on
              </span>
            </motion.div>
          </div>

          {/* Agent nodes */}
          {AGENTS.map((agent, i) => (
            <OrbitNode
              key={agent.name}
              agent={agent}
              index={i}
              isActive={activeAgent === agent.name}
              onClick={() => {
                setActiveAgent(agent.name);
                toast.success(`Focusing on ${agent.name} agent...`);
              }}
            />
          ))}
        </motion.div>

        {/* --------------------------------------------------------------- */}
        {/* Progress Bar + Terminal                                          */}
        {/* --------------------------------------------------------------- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="w-full max-w-2xl"
        >
          {/* Progress section */}
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
              Pipeline Progress
            </span>
            <span className="text-[13px] font-mono font-semibold text-foreground tabular-nums">
              {progressPercent}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden mb-6">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Terminal card */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            {/* Terminal header */}
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-primary/80" />
              </div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Live Feed
              </div>
            </div>

            {/* Terminal output */}
            <div className="p-4 h-[200px] relative overflow-hidden flex flex-col justify-end">
              {/* Top fade mask */}
              <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-card to-transparent z-10 pointer-events-none" />

              <div className="flex flex-col gap-2.5 font-mono text-[12px] relative z-0">
                <AnimatePresence initial={false}>
                  {messages.map((msg, idx) => {
                    const isLatest = idx === messages.length - 1;
                    return (
                      <motion.div
                        key={`${msg}-${idx}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{
                          opacity: isLatest
                            ? 1
                            : Math.max(
                                0.15,
                                1 - (messages.length - idx) * 0.15
                              ),
                          x: 0,
                        }}
                        transition={{ duration: 0.25 }}
                        className="flex gap-2"
                      >
                        <span className="text-primary/40 select-none shrink-0">
                          {">"}
                        </span>
                        <span
                          className={`tracking-tight ${
                            isLatest
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        >
                          <ScrambleText text={msg} isActive={isLatest} />
                        </span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>

        {/* --------------------------------------------------------------- */}
        {/* Error State                                                     */}
        {/* --------------------------------------------------------------- */}
        <AnimatePresence>
          {failed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8 w-full max-w-2xl bg-destructive/10 border border-destructive/20 rounded-xl p-5 flex items-start gap-3"
            >
              <span className="material-symbols-outlined text-[20px] text-destructive mt-0.5">
                error
              </span>
              <div className="flex-1">
                <p className="text-[14px] font-medium text-foreground mb-1">
                  Analysis pipeline failed
                </p>
                <p className="text-[13px] text-muted-foreground mb-3">
                  An error occurred during processing. You can retry or return
                  to the account view.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setFailed(false);
                      setProgress(5);
                      setMessages(["Retrying analysis pipeline..."]);
                      startAnalysis();
                    }}
                    className="h-8 px-4 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5 active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      refresh
                    </span>
                    Retry
                  </button>
                  <button
                    onClick={cancelAnalysis}
                    className="h-8 px-4 rounded-lg bg-secondary text-secondary-foreground text-[12px] font-medium border border-border hover:bg-muted transition-colors active:scale-[0.98]"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --------------------------------------------------------------- */}
        {/* Cancel / Abort                                                  */}
        {/* --------------------------------------------------------------- */}
        {!failed && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            onClick={cancelAnalysis}
            className="mt-10 px-5 py-2 rounded-lg bg-secondary text-muted-foreground border border-border text-[11px] uppercase tracking-widest font-semibold hover:bg-muted hover:text-foreground transition-all duration-200 active:scale-[0.97]"
          >
            Abort Sequence
          </motion.button>
        )}
      </div>
    </div>
  );
}
