"use client";

import React, { useState, useEffect } from 'react';
import { ExecutionGraph, ExecutionStep } from '@/components/julian/ExecutionGraph';
import { CallBrief, CallBriefData } from '@/components/julian/CallBrief';
import { ConversationFeed, ChatMessage } from '@/components/julian/ConversationFeed';
import { CommandInput } from '@/components/julian/CommandInput';

type Account = {
  id: string;
  domain: string;
  company_name: string | null;
};

// Define initial graph steps
const INITIAL_STEPS: ExecutionStep[] = [
  { id: '1', label: 'Load Brief', description: 'Ingest verified facts from Nova', status: 'pending' },
  { id: '2', label: 'Analyze Stakeholder', description: 'Extract persona context and constraints', status: 'pending' },
  { id: '3', label: 'Prepare Script', description: 'Generate dynamic conversation branches', status: 'pending' },
  { id: '4', label: 'Dialing', description: 'Connecting to prospect', status: 'pending' },
  { id: '5', label: 'In Call', description: 'Executing adaptive voice dialogue', status: 'pending' },
];

export default function JulianWorkspace() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  
  const [briefData, setBriefData] = useState<CallBriefData | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);

  // Simulation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [steps, setSteps] = useState<ExecutionStep[]>(INITIAL_STEPS);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [flaggedItems, setFlaggedItems] = useState<string[]>([]);
  const [meetingBooked, setMeetingBooked] = useState(false);

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

  // 2. Fetch Brief Data when account changes
  useEffect(() => {
    if (!selectedAccountId) {
      setBriefData(null);
      return;
    }
    
    setLoadingBrief(true);
    fetch(`/api/accounts/${selectedAccountId}`)
      .then(res => res.json())
      .then(data => {
        const plan = data.latest_analysis?.result?.account_plan;
        const drafts = data.latest_analysis?.result?.outreach_drafts;
        
        let persona = "Unknown";
        if (drafts && drafts.length > 0) {
          persona = drafts[0].target_persona;
        }

        if (plan) {
          setBriefData({
            companyName: data.company_name || data.domain,
            targetPersona: persona,
            painPoints: plan.challenges || [],
            buyingSignals: plan.key_initiatives || []
          });
        } else {
          // Mock data if no analysis exists
          setBriefData({
            companyName: data.company_name || data.domain,
            targetPersona: "Dana Whitfield (VP Operations)",
            painPoints: [
              "High Nursing Turnover - Mentioned 'critical shortage' in last two QBRs.",
              "Integration Delays - Current API limitations causing 24hr lag."
            ],
            buyingSignals: [
              "Budget Allocation Confirmed - Earmarked funds in the Q1 budget."
            ]
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoadingBrief(false));
  }, [selectedAccountId]);

  const updateStepStatus = (id: string, status: ExecutionStep['status'], result?: string) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status, result } : s));
  };

  const addMessage = (msg: Omit<ChatMessage, 'id'>) => {
    setMessages(prev => [...prev, { ...msg, id: Math.random().toString(36).substring(7) }]);
  };

  // Run the simulation
  const startSimulation = (command: string) => {
    if (!selectedAccountId) {
      alert("Please select an account first");
      return;
    }

    setIsSimulating(true);
    setSteps(INITIAL_STEPS);
    setMessages([]);
    setFlaggedItems([]);
    setMeetingBooked(false);

    // Timeline for the simulation
    setTimeout(() => {
      updateStepStatus('1', 'active');
      addMessage({ role: 'system', content: `Julian initialized with command: "${command}"`, timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
    }, 500);

    setTimeout(() => {
      updateStepStatus('1', 'completed');
      updateStepStatus('2', 'active');
    }, 2000);

    setTimeout(() => {
      updateStepStatus('2', 'completed', `Target: ${briefData?.targetPersona}\nConstraints: Stick strictly to verified brief.`);
      updateStepStatus('3', 'active');
    }, 4000);

    setTimeout(() => {
      updateStepStatus('3', 'completed');
      updateStepStatus('4', 'active');
      addMessage({ role: 'system', content: 'Calling prospect...', timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
    }, 6000);

    setTimeout(() => {
      updateStepStatus('4', 'completed');
      updateStepStatus('5', 'active');
      addMessage({ role: 'prospect', content: 'Hello, this is Dana.', timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
    }, 8500);

    setTimeout(() => {
      addMessage({ 
        role: 'julian', 
        content: "Hi Dana, this is Julian calling. I noticed you mentioned a critical shortage in nursing turnover during the last QBR. I'm reaching out because we've successfully addressed exactly that for similar teams.", 
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        citations: ['QBR Transcript Q3: "nursing turnover is our critical shortage"']
      });
    }, 11000);

    setTimeout(() => {
      addMessage({ 
        role: 'prospect', 
        content: 'Yes, turnover is a huge issue. But how does your tool handle integration? Our current API has a 24-hour lag and it\'s killing us. Also, does it support HIPAA-compliant SMS?', 
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
      });
    }, 15000);

    setTimeout(() => {
      updateStepStatus('5', 'flagged', 'Unverified Question Detected: HIPAA-compliant SMS');
      addMessage({ role: 'system', content: 'Guardrail Triggered: Prospect asked about HIPAA SMS. Not found in verified brief.', timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
      setFlaggedItems(['Does the tool support HIPAA-compliant SMS?']);
    }, 17000);

    setTimeout(() => {
      addMessage({ 
        role: 'julian', 
        content: "I totally understand the frustration with the 24-hour API lag. We can eliminate that delay completely. Regarding the HIPAA-compliant SMS, I want to give you a 100% accurate answer, so I'll have my research agent verify our exact compliance scope for SMS and follow up with you today. Would you be open to a 15-minute sync next Tuesday to review the API integration?", 
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        citations: ['Brief: Integration Delays - Current API limitations causing 24hr lag']
      });
    }, 20000);

    setTimeout(() => {
      addMessage({ role: 'prospect', content: 'Sure, Tuesday at 10 AM works. Send over the invite.', timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
    }, 24000);

    setTimeout(() => {
      addMessage({ role: 'julian', content: 'Perfect, I\'ve got you booked for Tuesday at 10 AM. Talk to you then, Dana.', timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
      setSteps(prev => [...prev, { id: '6', label: 'Booking Meeting', description: 'Integrating with calendar API', status: 'active' }]);
    }, 27000);

    setTimeout(() => {
      updateStepStatus('5', 'completed');
      updateStepStatus('6', 'completed');
      setMeetingBooked(true);
      addMessage({ role: 'system', content: 'Meeting booked for Tuesday 10:00 AM', timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
      setIsSimulating(false);
    }, 30000);
  };

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden max-w-[1600px] mx-auto bg-background">
      {/* LEFT PANEL */}
      <div className="w-full lg:w-[60%] h-full flex flex-col border-r border-border p-6 bg-card/30">
        
        {/* Header & Controls */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-[24px] font-bold text-foreground flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[28px]">record_voice_over</span>
              Julian
            </h1>
            <p className="text-muted-foreground text-[14px]">Voice Outreach Agent</p>
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

        {/* Call Brief Area */}
        <div className="shrink-0 mb-2">
          {loadingBrief ? (
            <div className="h-32 flex items-center justify-center bg-muted/20 border border-border rounded-lg animate-pulse">
              <span className="material-symbols-outlined spin-slow text-muted-foreground">sync</span>
            </div>
          ) : (
            <CallBrief data={briefData} />
          )}
        </div>

        {/* Conversation Feed */}
        <ConversationFeed messages={messages} />

        {/* Command Input */}
        <CommandInput onCommand={startSimulation} disabled={isSimulating || !selectedAccountId} />
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
              {isSimulating && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isSimulating ? 'bg-primary' : 'bg-muted-foreground'}`}></span>
            </span>
            <span className="text-[12px] text-muted-foreground font-mono uppercase tracking-wider">
              {isSimulating ? 'Executing' : 'Standby'}
            </span>
          </div>
        </div>

        <div className="flex-1">
          <ExecutionGraph steps={steps} />
        </div>

        {/* Outcomes Section (Sticky Bottom) */}
        {(flaggedItems.length > 0 || meetingBooked) && (
          <div className="p-6 border-t border-border bg-sidebar shrink-0 space-y-4">
            <h3 className="text-[14px] font-semibold text-foreground uppercase tracking-wider mb-2">Call Outcomes</h3>
            
            {meetingBooked && (
              <div className="flex items-start gap-3 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">event_available</span>
                <div>
                  <div className="text-[14px] font-semibold text-primary">Meeting Booked</div>
                  <div className="text-[12px] text-muted-foreground mt-0.5">Tuesday at 10:00 AM</div>
                </div>
              </div>
            )}

            {flaggedItems.length > 0 && (
              <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <span className="material-symbols-outlined text-amber-500 text-[20px] mt-0.5">flag</span>
                <div>
                  <div className="text-[14px] font-semibold text-amber-500">Flagged to Nova</div>
                  <div className="text-[12px] text-muted-foreground mt-0.5">Julian encountered questions not in the verified brief.</div>
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
      </div>
    </div>
  );
}
