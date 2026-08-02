"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ChatMessage } from "./ConversationFeed";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VideoCallOverlayProps {
  isOpen: boolean;
  callStatus: "idle" | "connecting" | "active" | "ended" | "error";
  messages: ChatMessage[];
  briefData: {
    companyName: string;
    targetPersona: string;
    painPoints: string[];
    buyingSignals: string[];
  } | null;
  meetingBooked: boolean;
  meetingLink?: string;
  flaggedItems: string[];
  callSummary: string;
  onEndCall: () => void;
  onClose: () => void;
}

// ─── Hook: call duration timer ────────────────────────────────────────────────

function useCallTimer(active: boolean) {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (active) {
      setSeconds(0);
      intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [active]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// ─── Hook: mic waveform ───────────────────────────────────────────────────────

function useMicLevel() {
  const [levels, setLevels] = useState([2, 3, 2, 4, 3, 2, 5, 3]);
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 32;
      src.connect(analyser);
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const bars = Array.from({ length: 8 }, (_, i) => {
          const val = data[Math.floor(i * data.length / 8)] / 255;
          return Math.max(2, Math.round(val * 20));
        });
        setLevels(bars);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      // mic permission denied ? keep static bars
    }
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    setLevels([2, 3, 2, 4, 3, 2, 5, 3]);
  }, []);

  return { levels, start, stop };
}

// ─── Avatar Face ? animated talking head ─────────────────────────────────────

