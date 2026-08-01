"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import StakeholderMap from "./StakeholderMap";

// Types
type CitationRef = {
  id: string;
  source_doc_name: string;
  snippet: string;
  start_line?: number;
  end_line?: number;
};

type IntentSignal = {
  signal_type: string;
  description: string;
  urgency: string;
};

type IntentSignals = {
  signals: IntentSignal[];
  overall_intent_score: number;
};

type StakeholderProfile = {
  name: string;
  role: string;
  influence_level: string;
  key_concerns: string[];
};

type ResearchFinding = {
  topic: string;
  summary: string;
};

type ResearchFindings = {
  findings: ResearchFinding[];
};

type AccountPlan = {
  account_id: string;
  strategy_summary: string;
  key_steps: string[];
};

type CriticFeedback = {
  overall_pass: boolean;
  issues_found: string[];
  stripped_claims: string[];
};

type OutreachDraft = {
  channel: string;
  target_persona: string;
  content: string;
  citations: CitationRef[];
  critic_feedback?: CriticFeedback;
};

type AnalysisResult = {
  account_id: string;
  status: string;
  plan: AccountPlan | null;
  drafts: OutreachDraft[];
  intent: IntentSignals | null;
  stakeholders: StakeholderProfile[];
  research: ResearchFindings | null;
  error?: string;
};

type Account = {
  id: string;
  domain: string;
  company_name: string | null;
  created_at: string;
  status: string;
};

