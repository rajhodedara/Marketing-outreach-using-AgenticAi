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
import { motion } from 'framer-motion';

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
    <div className="h-full flex flex-col overflow-hidden max-w-[1600px] mx-auto bg-gradient-to-br from-background via-background to-muted/20">
      {/* HEADER */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-card/40 backdrop-blur-xl border-b border-border/50 shrink-0 gap-4"
      >
        <div className="flex items-center gap-4">
          <h1 className="text-[24px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[28px]">neurology</span>
              Nova
          </h1>
          <div className="flex items-center gap-2 bg-background/80 px-3 py-1 rounded-full border border-border/50">
              <span className="relative flex h-2 w-2">
              {isSimulating && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isSimulating ? 'bg-primary' : 'bg-muted-foreground'}`}></span>
              </span>
              <span className="text-[11px] font-medium text-muted-foreground font-mono uppercase tracking-wider">
              {isSimulating ? 'Processing' : 'Standby'}
              </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-card/60 border border-border/50 p-2 rounded-lg shadow-sm backdrop-blur-md w-full sm:w-auto">
            <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">Target Account:</span>
            <select 
                className="bg-transparent text-foreground text-sm font-medium focus:outline-none focus:ring-0 min-w-[180px] cursor-pointer"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                disabled={isSimulating}
            >
                <option value="">Select Account...</option>
                {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.company_name || acc.domain}</option>
                ))}
            </select>
        </div>
      </motion.div>

      {/* TABS */}
      <Tabs defaultValue="command" className="flex-1 flex flex-col min-h-0">
        <TabsList variant="line" className="w-full justify-start border-b border-border/50 px-4 bg-card/20 backdrop-blur-sm shrink-0 rounded-none h-12">
          <TabsTrigger value="command" className="h-full flex items-center gap-2 px-4">
            <span className="material-symbols-outlined text-[18px]">terminal</span>
            Command Center
          </TabsTrigger>
          <TabsTrigger value="compose" className="h-full flex items-center gap-2 px-4">
            <span className="material-symbols-outlined text-[18px]">edit_note</span>
            Compose
          </TabsTrigger>
          <TabsTrigger value="sequences" className="h-full flex items-center gap-2 px-4">
            <span className="material-symbols-outlined text-[18px]">conversion_path</span>
            Sequences
          </TabsTrigger>
          <TabsTrigger value="integrations" className="h-full flex items-center gap-2 px-4">
            <span className="material-symbols-outlined text-[18px]">integration_instructions</span>
            Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="command" className="flex-1 min-h-0 m-0">
          <div className="h-full flex flex-col lg:flex-row overflow-hidden">
            {/* LEFT PANEL */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full lg:w-[60%] h-full flex flex-col border-r border-border p-6 bg-card/40 backdrop-blur-xl shadow-lg relative z-10"
            >
              {/* Source Data Preview */}
              <div className="shrink-0 mb-2">
                {sourceData.length > 0 ? (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="text-[11px] font-semibold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                       <span className="material-symbols-outlined text-[14px]">database</span>
                       Ingested Intelligence
                    </div>
                    <SourceDataView sources={sourceData} />
                  </motion.div>
                ) : (
                  <div className="h-[90px] flex items-center justify-center border border-dashed border-border/60 rounded-xl bg-muted/20 text-muted-foreground text-sm backdrop-blur-sm transition-all duration-300 hover:bg-muted/30">
                    No data ingested yet. Select an account and run analysis.
                  </div>
                )}
              </div>

              {/* Agent Feed */}
              <div className="flex-1 flex flex-col min-h-0 bg-background/50 rounded-xl border border-border/50 backdrop-blur-md overflow-hidden shadow-inner mt-4">
                  <AgentFeed events={feedEvents} />
              </div>

              {/* Command Input */}
              <div className="mt-6">
                  <CommandInput 
                    onCommand={startSimulation} 
                    disabled={isSimulating || !selectedAccountId} 
                    placeholder="Command Nova (e.g. 'Synthesize account data and prepare angle')..."
                  />
              </div>
            </motion.div>

            {/* RIGHT PANEL */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-full lg:w-[40%] h-full flex flex-col bg-card/30 backdrop-blur-lg overflow-y-auto relative z-0"
            >
              <div className="p-6 border-b border-border/50 sticky top-0 bg-card/60 backdrop-blur-xl z-20 flex justify-between items-center shadow-sm">
                <h2 className="text-[16px] font-semibold text-foreground flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">account_tree</span>
                  Multi-Agent Pipeline
                </h2>
              </div>

              <div className="flex-1">
                <NovaExecutionGraph steps={steps} />
              </div>

              {/* Outcomes Section */}
              {planData && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 border-t border-border/50 bg-sidebar/80 backdrop-blur-xl shrink-0 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]"
                >
                  <NovaOutput data={planData} />
                </motion.div>
              )}
            </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="compose" className="flex-1 min-h-0 m-0 overflow-y-auto">
          <NovaComposer accountId={selectedAccountId} accountName={selectedAccountName} />
        </TabsContent>

        <TabsContent value="sequences" className="flex-1 min-h-0 m-0 overflow-y-auto">
          <NovaSequences accountId={selectedAccountId} accountName={selectedAccountName} />
        </TabsContent>

        <TabsContent value="integrations" className="flex-1 min-h-0 m-0 overflow-y-auto">
          <NovaIntegrations />
        </TabsContent>
      </Tabs>
    </div>
  );
}
