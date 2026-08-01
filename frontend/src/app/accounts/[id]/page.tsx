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

type AccountPlan = {
  summary: string;
  key_initiatives: string[];
  recent_news: string[];
  challenges: string[];
  citations: CitationRef[];
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
      const res = await fetch(`http://localhost:8000/api/accounts/${accountId}`);
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

  // Extrapolate stakeholders from drafts (target_persona)
  const rawStakeholders = result?.drafts?.length 
    ? result.drafts.map(d => d.target_persona).filter((v, i, a) => a.indexOf(v) === i)
    : ["Dana Whitfield (VP Clinical Ops)", "Marcus Iyer (Director IT)", "Priya Chandrasekaran (CFO)"]; // Fallbacks while pending

  const stakeholders = rawStakeholders.map((s, i) => {
    const name = typeof s === 'string' ? s.split('(')[0].trim() || s : s;
    const roleMatch = typeof s === 'string' ? s.match(/\((.*?)\)/) : null;
    const role = roleMatch ? roleMatch[1] : (i === 0 ? "VP Operations" : i === 1 ? "Director IT" : "CFO");
    return {
      name,
      role,
      key_concerns: ["Evaluating solutions for operational efficiency"],
      history: []
    };
  });

  const painPoints = result?.plan?.challenges || [
    "High Nursing Turnover - Mentioned \"critical shortage\" in last two QBRs.",
    "Integration Delays - Current API limitations causing 24hr lag."
  ];

  const buyingSignals = result?.plan?.key_initiatives || [
    "Budget Allocation Confirmed - Earmarked funds in the Q1 budget specifically for operational efficiency.",
    "Competitor Contract Expiring - Contract up for renewal in October."
  ];

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
              <span className="text-[24px] leading-[32px] font-semibold text-foreground relative z-10">78</span>
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
              {painPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-destructive mt-0.5 text-[20px]">warning</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-foreground">{point.split('-')[0].trim()}</span>
                      <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-[10px] font-mono border border-border">Insight</span>
                    </div>
                    <p className="text-[12px] leading-[16px] text-muted-foreground">
                      {point.split('-').slice(1).join('-').trim() || point}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Buying Signals */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-[18px] leading-[24px] tracking-[-0.01em] font-semibold text-foreground mb-4 border-b border-border pb-2 flex items-center justify-between">
              Buying Signals
              <span className="material-symbols-outlined text-primary text-[20px]">trending_up</span>
            </h3>
            <div className="space-y-3">
              {buyingSignals.map((signal, idx) => (
                <div key={idx} className={`${idx === 0 ? 'bg-primary/5 border border-primary/20' : 'bg-background border border-border'} rounded p-3`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`font-medium ${idx === 0 ? 'text-primary' : 'text-foreground'}`}>{signal.split('-')[0].trim()}</span>
                    <div className="flex gap-1">
                      <div className={`w-2 h-4 rounded-sm ${idx === 0 ? 'bg-primary' : 'bg-muted-foreground'}`}></div>
                      <div className={`w-2 h-4 rounded-sm ${idx === 0 ? 'bg-primary' : 'bg-muted-foreground'}`}></div>
                      <div className={`w-2 h-4 rounded-sm ${idx === 0 ? 'bg-primary' : 'bg-muted/50'}`}></div>
                    </div>
                  </div>
                  <p className={`font-mono text-[13px] ${idx === 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {signal.split('-').slice(1).join('-').trim() || signal}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {/* Whitespace Context */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-[18px] leading-[24px] tracking-[-0.01em] font-semibold text-foreground mb-4 border-b border-border pb-2">Whitespace & Competitive Context</h3>
            <div className="mb-4">
              <div className="text-[11px] leading-[16px] tracking-[0.05em] font-semibold uppercase text-muted-foreground mb-2">Current Stack Presence</div>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-background border border-border rounded text-[14px] text-muted-foreground">Workday (HRIS)</span>
                <span className="px-2 py-1 bg-background border border-border rounded text-[14px] text-muted-foreground">Salesforce (CRM)</span>
                <span className="px-2 py-1 bg-destructive/10 text-destructive border border-destructive/20 rounded text-[14px] font-medium">Competitor Inc</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] leading-[16px] tracking-[0.05em] font-semibold uppercase text-muted-foreground mb-2">Cross-Sell Opportunities</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-border rounded p-3 flex items-center justify-between">
                  <span className="text-[14px] font-medium">Analytics Module</span>
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                </div>
                <div className="border border-border rounded p-3 flex items-center justify-between bg-muted">
                  <span className="text-[14px] font-medium text-muted-foreground">Integration API</span>
                  <span className="w-2 h-2 rounded-full bg-border"></span>
                </div>
              </div>
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
              <div className="flex items-start gap-3 p-3 bg-background border border-primary/20 rounded shadow-sm">
                <div className="mt-0.5 text-primary">
                  <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground mb-1 text-[14px]">Schedule follow-up with {stakeholders[0]?.name || 'Stakeholder'}</div>
                  <p className="text-[12px] leading-[16px] text-muted-foreground mb-2">Address budget finalization. Emphasize ROI timeline for operational efficiency tools.</p>
                  <Link href={`/accounts/${accountId}/outreach`} className="text-primary text-[14px] font-medium hover:underline flex items-center gap-1">
                    Draft Email <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-background border border-border rounded">
                <div className="mt-0.5 text-muted-foreground">
                  <span className="material-symbols-outlined text-[20px]">description</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground mb-1 text-[14px]">Send Technical Integration Guide</div>
                  <p className="text-[12px] leading-[16px] text-muted-foreground">Send preemptively address integration concerns.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
