"use client";

import React, { useState, useEffect } from 'react';
import { LunaExecutionGraph, LunaExecutionStep } from '@/components/nova/LunaExecutionGraph';
import { AgentFeed, FeedEvent } from '@/components/nova/AgentFeed';
import { SourceDataView, SourceData } from '@/components/nova/SourceDataView';
import { CommandInput } from '@/components/julian/CommandInput';
import { LunaOutput, LunaPlanData } from '@/components/nova/LunaOutput';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LunaIntegrations } from '@/components/nova/LunaIntegrations';
import { LunaComposer } from '@/components/nova/LunaComposer';
import { LunaSequences } from '@/components/nova/LunaSequences';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Database, TreeStructure, Globe } from '@phosphor-icons/react';
import Link from 'next/link';

type Account = {
  id: string;
  domain: string;
  company_name: string | null;
  industry?: string;
};

// Map nodes to visual steps
const NODE_TO_STEP_ID: Record<string, string> = {
  supervisor: '1',
  research: '1',
  persona: '2',
  intent: '3',
  action: '4',
  critic: '5',
  strip: '5'
};

const INITIAL_STEPS: LunaExecutionStep[] = [
  { id: '1', label: 'Data Ingestion', description: 'Fetch CRM, call transcripts, emails, and web data', status: 'pending' },
  { id: '2', label: 'Persona Analysis', description: 'Identify target stakeholders and constraints', status: 'pending' },
  { id: '3', label: 'Intent Extraction', description: 'Synthesize pain points and buying signals', status: 'pending' },
  { id: '4', label: 'Strategy Formulation', description: 'Draft verified account plan and outreach angle', status: 'pending' },
  { id: '5', label: 'Fact Check Guardrail', description: 'Verify all claims against source data', status: 'pending' },
];

