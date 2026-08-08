"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ExecutionGraph, ExecutionStep } from '@/components/julian/ExecutionGraph';
import { CallBrief, CallBriefData } from '@/components/julian/CallBrief';
import { ConversationFeed, ChatMessage } from '@/components/julian/ConversationFeed';
import VideoCallOverlay from '@/components/julian/VideoCallOverlay';
import {
  startArminCall,
  stopCall,
  onCallStart,
  onCallEnd,
  onTranscript,
  onError,
  offAll,
  CallStatus,
} from '@/lib/vapi';

type Account = {
  id: string;
  domain: string;
  company_name: string | null;
};

const INITIAL_STEPS: ExecutionStep[] = [
  { id: '1', label: 'Load Brief', description: 'Ingest verified facts from Luna', status: 'pending' },
  { id: '2', label: 'Prepare Script', description: 'Configure Armin with verified context', status: 'pending' },
  { id: '3', label: 'Connecting', description: 'Establishing WebRTC voice session', status: 'pending' },
  { id: '4', label: 'In Call', description: 'Executing adaptive voice dialogue', status: 'pending' },
];

export default function ArminWorkspace() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [briefData, setBriefData] = useState<CallBriefData | null>(null);
  const [briefText, setBriefText] = useState<string>('');
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [assistantId, setAssistantId] = useState<string>('');

  // Call state
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [currentCallId, setCurrentCallId] = useState<string>('');
  const [steps, setSteps] = useState<ExecutionStep[]>(INITIAL_STEPS);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [flaggedItems, setFlaggedItems] = useState<string[]>([]);
  const [meetingBooked, setMeetingBooked] = useState(false);
  const [meetingLink, setMeetingLink] = useState<string | undefined>(undefined);
  const [callSummary, setCallSummary] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const [callViewOpen, setCallViewOpen] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  // ─── Data Fetching ───────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/accounts')
      .then(r => r.json())
      .then(d => setAccounts(d.accounts || []))
      .catch(console.error);

    // Pre-fetch Armin assistant ID
    fetch('/api/julian/assistant-id')
      .then(r => r.json())
      .then(d => setAssistantId(d.assistant_id || ''))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedAccountId) { setBriefData(null); setBriefText(''); return; }
    setLoadingBrief(true);
    fetch(`/api/accounts/${selectedAccountId}`)
      .then(r => r.json())
      .then(data => {
        const plan = data.latest_analysis?.result?.account_plan;
        const drafts = data.latest_analysis?.result?.outreach_drafts;
        let persona = drafts?.[0]?.target_persona || 'Unknown';

        const brief: CallBriefData = plan
          ? {
              companyName: data.company_name || data.domain,
              targetPersona: persona,
              painPoints: plan.challenges || [],
              buyingSignals: plan.key_initiatives || [],
            }
          : {
              companyName: data.company_name || data.domain,
              targetPersona: 'Dana Whitfield (VP Operations)',
              painPoints: [
                "High Nursing Turnover ? mentioned 'critical shortage' in last QBR.",
                'Integration Delays ? current API causes 24hr lag.',
              ],
              buyingSignals: ['Q1 budget allocated for workflow automation.'],
            };

        setBriefData(brief);

        // Build brief text string for Vapi variable injection
        const bt =
          `Company: ${brief.companyName}\n` +
          `Target Persona: ${brief.targetPersona}\n` +
          `Pain Points:\n${brief.painPoints.map(p => `- ${p}`).join('\n')}\n` +
          `Buying Signals:\n${brief.buyingSignals.map(s => `- ${s}`).join('\n')}`;
        setBriefText(bt);
      })
      .catch(console.error)
      .finally(() => setLoadingBrief(false));
  }, [selectedAccountId]);

  // ─── WebSocket for live transcript ──────────────────────────────────────

  const connectWebSocket = useCallback((callId: string) => {
    if (wsRef.current) wsRef.current.close();
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/ws/transcript/${callId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected to transcript stream');
      // Keep-alive ping every 25s
      const ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping');
      }, 25000);
      ws.onclose = () => clearInterval(ping);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'call_ended') {
          if (data.data?.summary) setCallSummary(data.data.summary);
        } else if (data.type === 'meeting_booked') {
          setMeetingBooked(true);
          setMeetingLink(data.link);
          addMessage({
            role: 'system',
            content: `📅 Meeting Scheduled: ${data.summary || 'Google Calendar Event'}`,
            link: data.link,
            linkText: 'Open in Google Calendar',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
        } else if (data.type === 'escalation') {
          setFlaggedItems(prev => [...prev, data.question]);
          addMessage({
            role: 'system',
            content: `🚩 Escalated to Luna: "${data.question}"`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
        }
      } catch {}
    };
  }, []);

  // ─── Vapi Event Wiring ──────────────────────────────────────────────────

  const updateStep = (id: string, status: ExecutionStep['status'], result?: string) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status, result } : s));
  };

  const addMessage = (msg: Omit<ChatMessage, 'id'>) => {
    setMessages(prev => {
      if (prev.length > 0) {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg.role === msg.role && msg.role !== 'system') {
          if (msg.isStreaming) {
            return [
              ...prev.slice(0, -1),
              {
                ...lastMsg,
                partialContent: msg.content,
                isStreaming: true,
                timestamp: msg.timestamp
              }
            ];
          } else {
            // Avoid duplicate text if Vapi re-sent the same transcript snippet
            if (lastMsg.content.endsWith(msg.content)) {
              return [
                ...prev.slice(0, -1),
                { ...lastMsg, partialContent: '', isStreaming: false, timestamp: msg.timestamp }
              ];
            }
            return [
              ...prev.slice(0, -1),
              {
                ...lastMsg,
                content: lastMsg.content ? `${lastMsg.content} ${msg.content}` : msg.content,
                partialContent: '',
                isStreaming: false,
                timestamp: msg.timestamp
              }
            ];
          }
        }
      }
      return [...prev, { 
        ...msg, 
        id: Math.random().toString(36).slice(2),
        content: msg.isStreaming ? '' : msg.content,
        partialContent: msg.isStreaming ? msg.content : '',
      }];
    });
  };

  // ─── Start Call ──────────────────────────────────────────────────────────

  const callStartedRef = useRef(false);
  const callEndedRef = useRef(false);

  const handleStartCall = async () => {
    if (!selectedAccountId || !assistantId || !briefText) return;

    // Reset guards
    callStartedRef.current = false;
    callEndedRef.current = false;

    setCallStatus('connecting');
    setSteps(INITIAL_STEPS);
    setMessages([]);
    setFlaggedItems([]);
    setMeetingBooked(false);
    setMeetingLink(undefined);
    setCallSummary('');
    setRetryCount(0);
    setCallViewOpen(true);

    updateStep('1', 'active');
    addMessage({ role: 'system', content: 'Loading verified call brief...', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });

    // Wire up Vapi SDK events (clear previous first)
    offAll();

    onCallStart(() => {
      // Guard: only fire once
      if (callStartedRef.current) return;
      callStartedRef.current = true;

      setCallStatus('active');
      updateStep('1', 'completed');
      updateStep('2', 'completed');
      updateStep('3', 'completed');
      updateStep('4', 'active');
      addMessage({ role: 'system', content: 'WebRTC session established ? Armin is live.', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    });

    onTranscript((msg) => {
      addMessage({
        role: msg.role === 'assistant' ? 'julian' : 'prospect',
        content: msg.text,
        isStreaming: !msg.isFinal,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    });

    onCallEnd(() => {
      // Guard: only fire once
      if (callEndedRef.current) return;
      callEndedRef.current = true;

      setCallStatus('ended');
      updateStep('4', 'completed');
      addMessage({ role: 'system', content: 'Call ended.', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
      if (wsRef.current) wsRef.current.close();
    });

    onError((err) => {
      console.error('[Vapi]', err);
      if (retryCount < 1) {
        setRetryCount(r => r + 1);
        addMessage({ role: 'system', content: 'Connection failed — retrying once...', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
        setTimeout(() => handleStartCall(), 2000);
      } else {
        setCallStatus('error');
        updateStep('3', 'flagged', `Connection failed: ${(err as any)?.message || 'Unknown error'}`);
        addMessage({ role: 'system', content: `❌ Call failed to connect: ${(err as any)?.message || 'Unknown error'}`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
      }
      // Don't auto-retry ? just log. Vapi may recover on its own for non-fatal errors.
    });

    // Show pipeline loading steps
    updateStep('2', 'active');
    await new Promise(r => setTimeout(r, 800));
    updateStep('3', 'active');

    try {
      const callId = await startArminCall(assistantId, briefText);
      if (callId) {
        setCurrentCallId(callId);
        connectWebSocket(callId);
      }
    } catch (err: any) {
      setCallStatus('error');
      updateStep('3', 'flagged', `Failed: ${err?.message}`);
      addMessage({ role: 'system', content: `❌ Failed to start call: ${err?.message}`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    }
  };

  const handleStopCall = () => {
    if (callEndedRef.current) return;
    callEndedRef.current = true;

    stopCall();
    offAll();
    setCallStatus('ended');
    updateStep('4', 'completed');
    addMessage({ role: 'system', content: 'Call stopped by user.', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    if (wsRef.current) wsRef.current.close();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => { offAll(); if (wsRef.current) wsRef.current.close(); };
  }, []);

  const isActive = callStatus === 'active';
  const isConnecting = callStatus === 'connecting';

  return (
    <>
    <div className="h-full flex flex-col lg:flex-row overflow-hidden max-w-[1600px] mx-auto bg-background">
      {/* LEFT PANEL */}
      <div className="w-full lg:w-[60%] h-full flex flex-col border-r border-border p-6 bg-card/30">

        {/* Header & Controls */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-[24px] font-bold text-foreground flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[28px]">record_voice_over</span>
              Armin
            </h1>
            <p className="text-muted-foreground text-[14px]">Voice Outreach Agent · Powered by Vapi + ElevenLabs</p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[12px] text-muted-foreground">Target Account:</span>
            <select
              className="bg-card border border-border text-foreground text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary min-w-[200px]"
              value={selectedAccountId}
              onChange={e => setSelectedAccountId(e.target.value)}
              disabled={isActive || isConnecting}
            >
              <option value="">Select Account...</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.company_name || acc.domain}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Call Brief */}
        <div className="shrink-0 mb-2">
          {loadingBrief ? (
            <div className="h-32 flex items-center justify-center bg-muted/20 border border-border rounded-lg animate-pulse">
              <span className="material-symbols-outlined text-muted-foreground animate-spin">sync</span>
            </div>
          ) : (
            <CallBrief data={briefData} />
          )}
        </div>

        {/* Conversation Feed */}
        <ConversationFeed messages={messages} />

        {/* Call Summary */}
        {callSummary && (
          <div className="mt-4 p-4 bg-muted/20 border border-border rounded-lg">
            <h4 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Call Summary</h4>
            <p className="text-[13px] text-foreground">{callSummary}</p>
          </div>
        )}

        {/* Call Button */}
        <div className="mt-4 flex gap-3">
          {!isActive && !isConnecting ? (
            <button
              onClick={handleStartCall}
              disabled={!selectedAccountId || !assistantId || !briefText || isConnecting}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-primary text-primary-foreground rounded-xl font-semibold text-[15px] hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">video_call</span>
              {assistantId ? `Call ${briefData?.targetPersona?.split(' ')[0] || 'Prospect'}` : 'Loading Armin...'}
            </button>
          ) : (
            <>
              {isConnecting && (
                <div className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-muted border border-border rounded-xl text-muted-foreground font-semibold text-[15px]">
                  <span className="w-2 h-2 rounded-full bg-primary animate-ping mr-1"></span>
                  Connecting to Vapi...
                </div>
              )}
              {isActive && (
                <>
                  <button
                    onClick={() => setCallViewOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-indigo-600 text-white rounded-xl font-semibold text-[15px] hover:bg-indigo-500 transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[20px]">open_in_full</span>
                    View Call
                  </button>
                  <button
                    onClick={handleStopCall}
                    className="flex items-center justify-center gap-2 py-3 px-5 bg-destructive text-destructive-foreground rounded-xl font-semibold text-[15px] hover:bg-destructive/90 transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[20px]">call_end</span>
                  </button>
                </>
              )}
            </>
          )}
        </div>

        {/* Google Calendar OAuth notice */}
        {!isActive && callStatus === 'idle' && (
          <p className="mt-3 text-[11px] text-muted-foreground text-center">
            📅 First time? <a href="/api/google/auth" target="_blank" rel="noreferrer" className="underline hover:text-foreground">Connect Google Calendar</a> so Armin can book meetings.
          </p>
        )}
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-[40%] h-full flex flex-col bg-card overflow-y-auto">
        <div className="p-6 border-b border-border sticky top-0 bg-card z-20 flex justify-between items-center">
          <h2 className="text-[16px] font-semibold text-foreground flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">account_tree</span>
            Execution Pipeline
          </h2>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {isActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isActive ? 'bg-primary' : isConnecting ? 'bg-amber-500' : 'bg-muted-foreground'}`}></span>
            </span>
            <span className="text-[12px] text-muted-foreground font-mono uppercase tracking-wider">
              {isActive ? 'Live' : isConnecting ? 'Connecting' : callStatus === 'ended' ? 'Completed' : 'Standby'}
            </span>
          </div>
        </div>

        <div className="flex-1">
          <ExecutionGraph steps={steps} />
        </div>

        {/* Outcomes */}
        {(flaggedItems.length > 0 || meetingBooked) && (
          <div className="p-6 border-t border-border bg-sidebar shrink-0 space-y-4">
            <h3 className="text-[14px] font-semibold text-foreground uppercase tracking-wider mb-2">Call Outcomes</h3>

            {meetingBooked && (
              <div className="flex items-start gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <span className="material-symbols-outlined text-emerald-400 text-[22px] mt-0.5">event_available</span>
                <div className="flex-1">
                  <div className="text-[14px] font-semibold text-emerald-400">Meeting Booked</div>
                  <div className="text-[12px] text-muted-foreground mt-0.5">Scheduled via Google Calendar</div>
                  {meetingLink && (
                    <a
                      href={meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-[12px] font-semibold rounded-lg transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      Open in Google Calendar
                    </a>
                  )}
                </div>
              </div>
            )}

            {flaggedItems.length > 0 && (
              <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <span className="material-symbols-outlined text-amber-500 text-[20px] mt-0.5">flag</span>
                <div>
                  <div className="text-[14px] font-semibold text-amber-500">Flagged to Luna</div>
                  <div className="text-[12px] text-muted-foreground mt-0.5">Unanswered questions sent for follow-up.</div>
                  <ul className="mt-2 space-y-1">
                    {flaggedItems.map((item, i) => (
                      <li key={i} className="text-[12px] text-foreground font-mono bg-black/20 p-1.5 rounded">{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* API Status */}
        <div className="p-4 border-t border-border text-[11px] text-muted-foreground font-mono space-y-1">
          <div className="flex justify-between">
            <span>Armin Assistant</span>
            <span className={assistantId ? 'text-primary' : 'text-destructive'}>{assistantId ? `✓ ${assistantId.slice(0, 8)}...` : '✗ Not ready'}</span>
          </div>
          <div className="flex justify-between">
            <span>Google Calendar</span>
            <a href="/api/google/auth" target="_blank" rel="noreferrer" className="text-amber-500 underline">Connect →</a>
          </div>
          {currentCallId && (
            <div className="flex justify-between">
              <span>Call ID</span>
              <span className="text-primary">{currentCallId.slice(0, 12)}...</span>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* ── Full-screen video call overlay ── */}
    <VideoCallOverlay
      isOpen={callViewOpen}
      callStatus={callStatus}
      messages={messages}
      briefData={briefData}
      meetingBooked={meetingBooked}
      meetingLink={meetingLink}
      flaggedItems={flaggedItems}
      callSummary={callSummary}
      onEndCall={() => { handleStopCall(); }}
      onClose={() => setCallViewOpen(false)}
    />
  </>);
}
