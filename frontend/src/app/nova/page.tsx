"use client";

import React, { useState, useEffect } from 'react';
import { NovaExecutionGraph, NovaExecutionStep } from '@/components/nova/NovaExecutionGraph';
import { AgentFeed, FeedEvent } from '@/components/nova/AgentFeed';
import { SourceDataView, SourceData } from '@/components/nova/SourceDataView';
import { CommandInput } from '@/components/julian/CommandInput';
import { NovaOutput, NovaPlanData } from '@/components/nova/NovaOutput';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { NovaIntegrations } from '@/components/nova/NovaIntegrations';
import { NovaComposer } from '@/components/nova/NovaComposer';
import { NovaSequences } from '@/components/nova/NovaSequences';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Database, TreeStructure } from '@phosphor-icons/react';

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

const INITIAL_STEPS: NovaExecutionStep[] = [
  { id: '1', label: 'Data Ingestion', description: 'Fetch CRM, call transcripts, emails, and web data', status: 'pending' },
  { id: '2', label: 'Persona Analysis', description: 'Identify target stakeholders and constraints', status: 'pending' },
  { id: '3', label: 'Intent Extraction', description: 'Synthesize pain points and buying signals', status: 'pending' },
  { id: '4', label: 'Strategy Formulation', description: 'Draft verified account plan and outreach angle', status: 'pending' },
  { id: '5', label: 'Fact Check Guardrail', description: 'Verify all claims against source data', status: 'pending' },
];