export default function LunaWorkspace() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Simulation State -> Actual State
  const [isSimulating, setIsSimulating] = useState(false);
  const [steps, setSteps] = useState<LunaExecutionStep[]>(INITIAL_STEPS);
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([]);
  const [sourceData, setSourceData] = useState<SourceData[]>([]);
  const [planData, setPlanData] = useState<LunaPlanData | null>(null);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const selectedAccountName = selectedAccount?.company_name || selectedAccount?.domain || '';

  // 1. Fetch Accounts on mount
  useEffect(() => {
    fetch('/api/accounts')
      .then(res => res.json())
      .then(data => {
        setAccounts(data.accounts || []);
      })
      .catch(console.error)
      .finally(() => setLoadingAccounts(false));
  }, []);

  const updateStepStatus = (id: string, status: LunaExecutionStep['status'], result?: string, append: boolean = false) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status, result: result ? (append ? (s.result ? s.result + '\n' + result : result) : result) : s.result } : s));
  };

  const addEvent = (event: Omit<FeedEvent, 'id' | 'timestamp'>) => {
    setFeedEvents(prev => [...prev, { ...event, id: Math.random().toString(36).substring(7), timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) }]);
  };

  // Extract sources from research data
  const processSources = (researchData: any) => {
    if (!researchData) return;
    const newSources: SourceData[] = [];
    if (researchData.crm_context) newSources.push({ type: 'crm', name: 'CRM Data', preview: JSON.stringify(researchData.crm_context).substring(0, 80) + '...' });
    if (researchData.website_content) newSources.push({ type: 'web', name: 'Website Content', preview: researchData.website_content.substring(0, 80) + '...' });
    if (researchData.recent_news) newSources.push({ type: 'web', name: 'Recent News', preview: typeof researchData.recent_news === 'string' ? researchData.recent_news.substring(0, 80) + '...' : 'News data' });
    setSourceData(newSources);
  };

  // 2. Start Real Analysis
  const startSimulation = async (command: string) => {
    if (!selectedAccountId) {
      alert("Please select an account first");
      return;
    }

    setIsSimulating(true);
    setSteps(INITIAL_STEPS);
    setFeedEvents([]);
    setPlanData(null);
    setSourceData([]);
    
    addEvent({ type: 'user', message: command });

    try {
      const startRes = await fetch(`/api/accounts/${selectedAccountId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ command })
      });

      if (!startRes.ok) {
        if (startRes.status === 409) {
            addEvent({ type: 'warning', message: 'An analysis is already running for this account.'});
            setIsSimulating(false);
            return;
        }
        throw new Error("Failed to start analysis");
      }

      const { session_id } = await startRes.json();
      addEvent({ type: 'info', message: `Session created (${session_id}). Connecting to agent swarm...` });

      // Connect to SSE stream
      const eventSource = new EventSource(`/api/analysis/${session_id}/stream`);

      eventSource.onmessage = (e) => {
        if (e.data === '[DONE]') {
          eventSource.close();
          finishAnalysis(session_id);
          return;
        }

        try {
          const parsed = JSON.parse(e.data);
          const nodeName = parsed.node;
          const msg = parsed.message;
          
          let eventType: FeedEvent['type'] = 'thought';
          if (nodeName === 'critic' || nodeName === 'strip') eventType = 'warning';
          if (nodeName === 'system') eventType = 'info';
          if (msg.toLowerCase().includes('found') || msg.toLowerCase().includes('identified')) eventType = 'discovery';

          addEvent({ type: eventType, message: msg, source: nodeName !== 'system' ? `Agent: ${nodeName}` : undefined });

          // Update graph
          if (nodeName && NODE_TO_STEP_ID[nodeName]) {
            const stepId = NODE_TO_STEP_ID[nodeName];
            
            // Mark previous steps as completed
            setSteps(prev => prev.map(s => {
                if (parseInt(s.id) < parseInt(stepId) && s.status !== 'completed') {
                    return { ...s, status: 'completed' };
                }
                return s;
            }));

            if (nodeName === 'strip') {
                updateStepStatus(stepId, 'flagged', 'Hallucinations found and stripped');
            } else {
                updateStepStatus(stepId, 'active', msg, true);
            }
          }

        } catch (err) {
          console.error("Failed to parse SSE message", err);
        }
      };

      eventSource.onerror = (err) => {
        console.error("EventSource failed:", err);
        eventSource.close();
        addEvent({ type: 'warning', message: 'Lost connection to agent stream.' });
        setIsSimulating(false);
      };

    } catch (err: any) {
      addEvent({ type: 'warning', message: err.message });
      setIsSimulating(false);
    }
  };

  const finishAnalysis = async (sessionId: string) => {
    setIsSimulating(false);
    setSteps(prev => prev.map(s => s.status === 'active' || s.status === 'pending' ? { ...s, status: 'completed' } : s));
    addEvent({ type: 'info', message: 'Analysis stream completed. Fetching final structured results...' });

    try {
      const res = await fetch(`/api/analysis/${sessionId}`);
      const data = await res.json();
      
      if (data.result) {
        const { research, account_plan, outreach_drafts, stakeholders, intent, custom_response } = data.result;
        
        processSources(research);

        const account = accounts.find(a => a.id === selectedAccountId);

        setPlanData({
          companyName: account?.company_name?.trim() || 'Unknown',
          domain: account?.domain?.trim() || 'unknown.com',
          industry: account?.industry?.trim() || 'Unknown',
          challenges: stakeholders && stakeholders.length > 0 && stakeholders[0].key_concerns ? stakeholders[0].key_concerns : [],
          keyInitiatives: intent?.signals?.map((s: any) => `${s.signal_type}: ${s.description}`) || [],
          targetPersona: stakeholders && stakeholders.length > 0 ? `${stakeholders[0].name} (${stakeholders[0].role})` : "No specific persona identified",
          suggestedAngle: account_plan?.strategy_summary || "Generic outreach angle",
          customResponse: custom_response || undefined
        });
        
        addEvent({ type: 'info', message: 'Final results loaded successfully.' });
      }
    } catch (err) {
      console.error(err);
      addEvent({ type: 'warning', message: 'Failed to load final results.' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col w-full font-sans tracking-tight text-zinc-300 bg-[#050505] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/30 via-[#050505] to-[#050505] relative isolate">
      {/* Noise Texture */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.04] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
      
      {/* HEADER */}
      <motion.div 
        initial={{ opacity: 0, y: -20, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 shrink-0 gap-4 relative z-10"
      >
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
          <h1 className="text-[24px] sm:text-[28px] font-bold text-white flex items-center gap-2 tracking-tighter">
              <Brain weight="light" className="text-white/80 w-7 h-7 sm:w-8 sm:h-8" />
              Luna
          </h1>
          <div className="flex items-center gap-2 bg-white/[0.03] backdrop-blur-md px-3 py-1.5 rounded-full border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] group">
              <span className="relative flex h-2 w-2">
                {isSimulating && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2 w-2 shadow-[0_0_8px_rgba(0,0,0,0.8)] ${isSimulating ? 'bg-emerald-400 shadow-emerald-400/50' : 'bg-white/30 group-hover:bg-white/50 transition-colors'}`}></span>
              </span>
              <span className="text-[9px] sm:text-[10px] font-medium text-white/60 font-mono uppercase tracking-[0.2em]">
                {isSimulating ? 'Processing' : 'Standby'}
              </span>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <Link href="/nova/search">
            <motion.button
              whileHover={{ scale: 1.02, filter: "brightness(1.2)" }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/10 hover:from-emerald-500/30 hover:to-teal-500/20 border border-emerald-500/30 text-emerald-400 px-4 py-2 w-full sm:w-auto rounded-full text-[11px] sm:text-xs font-semibold tracking-wide shadow-[0_0_15px_rgba(16,185,129,0.15)] uppercase"
            >
              <Globe weight="duotone" className="w-4 h-4" />
              Live Web Search
            </motion.button>
          </Link>
          <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.08] p-2 pl-4 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] backdrop-blur-xl transition-all hover:bg-white/[0.08] group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out pointer-events-none" />
            <span className="text-[9px] sm:text-[10px] font-medium text-white/50 uppercase tracking-[0.2em] whitespace-nowrap">Target Account</span>
            <select 
                className="bg-transparent text-white text-sm font-medium focus:outline-none focus:ring-0 min-w-[140px] sm:min-w-[180px] cursor-pointer appearance-none px-2 pr-6"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                disabled={isSimulating}
            >
                <option value="" className="bg-zinc-900 text-white">Select Account...</option>
                {accounts.map(acc => (
                <option key={acc.id} value={acc.id} className="bg-zinc-900 text-white">{acc.company_name || acc.domain}</option>
                ))}
            </select>
            {/* Custom chevron to replace default select arrow */}
            <div className="absolute right-4 pointer-events-none text-white/40 group-hover:text-white/70 transition-colors">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
        </div>
        </div>
      </motion.div>

      {/* TABS */}
      <Tabs defaultValue="command" className="flex-1 flex flex-col px-2 sm:px-4 md:px-8 pb-4 sm:pb-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
          className="w-full flex justify-start sm:justify-center mb-4 sm:mb-8 shrink-0 relative z-50 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-2 sm:pb-0 sticky top-4"
        >
          <TabsList className="flex w-max sm:w-auto h-auto p-1 sm:p-1.5 rounded-full border border-white/[0.08] bg-black/40 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] gap-1 mx-2 sm:mx-0">
            <TabsTrigger value="command" className="rounded-full px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm data-[state=active]:bg-white/10 data-[state=active]:text-white text-zinc-400 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] data-[state=active]:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              Command Center
            </TabsTrigger>
            <TabsTrigger value="compose" className="rounded-full px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm data-[state=active]:bg-white/10 data-[state=active]:text-white text-zinc-400 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] data-[state=active]:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              Compose
            </TabsTrigger>
            <TabsTrigger value="sequences" className="rounded-full px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm data-[state=active]:bg-white/10 data-[state=active]:text-white text-zinc-400 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] data-[state=active]:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              Sequences
            </TabsTrigger>
            <TabsTrigger value="integrations" className="rounded-full px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm data-[state=active]:bg-white/10 data-[state=active]:text-white text-zinc-400 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] data-[state=active]:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              Integrations
            </TabsTrigger>
          </TabsList>
        </motion.div>

        {/* TAB CONTENT AREA */}
        <div className="flex-1 w-full relative z-10 flex flex-col">
          <div className="w-full relative z-10 flex flex-col">
            
            <TabsContent value="command" className="flex-1 m-0 p-0 border-none outline-none">
              <div className="flex flex-col lg:flex-row gap-4 sm:gap-8 items-start">
                {/* LEFT PANEL */}
                  <motion.div 
                    initial={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
                    className="w-full lg:w-[60%] flex flex-col p-6 sm:p-8 relative z-10 shrink-0 bg-[#0a0a0a]/90 backdrop-blur-3xl border border-white/[0.08] rounded-3xl md:rounded-[2.5rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),_0_30px_80px_-20px_rgba(0,0,0,0.7)]"
                  >
                  {/* Source Data Preview */}
                  <div className="shrink-0 mb-4 sm:mb-6">
                    {sourceData.length > 0 ? (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <div className="text-[9px] sm:text-[10px] font-semibold text-white/50 uppercase tracking-[0.2em] mb-3 sm:mb-4 flex items-center gap-2">
                           <Database weight="duotone" className="w-4 h-4" />
                           Ingested Intelligence
                        </div>
                        <SourceDataView sources={sourceData} />
                      </motion.div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        className="h-[70px] sm:h-[90px] flex items-center justify-center rounded-2xl bg-gradient-to-r from-white/[0.01] to-white/[0.04] border border-white/[0.05] text-white/40 text-xs sm:text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] relative overflow-hidden group"
                      >
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2220%22 height=%2220%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath d=%22M1 1h2v2H1V1zm4 4h2v2H5V5zm4 4h2v2H9V9z%22 fill=%22rgba(255,255,255,0.02)%22 fill-rule=%22evenodd%22/%3E%3C/svg%3E')] opacity-50 pointer-events-none" />
                        <div className="flex items-center gap-3 relative z-10">
                          <Database weight="duotone" className="w-4 h-4 sm:w-5 sm:h-5 text-white/30 group-hover:text-white/50 transition-colors" />
                          <span className="font-medium tracking-wide">No intelligence loaded. Select an account to begin.</span>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Agent Feed */}
                  <div className="flex-1 flex flex-col min-h-0 mt-2 relative">
                      <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
                      <AgentFeed events={feedEvents} isSimulating={isSimulating} />
                      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
                  </div>

                  {/* Outcomes Section (Premium Card) */}
                  <AnimatePresence>
                    {planData && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="mt-6 flex flex-col gap-2 relative z-10"
                      >
                        <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
                           Result
                        </div>
                        <LunaOutput data={planData} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Command Input */}
                  <div className="mt-4 sm:mt-6 shrink-0">
                      <CommandInput 
                        onCommand={startSimulation} 
                        disabled={isSimulating || !selectedAccountId} 
                        placeholder="Command Luna (e.g. 'Synthesize account data...')"
                      />
                  </div>
                </motion.div>

                {/* RIGHT PANEL */}
                <motion.div 
                  initial={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.7, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
                  className="w-full lg:w-[40%] flex flex-col bg-gradient-to-bl from-white/[0.02] to-[#0a0a0a]/90 backdrop-blur-3xl border border-white/[0.08] rounded-3xl md:rounded-[2.5rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),_0_30px_80px_-20px_rgba(0,0,0,0.7)] relative z-0 shrink-0 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                >
                  <div className="p-6 sm:p-8 pb-4 flex justify-between items-center shrink-0">
                    <h2 className="text-[10px] sm:text-[12px] font-semibold text-white/50 uppercase tracking-[0.2em] flex items-center gap-2">
                      <TreeStructure weight="duotone" className="w-4 h-4 text-white/40" />
                      Pipeline State
                    </h2>
                  </div>

                  <div className="flex-1 px-4 sm:px-6">
                    <LunaExecutionGraph steps={steps} />
                  </div>
                </motion.div>
              </div>
            </TabsContent>

            <TabsContent value="compose" className="flex-1 m-0 p-6 sm:p-8 outline-none bg-[#0a0a0a]/90 backdrop-blur-3xl border border-white/[0.08] rounded-3xl md:rounded-[2.5rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),_0_30px_80px_-20px_rgba(0,0,0,0.7)]">
              <LunaComposer accountId={selectedAccountId} accountName={selectedAccountName} />
            </TabsContent>

            <TabsContent value="sequences" className="flex-1 m-0 p-6 sm:p-8 outline-none bg-[#0a0a0a]/90 backdrop-blur-3xl border border-white/[0.08] rounded-3xl md:rounded-[2.5rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),_0_30px_80px_-20px_rgba(0,0,0,0.7)]">
              <LunaSequences accountId={selectedAccountId} accountName={selectedAccountName} />
            </TabsContent>

            <TabsContent value="integrations" className="flex-1 m-0 p-6 sm:p-8 outline-none bg-[#0a0a0a]/90 backdrop-blur-3xl border border-white/[0.08] rounded-3xl md:rounded-[2.5rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),_0_30px_80px_-20px_rgba(0,0,0,0.7)]">
              <LunaIntegrations />
            </TabsContent>

          </div>
        </div>
      </Tabs>
    </div>
  );
}