export default function AccountDetailView({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const accountId = resolvedParams.id;
  const router = useRouter();
  
  const [account, setAccount] = useState<Account | null>(null);
  const [session, setSession] = useState<{ id: string; status: string } | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchAccountData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const fetchAccountData = async () => {
    try {
      const res = await fetch(`/api/accounts/${accountId}`);
      if (res.ok) {
        const data = await res.json();
        setAccount({
          id: data.id,
          domain: data.domain,
          company_name: data.company_name,
          created_at: data.created_at,
          status: data.latest_analysis ? data.latest_analysis.status : 'pending',
        });
        
        if (data.latest_analysis && data.latest_analysis.result) {
           setResult({
             account_id: accountId,
             status: data.latest_analysis.status,
             plan: data.latest_analysis.result.account_plan || null,
             drafts: data.latest_analysis.result.outreach_drafts || [],
             intent: data.latest_analysis.result.intent || null,
             stakeholders: data.latest_analysis.result.stakeholders || [],
             research: data.latest_analysis.result.research || null,
           });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const startAnalysis = async () => {
    setLoading(true);
    // Actually, in the UI roadmap, clicking "Analyze Account" goes to the AI Processing Screen.
    // So here we should navigate to `/accounts/[id]/processing` or handle it in the same page.
    router.push(`/accounts/${accountId}/processing`);
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 flex justify-center items-center h-[calc(100vh-4rem)]">
        <span className="material-symbols-outlined text-4xl spin-slow text-primary">sync</span>
      </div>
    );
  }

  // If no result is loaded, and status is pending, show the pre-analysis state
  if (!result && account?.status === 'pending') {
    return (
      <div className="max-w-[1200px] mx-auto flex flex-col gap-6 py-6 px-6 lg:px-8">
        <div className="bg-card border border-border rounded-lg p-12 flex flex-col items-center justify-center text-center shadow-sm">
          <span className="material-symbols-outlined text-[64px] text-muted mb-4">corporate_fare</span>
          <h2 className="text-[24px] leading-[32px] font-semibold text-foreground mb-2">Ready to Analyze {account.company_name || account.domain}</h2>
          <p className="text-[16px] leading-[24px] text-muted-foreground max-w-lg mb-8">
            Click below to extract signals, identify pain points, map stakeholders, and draft orchestrated outreach.
          </p>
          <button 
            onClick={startAnalysis}
            className="h-10 px-6 rounded bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
            Run AI Analysis
          </button>
        </div>
      </div>
    );
  }

  const stakeholders = result?.stakeholders?.length 
    ? result.stakeholders.map((s) => ({
        ...s,
        history: [] // Fallback for UI component
      }))
    : [];

  const painPoints = result?.stakeholders?.flatMap(s => s.key_concerns).filter(Boolean) || [];

  const buyingSignals = result?.intent?.signals?.map(s => s.description) || [];

  return (
    <div className="max-w-[1200px] mx-auto flex flex-col gap-6 py-6 px-6 lg:px-8">
      {/* 1. Header Summary Bar */}
      <div className="bg-card border border-border rounded-lg p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-[32px] leading-[40px] tracking-[-0.02em] font-semibold text-foreground">{account?.company_name || 'Meridian Health'}</h1>
            <span className="bg-muted text-foreground px-2 py-0.5 rounded text-[12px] font-medium border border-border">Enterprise</span>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground text-[14px]">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">domain</span>
              <span>San Francisco, CA</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">link</span>
              <a className="hover:underline" href="#">{account?.domain || 'meridian.com'}</a>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6 bg-background p-4 rounded-lg border border-border">
          <div className="flex flex-col items-center">
            <span className="text-[11px] leading-[16px] tracking-[0.05em] font-semibold uppercase text-muted-foreground mb-1">Intent Score</span>
            <div className="relative w-16 h-16 flex items-center justify-center rounded-full border-4 border-primary/20">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path 
                  className="text-primary" 
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeDasharray="78, 100" 
                  strokeLinecap="round" 
                  strokeWidth="4" 
                />
              </svg>
              <span className="text-[24px] leading-[32px] font-semibold text-foreground relative z-10">{result?.intent?.overall_intent_score ?? '--'}</span>
            </div>
          </div>
          <div className="h-12 w-px bg-border"></div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-muted-foreground">update</span>
              <span className="font-mono text-[13px] text-muted-foreground">Last Analyzed: Today</span>
            </div>
            <button 
              onClick={startAnalysis}
              className="bg-primary text-primary-foreground px-4 py-2 rounded text-[14px] font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Refresh Analysis
            </button>
          </div>
        </div>
      </div>

      {/* 2. Stakeholder Map */}
      <div>
        <h2 className="text-[18px] leading-[24px] tracking-[-0.01em] font-semibold text-foreground mb-4">Stakeholder Map</h2>
        <StakeholderMap stakeholders={stakeholders} accountId={accountId} />
      </div>

      {/* 3. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          {/* Pain Points */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-[18px] leading-[24px] tracking-[-0.01em] font-semibold text-foreground mb-4 border-b border-border pb-2">Identified Pain Points</h3>
            <ul className="space-y-4">
              {painPoints.length > 0 ? (
                painPoints.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-destructive mt-0.5 text-[20px]">warning</span>
                    <div className="flex-1">
                      <p className="text-[14px] leading-[20px] text-foreground">
                        {point}
                      </p>
                    </div>
                  </li>
                ))
              ) : (
                <li className="text-muted-foreground text-[14px]">No pain points identified yet.</li>
              )}
            </ul>
          </div>

          {/* Buying Signals */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-[18px] leading-[24px] tracking-[-0.01em] font-semibold text-foreground mb-4 border-b border-border pb-2 flex items-center justify-between">
              Buying Signals
              <span className="material-symbols-outlined text-primary text-[20px]">trending_up</span>
            </h3>
            <div className="space-y-3">
              {buyingSignals.length > 0 ? (
                buyingSignals.map((signal, idx) => (
                  <div key={idx} className={`${idx === 0 ? 'bg-primary/5 border border-primary/20' : 'bg-background border border-border'} rounded p-3`}>
                    <p className={`text-[14px] leading-[20px] ${idx === 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {signal}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground text-[14px]">No buying signals detected yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {/* Key Research Findings */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-[18px] leading-[24px] tracking-[-0.01em] font-semibold text-foreground mb-4 border-b border-border pb-2">Key Research Findings</h3>
            <div className="space-y-4">
              {result?.research?.findings && result.research.findings.length > 0 ? (
                result.research.findings.map((finding, idx) => (
                  <div key={idx} className="border border-border rounded p-3 bg-muted/20">
                    <div className="text-[14px] font-semibold mb-1 text-foreground">{finding.topic}</div>
                    <p className="text-[13px] text-muted-foreground">{finding.summary}</p>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground text-[14px]">No research findings available.</div>
              )}
            </div>
          </div>

          {/* Recommended Actions */}
          <div className="bg-card border border-primary/30 rounded-lg p-5 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            <h3 className="text-[18px] leading-[24px] tracking-[-0.01em] font-semibold text-foreground mb-4 border-b border-border pb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">auto_awesome</span>
              Recommended Next Actions
            </h3>
            <div className="space-y-3 relative z-10">
              {result?.plan?.key_steps && result.plan.key_steps.length > 0 ? (
                result.plan.key_steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-background border border-border rounded shadow-sm">
                    <div className="mt-0.5 text-primary">
                      <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-foreground text-[14px]">{step}</div>
                      {idx === 0 && (
                        <Link href={`/accounts/${accountId}/outreach`} className="text-primary text-[14px] font-medium hover:underline flex items-center gap-1 mt-2">
                          View Outreach Drafts <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground text-[14px]">No recommended actions at this time.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
