"use client";

import React, { useState, useEffect } from 'react';
import { NovaExecutionGraph, NovaExecutionStep } from '@/components/nova/NovaExecutionGraph';
import { AgentFeed, FeedEvent } from '@/components/nova/AgentFeed';
import { SourceDataView, SourceData } from '@/components/nova/SourceDataView';
import { CommandInput } from '@/components/julian/CommandInput';
import { NovaOutput, NovaPlanData } from '@/components/nova/NovaOutput';

type Account = {
  id: string;
  domain: string;
  company_name: string | null;
};

// Initial state for execution steps
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

  // Simulation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [steps, setSteps] = useState<NovaExecutionStep[]>(INITIAL_STEPS);
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([]);
  const [sourceData, setSourceData] = useState<SourceData[]>([]);
  const [planData, setPlanData] = useState<NovaPlanData | null>(null);

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

  // Update a specific step's status
  const updateStepStatus = (id: string, status: NovaExecutionStep['status'], result?: string) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status, result } : s));
  };

  const addEvent = (event: Omit<FeedEvent, 'id'>) => {
    setFeedEvents(prev => [...prev, { ...event, id: Math.random().toString(36).substring(7) }]);
  };

  // 2. Start Simulation
  const startSimulation = (command: string) => {
    if (!selectedAccountId) {
      alert("Please select an account first");
      return;
    }

    const account = accounts.find(a => a.id === selectedAccountId);
    const companyName = account?.company_name || account?.domain || 'Unknown';

    setIsSimulating(true);
    setSteps(INITIAL_STEPS);
    setFeedEvents([]);
    setPlanData(null);
    setSourceData([]);

    // Timeline for simulation
    setTimeout(() => {
      updateStepStatus('1', 'active');
      addEvent({ type: 'info', message: `Initializing research protocol for ${companyName}. Commencing data ingestion...`, timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
    }, 500);

    setTimeout(() => {
      setSourceData([
        { type: 'crm', name: 'Salesforce Record', preview: 'Last QBR: Mentioned high turnover rates. Churn risk elevated.' },
        { type: 'transcript', name: 'Gong Call - Oct 12', preview: 'Dana: "Our current API takes 24 hours to sync. It is a nightmare."' },
        { type: 'email', name: 'Thread: Contract Renewal', preview: 'Julian: "Any budget updates?" Dana: "Q1 budget just got approved for workflow automation."' },
        { type: 'web', name: 'Acme Careers Page', preview: 'We are hiring 50+ nurses to combat recent staff shortages.' }
      ]);
      addEvent({ type: 'thought', message: 'Ingested 4 data sources. Synthesizing cross-channel context...', timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
    }, 2000);

    setTimeout(() => {
      updateStepStatus('1', 'completed');
      updateStepStatus('2', 'active');
      addEvent({ type: 'discovery', message: 'Identified primary stakeholder: Dana Whitfield (VP Operations).', timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), source: 'Salesforce Record' });
    }, 4500);

    setTimeout(() => {
      updateStepStatus('2', 'completed');
      updateStepStatus('3', 'active');
      addEvent({ type: 'discovery', message: 'Detected high-priority pain point: 24-hour API sync lag.', timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), source: 'Gong Call - Oct 12' });
      addEvent({ type: 'discovery', message: 'Detected buying signal: Q1 budget approved for workflow automation.', timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), source: 'Email Thread' });
    }, 7000);

    setTimeout(() => {
      updateStepStatus('3', 'completed');
      updateStepStatus('4', 'active');
      addEvent({ type: 'thought', message: 'Drafting account plan and outreach strategy based on extracted constraints.', timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
    }, 10000);

    setTimeout(() => {
      updateStepStatus('4', 'completed');
      updateStepStatus('5', 'active');
      addEvent({ type: 'warning', message: 'Guardrail Check: Verifying claim "You are looking for HIPAA compliant SMS".', timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
    }, 12500);

    setTimeout(() => {
      updateStepStatus('5', 'flagged', 'Hallucination Prevented: HIPAA SMS not found in source data. Removed from plan.');
      addEvent({ type: 'warning', message: 'Claim failed verification. No source data found for HIPAA SMS requirements. Scrubbing from final strategy.', timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
    }, 15000);

    setTimeout(() => {
      updateStepStatus('5', 'completed');
      setIsSimulating(false);
      addEvent({ type: 'info', message: 'Analysis complete. Verified Account Plan generated.', timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
      setPlanData({
        companyName: companyName,
        domain: account?.domain || 'acme.com',
        industry: 'Healthcare / Tech',
        challenges: [
          "High Nursing Turnover (Source: Q3 QBR, Careers Page)",
          "Integration Delays - 24hr API sync lag (Source: Gong Call)"
        ],
        keyInitiatives: [
          "Q1 Budget Allocated for Workflow Automation (Source: Email Thread)"
        ],
        targetPersona: "Dana Whitfield (VP Operations)",
        suggestedAngle: "Lead with the real-time API integration solving their 24-hour lag, tying it to the Q1 workflow automation budget. Mention nursing turnover as a secondary use-case."
      });
    }, 18000);
  };

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden max-w-[1600px] mx-auto bg-background">
      {/* LEFT PANEL */}
      <div className="w-full lg:w-[60%] h-full flex flex-col border-r border-border p-6 bg-card/30">
        
        {/* Header & Controls */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-[24px] font-bold text-foreground flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[28px]">neurology</span>
              Nova
            </h1>
            <p className="text-muted-foreground text-[14px]">Research & Strategy Agent</p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[12px] text-muted-foreground">Target Account:</span>
            <select 
              className="bg-card border border-border text-foreground text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary min-w-[200px]"
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
        </div>

        {/* Source Data Preview */}
        <div className="shrink-0 mb-2">
          {sourceData.length > 0 ? (
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Ingested Source Data</div>
              <SourceDataView sources={sourceData} />
            </div>
          ) : (
            <div className="h-[90px] flex items-center justify-center border border-dashed border-border rounded-lg text-muted-foreground text-sm">
              No data ingested yet. Select an account and run analysis.
            </div>
          )}
        </div>

        {/* Agent Feed */}
        <AgentFeed events={feedEvents} />

        {/* Command Input */}
        <CommandInput 
          onCommand={startSimulation} 
          disabled={isSimulating || !selectedAccountId} 
          placeholder="Command Nova (e.g. 'Run full account analysis and draft strategy')..."
        />
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-[40%] h-full flex flex-col bg-card overflow-y-auto">
        <div className="p-6 border-b border-border sticky top-0 bg-card z-20 flex justify-between items-center">
          <h2 className="text-[16px] font-semibold text-foreground flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">account_tree</span>
            Research Pipeline
          </h2>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {isSimulating && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isSimulating ? 'bg-primary' : 'bg-muted-foreground'}`}></span>
            </span>
            <span className="text-[12px] text-muted-foreground font-mono uppercase tracking-wider">
              {isSimulating ? 'Executing' : 'Standby'}
            </span>
          </div>
        </div>

        <div className="flex-1">
          <NovaExecutionGraph steps={steps} />
        </div>

        {/* Outcomes Section */}
        {planData && (
          <div className="p-6 border-t border-border bg-sidebar shrink-0">
            <NovaOutput data={planData} />
          </div>
        )}
      </div>
    </div>
  );
}