function AvatarFace({ isSpeaking, isConnecting }: { isSpeaking: boolean; isConnecting: boolean }) {
  const [ringScale, setRingScale] = useState(1);
  const [blink, setBlink] = useState(false);
  const [mouthH, setMouthH] = useState(0);

  // Blink
  useEffect(() => {
    const schedule = () => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
      const t = setTimeout(schedule, 2500 + Math.random() * 3000);
      return t;
    };
    const t = setTimeout(schedule, 1500);
    return () => clearTimeout(t);
  }, []);

  // Speaking pulse
  useEffect(() => {
    if (!isSpeaking) { setRingScale(1); setMouthH(0); return; }
    let frame: number;
    const tick = () => {
      const t = Date.now() / 1000;
      setRingScale(1 + Math.abs(Math.sin(t * 3)) * 0.04);
      setMouthH(Math.abs(Math.sin(t * 8)) * 10 + 3);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isSpeaking]);

  return (
    <div className="relative flex items-center justify-center w-full h-full select-none">
      {isSpeaking && (
        <>
          <div className="absolute w-72 h-72 rounded-full border border-indigo-500/20 animate-ping" style={{ animationDuration: "2s" }} />
          <div className="absolute w-80 h-80 rounded-full border border-indigo-400/10 animate-ping" style={{ animationDuration: "2.8s" }} />
        </>
      )}

      <div
        className="relative w-56 h-56 rounded-full bg-gradient-to-b from-[#1e2a4a] to-[#0d1224] border-2 border-indigo-500/40 shadow-[0_0_60px_rgba(99,102,241,0.25)]"
        style={{ transform: `scale(${ringScale})`, transition: "transform 60ms ease" }}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-900/30 via-transparent to-purple-900/20" />
        {isConnecting && (
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-400 animate-spin" />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <div className="flex gap-8 mb-3">
            <div className="w-3 bg-white rounded-full" style={{ height: blink ? "1px" : "12px", transition: "height 80ms" }} />
            <div className="w-3 bg-white rounded-full" style={{ height: blink ? "1px" : "12px", transition: "height 80ms" }} />
          </div>
          <div className="w-10 bg-white/80 rounded-full" style={{ height: `${mouthH}px`, minHeight: 3, transition: "height 60ms ease" }} />
        </div>
        <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-indigo-600 border-2 border-[#080c1a] flex items-center justify-center">
          <span className="text-white text-xs font-bold">J</span>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md rounded-full px-4 py-1.5 border border-white/10">
        <span className="text-white text-sm font-semibold tracking-wide">Armin · AI Agent</span>
      </div>
    </div>
  );
}

// ─── Main overlay ─────────────────────────────────────────────────────────────

export default function VideoCallOverlay({
  isOpen,
  callStatus,
  messages,
  briefData,
  meetingBooked,
  meetingLink,
  flaggedItems,
  callSummary,
  onEndCall,
  onClose,
}: VideoCallOverlayProps) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const { levels, start: startMic, stop: stopMic } = useMicLevel();

  const isActive = callStatus === "active";
  const isConnecting = callStatus === "connecting";
  const isEnded = callStatus === "ended" || callStatus === "error";
  const lastMsg = messages.filter(m => m.role !== "system").at(-1);
  const isSpeaking = isActive && lastMsg?.role === "julian";

  const duration = useCallTimer(isActive);

  useEffect(() => {
    if (messages.length === 1) setTranscriptOpen(true);
  }, [messages.length]);

  useEffect(() => {
    if (isActive) startMic();
    else stopMic();
    return () => stopMic();
  }, [isActive, startMic, stopMic]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages]);

  if (!isOpen) return null;

  const statusColor = isActive
    ? { bg: "rgba(34,197,94,0.15)", border: "rgba(34,197,94,0.4)", text: "rgb(134,239,172)", dot: "rgb(74,222,128)" }
    : isConnecting
    ? { bg: "rgba(251,191,36,0.15)", border: "rgba(251,191,36,0.4)", text: "rgb(253,230,138)", dot: "rgb(251,191,36)" }
    : { bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.4)", text: "rgb(252,165,165)", dot: "rgb(248,113,113)" };

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#080c1a] via-[#0d1224] to-[#080c1a]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08)_0%,transparent_70%)]" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative w-full h-full flex flex-col">

        {/* ── Top bar ── */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide backdrop-blur-md border"
              style={{ background: statusColor.bg, borderColor: statusColor.border, color: statusColor.text }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: statusColor.dot, boxShadow: isActive ? `0 0 6px ${statusColor.dot}` : undefined }}
              />
              {isConnecting ? "Connecting…" : isActive ? `Connected · ${duration}` : "Call Ended"}
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-emerald-400 text-[10px]">✦</span>
              <span className="text-[10px] text-white/50 font-mono tracking-wider">CONFIRMED FACTS ONLY</span>
            </div>
          </div>

          {briefData && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="material-symbols-outlined text-[14px] text-indigo-400">business</span>
              <span className="text-[12px] text-white/80 font-medium">{briefData.companyName}</span>
              <span className="text-white/20 text-[10px] mx-1">·</span>
              <span className="text-[11px] text-white/50 truncate max-w-[160px]">{briefData.targetPersona}</span>
            </div>
          )}
        </div>

        {/* ── Avatar ── */}
        <div className="flex-1 flex items-center justify-center">
          <AvatarFace isSpeaking={!!isSpeaking} isConnecting={isConnecting} />
        </div>

        {/* ── Toasts ── */}
        {meetingBooked && (
          <div className="absolute top-20 right-6 z-30 flex items-center gap-3 px-4 py-3 bg-emerald-500/15 border border-emerald-500/30 backdrop-blur-md rounded-xl">
            <span className="material-symbols-outlined text-emerald-400 text-[20px]">event_available</span>
            <div>
              <div className="text-[12px] font-semibold text-emerald-400">Meeting Booked!</div>
              {meetingLink && (
                <a href={meetingLink} target="_blank" rel="noreferrer" className="text-[11px] text-emerald-300/70 underline">
                  Open in Calendar →
                </a>
              )}
            </div>
          </div>
        )}
        {flaggedItems.length > 0 && (
          <div className="absolute top-20 left-6 z-30 flex items-center gap-3 px-4 py-3 bg-amber-500/15 border border-amber-500/30 backdrop-blur-md rounded-xl max-w-xs">
            <span className="material-symbols-outlined text-amber-400 text-[20px]">flag</span>
            <div>
              <div className="text-[11px] font-semibold text-amber-400">Escalated to Luna</div>
              <div className="text-[10px] text-amber-300/70 truncate max-w-[200px]">{flaggedItems.at(-1)}</div>
            </div>
          </div>
        )}

        {/* ── Transcript side panel ── */}
        <div
          className="absolute top-0 right-0 h-full z-10 flex flex-col"
          style={{ width: transcriptOpen ? "340px" : "0px", transition: "width 300ms ease", overflow: "hidden" }}
        >
          <div className="w-[340px] h-full bg-black/70 backdrop-blur-xl border-l border-white/10 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
              <span className="text-[13px] font-semibold text-white/80">Live Transcript</span>
              <span className="text-[11px] text-white/30 font-mono">{messages.filter(m => m.role !== "system").length} lines</span>
            </div>
            <div ref={transcriptRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(msg => {
                if (msg.role === "system") {
                  // Meeting booked ? prominent card in transcript
                  if (msg.link) {
                    return (
                      <div key={msg.id} className="py-2">
                        <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-3 flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-emerald-400 text-[16px]">event_available</span>
                            <span className="text-[12px] font-semibold text-emerald-400">Meeting Scheduled</span>
                          </div>
                          <p className="text-[10px] text-white/50 leading-relaxed">{msg.content}</p>
                          <a
                            href={msg.link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-semibold rounded-lg transition-all"
                          >
                            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                            {msg.linkText || 'Open in Google Calendar'}
                          </a>
                        </div>
                      </div>
                    );
                  }

                  // Escalation ? amber card
                  if (msg.content.startsWith('🚩')) {
                    return (
                      <div key={msg.id} className="py-1">
                        <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-2.5 flex items-start gap-2">
                          <span className="material-symbols-outlined text-amber-400 text-[14px] mt-0.5 shrink-0">flag</span>
                          <span className="text-[10px] text-amber-300/70 leading-relaxed">{msg.content.replace('🚩 ', '')}</span>
                        </div>
                      </div>
                    );
                  }

                  // Default system message
                  return (
                    <div key={msg.id} className="text-center py-1">
                      <span className="text-[10px] text-white/25 font-mono uppercase">{msg.content}</span>
                    </div>
                  );
                }
                const isArmin = msg.role === "julian";
                return (
                  <div key={msg.id} className={`flex flex-col gap-0.5 ${isArmin ? "items-start" : "items-end"}`}>
                    <span className="text-[10px] text-white/30 font-mono px-1">{isArmin ? "Armin" : "You"} · {msg.timestamp}</span>
                    <div className={`px-3 py-2 rounded-xl text-[13px] leading-relaxed max-w-[90%] ${isArmin ? "bg-indigo-600/20 border border-indigo-500/20 text-white/80" : "bg-white/8 border border-white/10 text-white/70"}`}>
                      {msg.content}
                      {msg.partialContent && <span className="opacity-50">{msg.partialContent}</span>}
                      {msg.isStreaming && <span className="inline-block w-1 h-3 ml-1 bg-indigo-400 opacity-60 animate-pulse" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Self-view / mic ── */}
        <div className="absolute bottom-28 right-6 z-20">
          <div className="w-32 h-20 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center gap-2 shadow-xl">
            <div className="flex items-end gap-0.5 h-8">
              {levels.map((h, i) => (
                <div
                  key={i}
                  className="w-1.5 rounded-full"
                  style={{
                    height: `${muted ? 2 : h}px`,
                    background: muted ? "rgba(239,68,68,0.4)" : `hsl(${240 - i * 8},70%,${55 + i * 3}%)`,
                    transition: "height 75ms ease",
                  }}
                />
              ))}
            </div>
            <span className="text-[9px] text-white/40 font-mono uppercase tracking-wider">{muted ? "Muted" : "You"}</span>
          </div>
        </div>

        {/* ── Bottom controls ── */}
        <div className="absolute bottom-0 left-0 right-0 z-20 flex items-end justify-center gap-4 pb-8">
          <button onClick={() => setTranscriptOpen(o => !o)} className="flex flex-col items-center gap-1">
            <div className={`w-12 h-12 rounded-full backdrop-blur-md border flex items-center justify-center transition-all ${transcriptOpen ? "bg-indigo-500/30 border-indigo-500/50" : "bg-white/10 border-white/20 hover:bg-white/15"}`}>
              <span className="material-symbols-outlined text-white text-[20px]">subtitles</span>
            </div>
            <span className="text-[10px] text-white/40">Transcript</span>
          </button>

          <button onClick={() => setMuted(m => !m)} className="flex flex-col items-center gap-1">
            <div className={`w-12 h-12 rounded-full backdrop-blur-md border flex items-center justify-center transition-all ${muted ? "bg-red-500/30 border-red-500/50" : "bg-white/10 border-white/20 hover:bg-white/15"}`}>
              <span className="material-symbols-outlined text-white text-[20px]">{muted ? "mic_off" : "mic"}</span>
            </div>
            <span className="text-[10px] text-white/40">{muted ? "Unmute" : "Mute"}</span>
          </button>

          {isActive && (
            <button onClick={onEndCall} className="flex flex-col items-center gap-1">
              <div className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 border border-red-400/50 flex items-center justify-center transition-all shadow-[0_0_24px_rgba(239,68,68,0.4)] active:scale-95">
                <span className="material-symbols-outlined text-white text-[26px]">call_end</span>
              </div>
              <span className="text-[10px] text-white/40">End Call</span>
            </button>
          )}

          {isEnded && (
            <button onClick={onClose} className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 flex items-center justify-center transition-all">
                <span className="material-symbols-outlined text-white text-[20px]">arrow_back</span>
              </div>
              <span className="text-[10px] text-white/40">Back</span>
            </button>
          )}
        </div>

        {/* Call summary (after ended) */}
        {callSummary && isEnded && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 max-w-lg px-5 py-3 bg-white/5 border border-white/15 backdrop-blur-md rounded-2xl text-center">
            <div className="text-[11px] text-white/40 uppercase tracking-wider mb-1 font-mono">Call Summary</div>
            <p className="text-[13px] text-white/70 leading-relaxed">{callSummary}</p>
          </div>
        )}
      </div>
    </div>
  );
}
