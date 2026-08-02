"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import StakeholderMap from "./StakeholderMap";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

type ReasoningStep = {
  type: string;
  icon: string;
  content: string;
};

type AnalysisResult = {
  account_id: string;
  status: string;
  plan: AccountPlan | null;
  drafts: OutreachDraft[];
  intent: IntentSignals | null;
  stakeholders: StakeholderProfile[];
  research: ResearchFindings | null;
  reasoning_steps?: ReasoningStep[];
  error?: string;
};

type Account = {
  id: string;
  domain: string;
  company_name: string | null;
  industry?: string | null;
  created_at: string;
  status: string;
};

// ---------------------------------------------------------------------------
// Animation Variants
// ---------------------------------------------------------------------------

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.15 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function IntentRing({ score }: { score: number | undefined }) {
  const value = score ?? 0;
  const dashArray = `${value}, 100`;
  const color =
    value >= 80
      ? "text-primary"
      : value >= 60
      ? "text-sky-400"
      : "text-muted-foreground";

  return (
    <div className="relative w-[72px] h-[72px] flex items-center justify-center shrink-0">
      <svg
        className="absolute inset-0 w-full h-full -rotate-90"
        viewBox="0 0 36 36"
      >
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-border"
        />
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeDasharray={dashArray}
          strokeLinecap="round"
          className={color}
        />
      </svg>
      <span className="text-[22px] font-semibold text-foreground font-mono relative z-10">
        {score ?? "--"}
      </span>
    </div>
  );
}

function UrgencyDot({ urgency }: { urgency: string }) {
  const u = (urgency || "").toLowerCase();
  if (u === "high" || u === "critical")
    return <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />;
  if (u === "medium")
    return <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />;
  return <span className="w-2 h-2 rounded-full bg-muted-foreground shrink-0" />;
}