export default function NovaWorkspace() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Simulation State -> Actual State
  const [isSimulating, setIsSimulating] = useState(false);
  const [steps, setSteps] = useState<NovaExecutionStep[]>(INITIAL_STEPS);
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([]);
  const [sourceData, setSourceData] = useState<SourceData[]>([]);
  const [planData, setPlanData] = useState<NovaPlanData | null>(null);

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

  const updateStepStatus = (id: string, status: NovaExecutionStep['status'], result?: string) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status, result: result || s.result } : s));
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
    
    addEvent({ type: 'info', message: `Sending command to orchestrator: "${command}"` });

    try {
      const startRes = await fetch(`/api/accounts/${selectedAccountId}/analyze`, {
        method: 'POST'
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
                updateStepStatus(stepId, 'active');
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
        const { research, account_plan, outreach_drafts, stakeholders } = data.result;
        
        processSources(research);

        const account = accounts.find(a => a.id === selectedAccountId);

        setPlanData({
          companyName: account?.company_name || 'Unknown',
          domain: account?.domain || 'unknown.com',
          industry: account?.industry || 'Unknown',
          challenges: account_plan?.pain_points?.map((p: any) => p.description) || [],
          keyInitiatives: account_plan?.business_initiatives?.map((i: any) => i.initiative_name) || [],
          targetPersona: stakeholders && stakeholders.length > 0 ? `${stakeholders[0].name} (${stakeholders[0].role})` : "No specific persona identified",
          suggestedAngle: account_plan?.recommended_angle || "Generic outreach angle"
        });
        
        addEvent({ type: 'info', message: 'Final results loaded successfully.' });
      }
    } catch (err) {
      console.error(err);
      addEvent({ type: 'warning', message: 'Failed to load final results.' });
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden w-full font-sans tracking-tight text-zinc-300 bg-[#050505] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/30 via-[#050505] to-[#050505] relative isolate">
      {/* HEADER */}
      <motion.div 
        initial={{ opacity: 0, y: -20, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 shrink-0 gap-4"
      >
        <div className="flex items-center gap-4">
          <h1 className="text-[28px] font-bold text-white flex items-center gap-2 tracking-tighter">
              <Brain weight="light" className="text-white/80 w-8 h-8" />
              Nova
          </h1>
          <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
              <span className="relative flex h-2 w-2">
              {isSimulating && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isSimulating ? 'bg-emerald-400' : 'bg-white/20'}`}></span>
              </span>
              <span className="text-[10px] font-medium text-white/60 font-mono uppercase tracking-[0.2em]">
              {isSimulating ? 'Processing' : 'Standby'}
              </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-2 pl-4 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] backdrop-blur-xl w-full sm:w-auto transition-all hover:bg-white/10">
            <span className="text-[10px] font-medium text-white/50 uppercase tracking-[0.2em] whitespace-nowrap">Target Account</span>
            <select 
                className="bg-transparent text-white text-sm font-medium focus:outline-none focus:ring-0 min-w-[180px] cursor-pointer appearance-none px-2"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                disabled={isSimulating}
            >
                <option value="" className="bg-black text-white">Select Account...</option>
                {accounts.map(acc => (
                <option key={acc.id} value={acc.id} className="bg-black text-white">{acc.company_name || acc.domain}</option>
                ))}
            </select>
        </div>
      </motion.div>

      {/* TABS */}
      <Tabs defaultValue="command" className="flex-1 flex flex-col min-h-0 px-4 md:px-8 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
          className="w-full flex justify-center mb-8 shrink-0 relative z-50"
        >
          <TabsList className="flex h-auto p-1.5 rounded-full border border-white/10 bg-black/40 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] gap-1">
            <TabsTrigger value="command" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white/10 data-[state=active]:text-white text-zinc-400 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] data-[state=active]:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              Command Center
            </TabsTrigger>
            <TabsTrigger value="compose" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white/10 data-[state=active]:text-white text-zinc-400 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] data-[state=active]:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              Compose
            </TabsTrigger>
            <TabsTrigger value="sequences" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white/10 data-[state=active]:text-white text-zinc-400 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] data-[state=active]:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              Sequences
            </TabsTrigger>
            <TabsTrigger value="integrations" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white/10 data-[state=active]:text-white text-zinc-400 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] data-[state=active]:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              Integrations
            </TabsTrigger>
          </TabsList>
        </motion.div>

        {/* DOUBLE-BEZEL OUTER SHELL FOR TAB CONTENT */}
        <div className="flex-1 min-h-0 bg-white/5 border border-white/10 p-1.5 rounded-[2rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] relative overflow-hidden">
          <div className="w-full h-full bg-[#0a0a0a] rounded-[calc(2rem-0.375rem)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden">
            
            <TabsContent value="command" className="h-full m-0 p-0 border-none outline-none">
              <div className="h-full flex flex-col lg:flex-row overflow-hidden">
                {/* LEFT PANEL */}
                <motion.div 
                  initial={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
                  className="w-full lg:w-[60%] h-full flex flex-col border-r border-white/5 p-8 relative z-10"
                >
                  {/* Source Data Preview */}
                  <div className="shrink-0 mb-6">
                    {sourceData.length > 0 ? (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <div className="text-[10px] font-semibold text-white/50 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                           <Database weight="duotone" className="w-4 h-4" />
                           Ingested Intelligence
                        </div>
                        <SourceDataView sources={sourceData} />
                      </motion.div>
                    ) : (
                      <div className="h-[90px] flex items-center justify-center border border-dashed border-white/10 rounded-2xl bg-white/5 text-white/40 text-sm">
                        No data ingested yet. Select an account and run analysis.
                      </div>
                    )}
                  </div>

                  {/* Agent Feed */}
                  <div className="flex-1 flex flex-col min-h-0 bg-black/40 rounded-2xl border border-white/5 backdrop-blur-md overflow-hidden mt-2 relative">
                      <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
                      <AgentFeed events={feedEvents} />
                      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
                  </div>

                  {/* Command Input */}
                  <div className="mt-8">
                      <CommandInput 
                        onCommand={startSimulation} 
                        disabled={isSimulating || !selectedAccountId} 
                        placeholder="Command Nova (e.g. 'Synthesize account data and prepare angle')..."
                      />
                  </div>
                </motion.div>

                {/* RIGHT PANEL */}
                <motion.div 
                  initial={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.7, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
                  className="w-full lg:w-[40%] h-full flex flex-col bg-black/20 overflow-y-auto relative z-0"
                >
                  <div className="p-8 pb-4 sticky top-0 z-20 flex justify-between items-center">
                    <h2 className="text-[12px] font-semibold text-white/50 uppercase tracking-[0.2em] flex items-center gap-2">
                      <TreeStructure weight="duotone" className="w-4 h-4 text-white/40" />
                      Pipeline State
                    </h2>
                  </div>

                  <div className="flex-1 px-4">
                    <NovaExecutionGraph steps={steps} />
                  </div>

                  {/* Outcomes Section */}
                  <AnimatePresence>
                    {planData && (
                      <motion.div 
                        initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
                        transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
                        className="p-8 border-t border-white/5 bg-[#0a0a0a] shrink-0"
                      >
                        <NovaOutput data={planData} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            </TabsContent>

            <TabsContent value="compose" className="h-full m-0 p-8 overflow-y-auto border-none outline-none">
              <NovaComposer accountId={selectedAccountId} accountName={selectedAccountName} />
            </TabsContent>

            <TabsContent value="sequences" className="h-full m-0 p-8 overflow-y-auto border-none outline-none">
              <NovaSequences accountId={selectedAccountId} accountName={selectedAccountName} />
            </TabsContent>

            <TabsContent value="integrations" className="h-full m-0 p-8 overflow-y-auto border-none outline-none">
              <NovaIntegrations />
            </TabsContent>

          </div>
        </div>
      </Tabs>
    </div>
  );
}
