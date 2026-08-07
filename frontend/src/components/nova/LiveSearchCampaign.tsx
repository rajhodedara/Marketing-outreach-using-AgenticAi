"use client";

import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

type ScreenType = 'audience_search' | 'campaign_view';
type TabType = 'audience' | 'research' | 'messaging' | 'settings';
type TransitionDirection = 'push' | 'push_back' | 'none';

interface TimelineEvent {
  id: number;
  node: string;
  agent: string;
  message: string;
}

export function LiveSearchCampaign() {
  const router = useRouter();
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('audience_search');
  const [activeTab, setActiveTab] = useState<TabType>('research');
  const [direction, setDirection] = useState<TransitionDirection>('push');
  const [searchPrompt, setSearchPrompt] = useState('');
  
  // Real-time Search State
  const [isSearching, setIsSearching] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [icp, setIcp] = useState<any>(null);
  
  // Flattened Data
  const [companies, setCompanies] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  
  const [executiveBriefing, setExecutiveBriefing] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [messagingCompanyIndex, setMessagingCompanyIndex] = useState(0);
  const [selectedTone, setSelectedTone] = useState("Executive Tone");
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    fetch('http://localhost:8000/api/nova/campaigns')
      .then(res => res.json())
      .then(data => {
        if (data.campaigns) setCampaigns(data.campaigns);
      })
      .catch(err => console.error("Failed to fetch campaigns:", err));
  }, []);

  const navigateTo = (screen: ScreenType, trans: TransitionDirection = 'none') => {
    setDirection(trans);
    setCurrentScreen(screen);
  };

  const startLiveSearch = async (query: string) => {
    if (!query.trim()) return;
    setSearchPrompt(query);
    setIsSearching(true);
    setTimeline([]);
    setIcp(null);
    setCompanies([]);
    setContacts([]);
    setExecutiveBriefing(null);
    setActiveTab('research');
    navigateTo('campaign_view', 'push');
    
    try {
      const res = await fetch('http://localhost:8000/api/nova/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      
      if (data.session_id) {
        setSessionId(data.session_id);
        
        const eventSource = new EventSource(`http://localhost:8000/api/nova/search/${data.session_id}/stream`);
        
        eventSource.onmessage = (event) => {
          if (event.data === '[DONE]') {
            eventSource.close();
            fetchFinalResults(data.session_id);
          } else {
            try {
              const parsed = JSON.parse(event.data);
              if (parsed.node === 'icp_result') {
                  setIcp(JSON.parse(parsed.message));
              } else {
                  setTimeline(prev => [...prev, {
                    id: Date.now() + Math.random(),
                    node: parsed.node,
                    agent: parsed.agent,
                    message: parsed.message
                  }]);
              }
            } catch (e) {}
          }
        };
        
        eventSource.onerror = () => {
          eventSource.close();
          setIsSearching(false);
        };
      }
    } catch (e) {
      console.error(e);
      setIsSearching(false);
    }
  };

  const fetchFinalResults = async (sid: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/nova/search/${sid}`);
      const data = await res.json();
      if (data.result) {
        const resultCompanies = data.result.discovered_companies || data.result.companies;
        if (resultCompanies) {
            setCompanies(resultCompanies);
            const flatContacts: any[] = [];
            resultCompanies.forEach((comp: any) => {
                if (comp.decision_makers && comp.decision_makers.length > 0) {
                    comp.decision_makers.forEach((dm: any) => {
                        flatContacts.push({
                            ...dm,
                            company: comp
                        });
                    });
                }
            });
            setContacts(flatContacts);
            if (flatContacts.length > 0) {
                setExpandedLead(flatContacts[0].name);
            }
        }
        if (data.result.executive_briefing) setExecutiveBriefing(data.result.executive_briefing);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
      fetch('http://localhost:8000/api/nova/campaigns')
        .then(res => res.json())
        .then(data => { if (data.campaigns) setCampaigns(data.campaigns); });
    }
  };

  const variants = {
    initial: (dir: TransitionDirection) => {
      if (dir === 'push') return { x: '100%', opacity: 0.8 };
      if (dir === 'push_back') return { x: '-100%', opacity: 0.8 };
      return { opacity: 0 };
    },
    animate: { x: 0, opacity: 1, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
    exit: (dir: TransitionDirection) => {
      if (dir === 'push') return { x: '-20%', opacity: 0.5 };
      if (dir === 'push_back') return { x: '20%', opacity: 0.5 };
      return { opacity: 0 };
    }
  };

  const renderAudienceTab = () => (
    <div className="flex flex-1 overflow-hidden h-full bg-background rounded-none">
        <div className="w-[400px] border-r border-border bg-card p-6 overflow-y-auto rounded-none">
            <div className="flex items-center gap-2 mb-6 font-semibold text-foreground">
                <span className="material-symbols-outlined text-[18px]">filter_list</span>
                Live Web Search
            </div>
            <p className="text-sm text-muted-foreground mb-6">
                Describe your target audience. Alice scanned live web data to find matching leads.
            </p>
            <div className="bg-muted/50 p-4 rounded-[8px] border border-border mb-8">
                <p className="text-sm text-foreground">{searchPrompt}</p>
            </div>
            
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Profile matching criteria</h4>
            {icp && (
                <div className="space-y-3">
                    <div className="bg-background border border-border p-4 rounded-[8px] text-sm shadow-sm flex gap-4">
                        <span className="font-semibold text-muted-foreground">1.</span>
                        <div>
                            <span className="block font-medium mb-1 text-foreground">Market / Industry</span>
                            <span className="text-muted-foreground">{icp.industry}</span>
                        </div>
                    </div>
                    <div className="bg-background border border-border p-4 rounded-[8px] text-sm shadow-sm flex gap-4">
                        <span className="font-semibold text-muted-foreground">2.</span>
                        <div>
                            <span className="block font-medium mb-1 text-foreground">Required Signals</span>
                            <span className="text-muted-foreground">{icp.buying_signals?.join(', ')}</span>
                        </div>
                    </div>
                    <div className="bg-background border border-border p-4 rounded-[8px] text-sm shadow-sm flex gap-4">
                        <span className="font-semibold text-muted-foreground">3.</span>
                        <div>
                            <span className="block font-medium mb-1 text-foreground">Target Personas</span>
                            <span className="text-muted-foreground">{icp.target_personas?.join(', ')}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
        
        <div className="flex-1 p-8 overflow-y-auto bg-background">
            <div className="flex justify-between items-end border-b border-border pb-4 mb-6">
                <div className="text-sm font-semibold">
                    <span className="text-foreground">{contacts.length}</span> <span className="text-muted-foreground">preview contacts found</span>
                </div>
                <button onClick={() => setActiveTab('research')} className="bg-primary text-primary-foreground px-5 py-2 rounded-[8px] text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
                    Continue to next step
                </button>
            </div>
            
            <div className="space-y-4 max-w-4xl mx-auto pb-20">
                {contacts.map((contact, idx) => (
                    <div key={idx} className="bg-card border border-border rounded-[12px] overflow-hidden shadow-sm">
                        <div className="p-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold shrink-0">
                                {contact.company.company_name?.charAt(0).toUpperCase() || 'C'}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-base font-semibold text-foreground">{contact.name}</h3>
                                <p className="text-sm text-muted-foreground">{contact.role} @ {contact.company.company_name}</p>
                            </div>
                        </div>
                        <div 
                            className="bg-green-500/5 border-t border-green-500/10 p-3 flex justify-between items-center cursor-pointer hover:bg-green-500/10 transition-colors"
                            onClick={() => setExpandedLead(expandedLead === contact.name ? null : contact.name)}
                        >
                            <div className="flex items-center gap-2 text-green-500 text-sm font-semibold">
                                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                Audience Criteria Matched
                            </div>
                            <span className="material-symbols-outlined text-green-500 text-[18px]">
                                {expandedLead === contact.name ? 'expand_less' : 'expand_more'}
                            </span>
                        </div>
                        
                        <AnimatePresence>
                            {expandedLead === contact.name && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="px-4 pb-4 pt-2 bg-green-500/5 space-y-3 overflow-hidden"
                                >
                                    <div className="bg-background border border-green-500/20 p-4 rounded-[8px] text-sm text-foreground shadow-sm">
                                        <p className="mb-2 text-foreground font-medium flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-green-500">fact_check</span> ICP Match Report</p>
                                        <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                                            <div><strong className="text-foreground">Industry:</strong> {contact.company.icp_match_report?.industry_match}</div>
                                            <div><strong className="text-foreground">Size:</strong> {contact.company.icp_match_report?.size_match}</div>
                                            <div><strong className="text-foreground">Signal:</strong> {contact.company.icp_match_report?.signal_match}</div>
                                            <div><strong className="text-foreground">Persona:</strong> {contact.company.icp_match_report?.persona_match}</div>
                                            <div><strong className="text-foreground">Timing:</strong> Now</div>
                                        </div>
                                        <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
                                            <span className="text-foreground font-semibold flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[16px]">emoji_events</span>
                                                Total Match Score
                                            </span>
                                            <span className="text-green-500 font-bold">{contact.company.opportunity_score || '84'}/100</span>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-background border border-border p-4 rounded-[8px] text-sm shadow-sm text-muted-foreground">
                                        <p className="mb-2 text-foreground font-medium flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-primary">info</span> About {contact.company.company_name}</p>
                                        <p className="leading-relaxed mb-4">{contact.company.executive_briefing?.market_observation || `Research shows strong indicators for ${contact.company.company_name}.`}</p>
                                        <div className="bg-muted/30 p-3 rounded-[6px] border border-border flex gap-4 text-xs font-semibold">
                                            <div><span className="text-foreground block mb-0.5">Intent Strength</span><span className="text-primary">{contact.company.intent_strength || 'High'}</span></div>
                                            <div><span className="text-foreground block mb-0.5">Confidence</span>{contact.company.research_confidence || '92'}%</div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-background border border-border p-4 rounded-[8px] text-sm shadow-sm text-muted-foreground">
                                        <p className="mb-3 text-foreground font-medium flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-primary">bolt</span> Current Buying Triggers</p>
                                        {contact.company.why_now?.length > 0 ? (
                                            <div className="space-y-3">
                                                {contact.company.why_now.map((trigger: any, i: number) => (
                                                    <div key={i} className="bg-muted/20 p-3 rounded-[6px] border border-border">
                                                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-semibold mb-1">
                                                            <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                                                            {trigger.detected_date || trigger.date || 'Recent'}
                                                        </div>
                                                        <div className="font-semibold text-foreground text-sm mb-1">{trigger.trigger || trigger.event || 'Signal Detected'}</div>
                                                        <div className="text-xs text-muted-foreground leading-relaxed">{trigger.business_impact || trigger.explanation || 'Relevant to current business context.'}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-xs italic flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[14px]">do_not_disturb_on</span>
                                                No recent buying triggers found.
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );

  const renderMessagingTab = () => {
    const defaultContact = contacts.length > 0 ? contacts[messagingCompanyIndex] : null;
    const defaultOutreach = defaultContact ? defaultContact.company.outreach_sequence : null;
    const defaultSalesContext = defaultContact ? defaultContact.company.sales_context : null;
    const personalizationScore = defaultContact?.company?.personalization_score;

    const handleNext = () => {
        if (messagingCompanyIndex < contacts.length - 1) setMessagingCompanyIndex(messagingCompanyIndex + 1);
    };

    const handlePrev = () => {
        if (messagingCompanyIndex > 0) setMessagingCompanyIndex(messagingCompanyIndex - 1);
    };

    const handleRegenerate = async () => {
        if (!defaultContact || !sessionId) return;
        setIsRegenerating(true);
        try {
            const res = await fetch(`http://localhost:8000/api/nova/search/${sessionId}/regenerate-outreach`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    company_name: defaultContact.company.company_name,
                    tone: selectedTone
                })
            });
            const data = await res.json();
            if (data.outreach_sequence) {
                const updatedContacts = [...contacts];
                updatedContacts[messagingCompanyIndex].company.outreach_sequence = data.outreach_sequence;
                setContacts(updatedContacts);
            }
        } catch(e) {
            console.error(e);
        } finally {
            setIsRegenerating(false);
        }
    };

    return (
    <div className="flex flex-1 overflow-hidden h-full bg-background rounded-none">
        <div className="w-[450px] border-r border-border bg-card p-6 overflow-y-auto rounded-none shrink-0 custom-scrollbar">
            
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                <div className="flex items-center gap-2 text-sm font-bold tracking-wider uppercase text-primary">
                    <span className="material-symbols-outlined text-[18px]">psychology</span>
                    Outreach Intelligence
                </div>
                {personalizationScore && (
                    <div className="flex items-center gap-2 bg-green-500/10 text-green-600 px-3 py-1 rounded-full text-xs font-bold border border-green-500/20">
                        <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                        Score: {personalizationScore.total_score || 92}%
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between bg-muted/30 p-2 rounded-[8px] mb-6 border border-border">
                <button onClick={handlePrev} disabled={messagingCompanyIndex === 0} className="p-1.5 hover:bg-muted rounded-[6px] transition-colors disabled:opacity-30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <span className="text-xs font-semibold text-foreground tracking-wide">
                    Company {messagingCompanyIndex + 1} of {contacts.length > 0 ? contacts.length : 1}
                </span>
                <button onClick={handleNext} disabled={contacts.length === 0 || messagingCompanyIndex === contacts.length - 1} className="p-1.5 hover:bg-muted rounded-[6px] transition-colors disabled:opacity-30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
            </div>
            
            <div className="space-y-8">
                {/* Target Person */}
                <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">person</span> Target Person
                    </h4>
                    <div className="bg-muted/20 border border-border rounded-[8px] p-4 space-y-3">
                        <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">Name & Role</span>
                            <span className="text-sm font-medium">{defaultSalesContext?.target_person_name || defaultContact?.name} ({defaultSalesContext?.target_person_role || defaultContact?.role})</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">Company</span>
                            <span className="text-sm font-medium">{defaultSalesContext?.target_person_company || defaultContact?.company?.company_name}</span>
                        </div>
                        <div className="flex justify-between flex-col gap-1">
                            <span className="text-xs text-muted-foreground">Why Selected</span>
                            <span className="text-sm font-medium">{defaultSalesContext?.target_person_why || 'Strategic decision maker'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">Influence Level</span>
                            <span className="text-sm font-medium text-primary">{defaultSalesContext?.target_person_influence || 'High'}</span>
                        </div>
                    </div>
                </div>

                {/* Trigger Intelligence */}
                <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">bolt</span> Trigger Intelligence
                    </h4>
                    <div className="bg-primary/5 border border-primary/20 rounded-[8px] p-4 space-y-3">
                        <div className="flex justify-between flex-col gap-1">
                            <span className="text-xs text-primary font-semibold">Event</span>
                            <span className="text-sm font-medium text-foreground">{defaultSalesContext?.trigger_event || 'Recent announcements'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">Category</span>
                            <span className="text-sm font-medium">{defaultSalesContext?.trigger_category || 'General'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">Date & Source</span>
                            <span className="text-sm font-medium">{defaultSalesContext?.trigger_date || 'Recently'} via {defaultSalesContext?.trigger_source || 'News'}</span>
                        </div>
                        <div className="flex justify-between flex-col gap-1">
                            <span className="text-xs text-muted-foreground">Why it matters</span>
                            <span className="text-sm font-medium leading-relaxed">{defaultSalesContext?.trigger_why_it_matters || 'Relevant to scaling operations.'}</span>
                        </div>
                    </div>
                </div>

                {/* Business Context */}
                <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">domain</span> Business Context
                    </h4>
                    <div className="bg-muted/20 border border-border rounded-[8px] p-4 space-y-3">
                        <div className="flex justify-between flex-col gap-1">
                            <span className="text-xs text-muted-foreground">Challenge</span>
                            <span className="text-sm font-medium">{defaultSalesContext?.business_challenge || 'Scaling operations'}</span>
                        </div>
                        <div className="flex justify-between flex-col gap-1">
                            <span className="text-xs text-muted-foreground">Impact</span>
                            <span className="text-sm font-medium">{defaultSalesContext?.business_impact || 'Operational bottlenecks'}</span>
                        </div>
                        <div className="flex justify-between flex-col gap-1">
                            <span className="text-xs text-muted-foreground">Current Situation</span>
                            <span className="text-sm font-medium text-muted-foreground">{defaultSalesContext?.current_situation || 'Navigating growth phase'}</span>
                        </div>
                    </div>
                </div>

                {/* Conversation Strategy */}
                <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">strategy</span> Conversation Strategy
                    </h4>
                    <div className="bg-muted/20 border border-border rounded-[8px] p-4 space-y-3">
                        <div className="flex justify-between flex-col gap-1">
                            <span className="text-xs text-muted-foreground">Opening Angle</span>
                            <span className="text-sm font-medium text-primary">"{defaultSalesContext?.opening_angle || 'Discuss recent changes'}"</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">Goal</span>
                            <span className="text-sm font-medium">{defaultSalesContext?.conversation_goal || 'Book meeting'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">Outcome</span>
                            <span className="text-sm font-medium">{defaultSalesContext?.desired_outcome || 'Discovery call scheduled'}</span>
                        </div>
                    </div>
                </div>

                {/* Message Evidence Panel */}
                <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">fact_check</span> Evidence Used
                    </h4>
                    <div className="bg-muted/10 border border-border rounded-[8px] p-4 text-sm text-muted-foreground">
                        <p className="mb-3 font-semibold text-foreground">Luna generated this message using:</p>
                        <ul className="space-y-2">
                            {defaultSalesContext?.evidence_used?.length ? defaultSalesContext.evidence_used.map((ev: string, i: number) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="material-symbols-outlined text-green-500 text-[16px] mt-0.5">check_circle</span>
                                    {ev}
                                </li>
                            )) : (
                                <li className="flex items-start gap-2">
                                    <span className="material-symbols-outlined text-green-500 text-[16px] mt-0.5">check_circle</span>
                                    Verified ICP Profile
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
        
        <div className="flex-1 p-8 overflow-y-auto flex justify-center items-start bg-background">
            <div className="w-full max-w-3xl flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Generated Sequence</h2>
                    <div className="flex gap-2">
                        <select 
                            value={selectedTone}
                            onChange={(e) => setSelectedTone(e.target.value)}
                            className="bg-card border border-border rounded-[6px] px-3 py-1.5 text-sm outline-none focus:border-primary">
                            <option>Executive Tone</option>
                            <option>Technical Tone</option>
                            <option>Short & Direct</option>
                            <option>Consultative</option>
                            <option>Friendly</option>
                        </select>
                        <button 
                            onClick={handleRegenerate}
                            disabled={isRegenerating}
                            className={`bg-muted hover:bg-muted/80 border border-border rounded-[6px] p-1.5 transition-colors ${isRegenerating ? 'opacity-50 cursor-not-allowed text-primary' : 'text-muted-foreground'}`}>
                            <span className={`material-symbols-outlined text-[18px] ${isRegenerating ? 'animate-spin' : ''}`}>refresh</span>
                        </button>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-[16px] shadow-xl overflow-hidden flex flex-col min-h-[600px]">
                    <div className="flex border-b border-border bg-muted/30">
                        <button className="px-8 py-4 border-b-2 border-primary text-sm font-semibold text-foreground bg-card">Email 1: Initial</button>
                        <button className="px-8 py-4 border-b-2 border-transparent text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Email 2: Follow-up</button>
                        <button className="px-8 py-4 border-b-2 border-transparent text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Email 3: Breakup</button>
                    </div>
                    
                    <div className="p-8 flex-1 overflow-y-auto bg-card">
                        <div className="mb-8 pb-6 border-b border-border/50">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mr-3">Subject:</span>
                            <span className="text-lg font-semibold text-foreground">{defaultOutreach?.subject_line || 'Scaling operations post-announcement'}</span>
                        </div>
                        
                        <div className="text-base text-foreground/90 leading-relaxed whitespace-pre-wrap font-serif">
                            {defaultOutreach?.email_1 || `Hi ${defaultContact?.name?.split(' ')[0] || 'there'},\n\nDiscuss recent changes\n\nScaling operations. We help companies like ${defaultContact?.company?.company_name || 'ServiceNow'} streamline this exact transition.\n\nAre you open to a brief chat to book a meeting?\n\nBest,\nAlice`}
                        </div>
                    </div>
                    
                    <div className="p-5 border-t border-border bg-muted/30 flex justify-end gap-4">
                        <button className="px-6 py-2.5 rounded-[8px] text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors shadow-sm bg-card">Edit in Drafts</button>
                        <button className="px-6 py-2.5 rounded-[8px] text-sm font-semibold bg-primary text-primary-foreground flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm">
                            <span className="material-symbols-outlined text-[18px]">send</span>
                            Send Sequence to ABM
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    )
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col overflow-x-hidden selection:bg-primary/20 selection:text-primary">
      <AnimatePresence mode="wait" custom={direction}>
        {currentScreen === 'audience_search' && (
          <motion.div
            key="audience_search"
            custom={direction}
            variants={variants as any}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1 flex flex-col h-screen overflow-hidden"
          >
            <header className="bg-card border-b border-border flex flex-col w-full z-10 shrink-0">
              <div className="flex justify-between items-center w-full px-4 md:px-16 py-3">
                <div className="flex items-center gap-4">
                  <button className="text-muted-foreground hover:bg-muted p-1 rounded-full"><span className="material-symbols-outlined">close</span></button>
                  <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-1 border border-border">
                    <span className="material-symbols-outlined text-sm text-primary">ac_unit</span>
                    <span className="text-xs font-semibold tracking-wider text-foreground">Cold outbound</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-medium text-foreground">Alice Live Web Search</h1>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => startLiveSearch(searchPrompt)} className="bg-primary text-primary-foreground px-4 py-1.5 rounded-[8px] text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm">Search</button>
                </div>
              </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
              <div className="w-full md:w-2/3 h-full border-r border-border bg-card flex flex-col overflow-y-auto rounded-none">
                <div className="p-8 lg:p-12 max-w-3xl mx-auto w-full">
                  <div className="mb-10">
                    <h2 className="text-2xl font-medium mb-2 text-foreground">Live Web Search</h2>
                    <p className="text-muted-foreground text-base mb-6 leading-relaxed">Describe your target audience for this campaign. Alice will scan live web data to find matching leads.</p>
                    <div className="relative rounded-[12px] overflow-hidden mb-4 border border-border bg-background focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                      <textarea
                        value={searchPrompt}
                        onChange={(e) => setSearchPrompt(e.target.value)}
                        className="w-full bg-transparent text-foreground border-none p-6 resize-none focus:outline-none placeholder:text-muted-foreground/50 text-lg min-h-[130px]"
                        placeholder="e.g. Find SaaS companies investing in AI automation..."
                      />
                      <div className="absolute bottom-4 right-4">
                        <button onClick={() => startLiveSearch(searchPrompt)} className="bg-primary/10 text-primary p-2.5 rounded-[8px] hover:bg-primary/20 border border-primary/20 transition-colors">
                          <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="hidden md:flex w-1/3 h-full bg-background flex-col border-l border-border rounded-none">
                <div className="p-6 border-b border-border bg-card">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-1 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-sm">history</span>
                        Previous Missions
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {campaigns.map((camp, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => {
                            setSessionId(camp.id);
                            setSearchPrompt(camp.query);
                            setIsSearching(true);
                            setTimeline([]);
                            setIcp(null);
                            setCompanies([]);
                            setContacts([]);
                            setExecutiveBriefing(null);
                            setActiveTab('research');
                            navigateTo('campaign_view', 'push');
                            fetchFinalResults(camp.id);
                          }}
                          className="bg-card p-4 rounded-[12px] border border-border hover:border-primary/40 cursor-pointer shadow-sm transition-colors"
                        >
                            <p className="text-sm font-medium text-foreground line-clamp-2">{camp.query}</p>
                            <div className="flex justify-between items-center mt-3">
                                <span className="text-xs text-muted-foreground">{new Date(camp.started_at).toLocaleDateString()}</span>
                                <span className="text-xs font-semibold text-green-500 bg-green-500/10 px-2 py-1 rounded-[4px]">Completed</span>
                            </div>
                        </div>
                    ))}
                </div>
              </div>
            </main>
          </motion.div>
        )}

        {currentScreen === 'campaign_view' && (
          <motion.div
            key="campaign_view"
            custom={direction}
            variants={variants as any}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1 flex flex-col h-screen overflow-hidden bg-background"
          >
            <header className="bg-card border-b border-border flex flex-col w-full z-20 shrink-0">
                <div className="flex justify-between items-center w-full px-6 py-3">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigateTo('audience_search', 'push_back')} className="text-muted-foreground hover:bg-muted transition-colors p-1 rounded-full flex items-center"><span className="material-symbols-outlined">close</span></button>
                        <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-1 border border-border">
                            <span className="material-symbols-outlined text-sm text-primary">ac_unit</span>
                            <span className="text-xs font-semibold tracking-wider text-foreground">Cold outbound</span>
                        </div>
                    </div>
                    <h1 className="text-lg font-medium text-foreground">Launch Sequence #1: Alice Live Web Search</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold text-muted-foreground">Save as draft</span>
                        <button className="bg-primary text-primary-foreground px-5 py-1.5 rounded-[8px] text-sm font-semibold hover:bg-primary/90 shadow-sm transition-colors">Next</button>
                    </div>
                </div>
                
                {/* Tabs */}
                <div className="flex justify-center border-t border-border bg-card">
                    <div className="flex items-center gap-12 text-sm font-semibold">
                        <button onClick={() => setActiveTab('research')} className={`pb-3 pt-3 border-b-2 transition-colors ${activeTab === 'research' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Research</button>
                        <button onClick={() => setActiveTab('messaging')} className={`pb-3 pt-3 border-b-2 transition-colors ${activeTab === 'messaging' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Messaging</button>
                        <button onClick={() => setActiveTab('settings')} className={`pb-3 pt-3 border-b-2 transition-colors ${activeTab === 'settings' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Settings</button>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {isSearching ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 bg-background relative">
                        <div className="absolute inset-0 bg-primary/5 pointer-events-none"></div>
                        <div className="bg-card border border-border p-8 rounded-[16px] shadow-xl flex flex-col items-center z-10 w-full max-w-xl">
                            <span className="relative flex h-12 w-12 mb-6">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-30"></span>
                                <span className="relative inline-flex rounded-full h-12 w-12 bg-primary flex items-center justify-center text-primary-foreground shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                                    <span className="material-symbols-outlined text-2xl">hub</span>
                                </span>
                            </span>
                            <h2 className="text-xl font-medium mb-2 text-foreground">Luna is executing live web research...</h2>
                            <p className="text-muted-foreground text-sm mb-8 text-center max-w-sm">Autonomously scraping the web, analyzing intent, and matching ICP criteria for your mission.</p>
                            
                            <div className="w-full space-y-3 relative h-48 overflow-hidden mask-image-bottom">
                                <AnimatePresence>
                                    {timeline.slice(-4).map(event => (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            key={event.id} 
                                            className="bg-background border border-border p-3 rounded-[8px] text-sm flex gap-3 shadow-sm items-center"
                                        >
                                            <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                                            <div>
                                                <span className="font-semibold text-primary mr-2">{event.agent}:</span>
                                                <span className="text-foreground">{event.message.split('\n')[0]}</span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                ) : (
                    activeTab === 'research' ? renderAudienceTab() :
                    activeTab === 'messaging' ? renderMessagingTab() :
                    <div className="flex-1 flex items-center justify-center text-muted-foreground bg-background font-medium">Settings tab placeholder</div>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