function SectionLabel({
  icon,
  label,
  count,
}: {
  icon: string;
  label: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="material-symbols-outlined text-[18px] text-muted-foreground">
        {icon}
      </span>
      <h3 className="text-[13px] tracking-[0.04em] font-semibold uppercase text-muted-foreground">
        {label}
      </h3>
      {count !== undefined && count > 0 && (
        <span className="ml-1 px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground">
          {count}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton Loader
// ---------------------------------------------------------------------------

function PageSkeleton() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-8 px-6 py-6 animate-pulse">
      {/* Hero skeleton */}
      <div className="flex justify-between items-start">
        <div className="space-y-3">
          <div className="h-8 w-64 bg-muted rounded-lg" />
          <div className="h-4 w-40 bg-muted/60 rounded" />
        </div>
        <div className="w-[72px] h-[72px] rounded-full bg-muted" />
      </div>
      <div className="h-px bg-border" />
      {/* Grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="h-[280px] bg-muted rounded-xl" />
          <div className="space-y-3">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-20 bg-muted/40 rounded" />
            <div className="h-20 bg-muted/40 rounded" />
          </div>
        </div>
        <div className="lg:col-span-2 space-y-6">
          <div className="h-32 bg-muted/40 rounded" />
          <div className="h-32 bg-muted/40 rounded" />
          <div className="h-32 bg-muted/40 rounded" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AccountDetailView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const accountId = resolvedParams.id;
  const router = useRouter();

  const [account, setAccount] = useState<Account | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [reasoningOpen, setReasoningOpen] = useState(false);

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
          industry: data.industry || null,
          created_at: data.created_at,
          status: data.latest_analysis
            ? data.latest_analysis.status
            : "pending",
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
            reasoning_steps:
              data.latest_analysis.result.reasoning_steps || [],
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const startAnalysis = () => {
    router.push(`/accounts/${accountId}/processing`);
  };

  // --- Loading state ---
  if (loading) return <PageSkeleton />;

  // --- Pre-analysis empty state ---
  if (!result && account?.status === "pending") {
    return (
      <div className="max-w-[1400px] mx-auto flex flex-col gap-6 py-12 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="border border-border rounded-xl p-16 flex flex-col items-center justify-center text-center"
        >
          <span className="material-symbols-outlined text-[56px] text-muted-foreground/30 mb-6">
            corporate_fare
          </span>
          <h2 className="text-[24px] leading-[32px] font-semibold text-foreground mb-2">
            Ready to Analyze{" "}
            {account.company_name || account.domain}
          </h2>
          <p className="text-[15px] leading-[24px] text-muted-foreground max-w-md mb-8">
            Extract signals, identify pain points, map stakeholders, and draft
            orchestrated outreach.
          </p>
          <button
            onClick={startAnalysis}
            className="h-10 px-6 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 active:scale-[0.98] transition-transform"
          >
            <span className="material-symbols-outlined text-[18px]">
              auto_awesome
            </span>
            Run AI Analysis
          </button>
        </motion.div>
      </div>
    );
  }

  // --- Derived data ---
  const stakeholders = result?.stakeholders?.length
    ? result.stakeholders.map((s) => ({ ...s, history: [] }))
    : [];

  const painPoints =
    result?.stakeholders?.flatMap((s) => s.key_concerns).filter(Boolean) || [];

  const buyingSignals = result?.intent?.signals || [];
  const researchFindings = result?.research?.findings || [];
  const keySteps = result?.plan?.key_steps || [];
  const reasoningSteps = result?.reasoning_steps || [];
  const companyName = account?.company_name || account?.domain || "Account";

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-0">
      {/* ================================================================= */}
      {/* ZONE 1: Hero Header Strip                                         */}
      {/* ================================================================= */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="pb-6 border-b border-border"
      >
        {/* Accent line */}
        <div className="h-[2px] w-24 bg-gradient-to-r from-primary to-primary/0 rounded-full mb-6" />

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          {/* Left: Company info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-[28px] leading-[36px] tracking-tight font-semibold text-foreground">
                {companyName}
              </h1>
              {account?.industry && (
                <span className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-[11px] font-medium border border-border">
                  {account.industry}
                </span>
              )}
            </div>
            <div className="flex items-center gap-5 text-muted-foreground text-[13px]">
              {account?.domain && (
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px]">
                    language
                  </span>
                  <span className="font-mono">{account.domain}</span>
                </div>
              )}
              {account?.created_at && (
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px]">
                    schedule
                  </span>
                  <span>
                    Analyzed{" "}
                    {new Date(account.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={startAnalysis}
                className="h-8 px-4 rounded-lg bg-secondary text-secondary-foreground text-[12px] font-medium border border-border hover:bg-muted transition-colors flex items-center gap-1.5 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[15px]">
                  refresh
                </span>
                Refresh
              </button>
              <Link
                href={`/accounts/${accountId}/outreach`}
                className="h-8 px-4 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[15px]">
                  mail
                </span>
                View Outreach
              </Link>
              <Link
                href={`/accounts/${accountId}/audit`}
                className="h-8 px-4 rounded-lg bg-secondary text-secondary-foreground text-[12px] font-medium border border-border hover:bg-muted transition-colors flex items-center gap-1.5 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[15px]">
                  verified
                </span>
                Audit
              </Link>
            </div>
          </div>

          {/* Right: Intent Score ring */}
          <div className="flex items-center gap-5 shrink-0">
            <IntentRing score={result?.intent?.overall_intent_score} />
            <div className="space-y-0.5">
              <p className="text-[11px] tracking-[0.05em] font-semibold uppercase text-muted-foreground">
                Intent Score
              </p>
              <p className="text-[13px] text-muted-foreground">
                {(result?.intent?.overall_intent_score ?? 0) >= 80
                  ? "Strong buying signal"
                  : (result?.intent?.overall_intent_score ?? 0) >= 60
                  ? "Moderate interest"
                  : "Low engagement"}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ================================================================= */}
      {/* ZONE 2: Intelligence Grid (3fr / 2fr)                             */}
      {/* ================================================================= */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-5 gap-8 py-8"
      >
        {/* ---- Left Column (3/5) ---- */}
        <div className="lg:col-span-3 space-y-8">
          {/* Stakeholder Map */}
          <motion.div variants={fadeUp}>
            <SectionLabel
              icon="groups"
              label="Stakeholder Map"
              count={stakeholders.length}
            />
            {stakeholders.length > 0 ? (
              <StakeholderMap
                stakeholders={stakeholders}
                accountId={accountId}
              />
            ) : (
              <div className="h-[200px] border border-dashed border-border rounded-xl flex items-center justify-center">
                <p className="text-[13px] text-muted-foreground">
                  No stakeholders identified yet
                </p>
              </div>
            )}
          </motion.div>

          {/* Research Findings */}
          <motion.div variants={fadeUp}>
            <SectionLabel
              icon="science"
              label="Research Findings"
              count={researchFindings.length}
            />
            {researchFindings.length > 0 ? (
              <div className="space-y-3">
                {researchFindings.map((finding, idx) => (
                  <motion.div
                    key={idx}
                    variants={staggerItem}
                    className="group"
                  >
                    <div className="flex items-start gap-3 py-3 border-t border-border/50 first:border-t-0">
                      <span className="mt-0.5 px-2 py-0.5 rounded bg-secondary text-[10px] font-semibold text-secondary-foreground uppercase tracking-wider shrink-0">
                        {finding.topic.length > 20
                          ? finding.topic.slice(0, 18) + "..."
                          : finding.topic}
                      </span>
                      <p className="text-[13px] leading-[20px] text-muted-foreground group-hover:text-foreground transition-colors">
                        {finding.summary}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground py-4">
                No research findings available.
              </p>
            )}
          </motion.div>

          {/* Strategy Summary */}
          {result?.plan?.strategy_summary && (
            <motion.div variants={fadeUp}>
              <SectionLabel icon="strategy" label="Strategy Summary" />
              <p className="text-[14px] leading-[22px] text-muted-foreground max-w-[65ch]">
                {result.plan.strategy_summary}
              </p>
            </motion.div>
          )}
        </div>

        {/* ---- Right Column (2/5) ---- */}
        <div className="lg:col-span-2 space-y-8">
          {/* Buying Signals */}
          <motion.div variants={fadeUp}>
            <SectionLabel
              icon="trending_up"
              label="Buying Signals"
              count={buyingSignals.length}
            />
            {buyingSignals.length > 0 ? (
              <div className="space-y-2">
                {buyingSignals.map((signal, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 py-2.5 px-3 rounded-lg transition-colors ${
                      idx === 0
                        ? "bg-primary/5 border border-primary/15"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <UrgencyDot urgency={signal.urgency} />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-[13px] leading-[19px] ${
                          idx === 0
                            ? "text-foreground font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {signal.description}
                      </p>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-0.5 inline-block">
                        {signal.signal_type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground py-4">
                No buying signals detected.
              </p>
            )}
          </motion.div>

          {/* Pain Points */}
          <motion.div variants={fadeUp}>
            <SectionLabel
              icon="error_outline"
              label="Pain Points"
              count={painPoints.length}
            />
            {painPoints.length > 0 ? (
              <ul className="space-y-0 divide-y divide-border/50">
                {painPoints.map((point, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 py-2.5 group"
                  >
                    <span className="material-symbols-outlined text-[14px] text-red-400/70 mt-0.5 shrink-0">
                      arrow_right
                    </span>
                    <p className="text-[13px] leading-[19px] text-muted-foreground group-hover:text-foreground transition-colors">
                      {point}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-muted-foreground py-4">
                No pain points identified.
              </p>
            )}
          </motion.div>

          {/* Recommended Actions */}
          <motion.div variants={fadeUp}>
            <SectionLabel
              icon="auto_awesome"
              label="Recommended Actions"
              count={keySteps.length}
            />
            {keySteps.length > 0 ? (
              <div className="space-y-2">
                {keySteps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 py-2.5 px-3 rounded-lg border border-border/50 bg-card hover:border-primary/20 transition-colors group"
                  >
                    <div className="w-5 h-5 rounded-full border border-primary/30 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/10 transition-colors">
                      <span className="text-[10px] font-mono font-semibold text-primary">
                        {idx + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] leading-[19px] text-foreground">
                        {step}
                      </p>
                      {idx === 0 && (
                        <Link
                          href={`/accounts/${accountId}/outreach`}
                          className="text-primary text-[12px] font-medium hover:underline flex items-center gap-1 mt-1.5"
                        >
                          View Outreach Drafts
                          <span className="material-symbols-outlined text-[14px]">
                            arrow_forward
                          </span>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground py-4">
                No recommended actions at this time.
              </p>
            )}
          </motion.div>
        </div>
      </motion.div>

      {/* ================================================================= */}
      {/* ZONE 3: Agent Reasoning Trace (Collapsible)                       */}
      {/* ================================================================= */}
      {reasoningSteps.length > 0 && (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="border-t border-border pt-6 pb-4"
        >
          <button
            onClick={() => setReasoningOpen(!reasoningOpen)}
            className="flex items-center gap-2 group mb-4 w-full text-left"
          >
            <span className="material-symbols-outlined text-[18px] text-muted-foreground">
              memory
            </span>
            <h3 className="text-[13px] tracking-[0.04em] font-semibold uppercase text-muted-foreground">
              Agent Reasoning Trace
            </h3>
            <span className="ml-1 px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground">
              {reasoningSteps.length}
            </span>
            <span
              className={`material-symbols-outlined text-[16px] text-muted-foreground ml-auto transition-transform duration-200 ${
                reasoningOpen ? "rotate-180" : ""
              }`}
            >
              expand_more
            </span>
          </button>

          {reasoningOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-secondary/50 rounded-xl border border-border p-5 overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {reasoningSteps.map((step, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.25 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border/50 hover:border-border transition-colors"
                  >
                    <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <span className="text-[14px]">{step.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-0.5">
                        Step {idx + 1} ? {step.type}
                      </p>
                      <p className="text-[12px] leading-[17px] text-foreground/80">
                        {step.content}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
