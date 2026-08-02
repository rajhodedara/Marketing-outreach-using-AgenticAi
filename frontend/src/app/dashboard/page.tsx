"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Account = {
  id: string;
  domain: string | null;
  company_name: string | null;
  industry: string | null;
  created_at: string;
  status: string;
  intent_score?: number | string;
  stakeholders_count?: number;
};

type ActivityEvent = {
  id: string;
  icon: string;
  iconColor: string;
  borderColor: string;
  title: string;
  description: string;
  timestamp: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}

function deriveActivityFeed(accounts: Account[]): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  for (const a of accounts) {
    const name = a.company_name || a.domain || "Unknown";

    if (a.status?.toLowerCase() === "analyzed") {
      events.push({
        id: `analyzed-${a.id}`,
        icon: "check_circle",
        iconColor: "text-primary",
        borderColor: "border-l-primary",
        title: "Analysis completed",
        description: `Full account analysis finished for ${name}`,
        timestamp: a.created_at,
      });
    }

    const score =
      typeof a.intent_score === "number"
        ? a.intent_score
        : Number(a.intent_score);
    if (!isNaN(score) && score >= 80) {
      events.push({
        id: `intent-${a.id}`,
        icon: "local_fire_department",
        iconColor: "text-orange-400",
        borderColor: "border-l-orange-400",
        title: "High intent detected",
        description: `${name} flagged as high-intent with score ${score}`,
        timestamp: a.created_at,
      });
    }

    if (a.stakeholders_count && a.stakeholders_count > 0) {
      events.push({
        id: `stakeholders-${a.id}`,
        icon: "groups",
        iconColor: "text-sky-400",
        borderColor: "border-l-sky-400",
        title: "Stakeholders mapped",
        description: `${a.stakeholders_count} decision-makers identified for ${name}`,
        timestamp: a.created_at,
      });
    }
  }

  // Sort by timestamp descending, take top 8
  events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  return events.slice(0, 8);
}

// ---------------------------------------------------------------------------
// Animation Variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45 },
  },
};

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.3 },
  },
};

const rowVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35 },
  },
};

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  icon,
  accent,
  subtitle,
}: {
  label: string;
  value: string | number;
  icon: string;
  accent?: boolean;
  subtitle?: string;
}) {
  return (
    <motion.div
      variants={cardVariants}
      className={`relative bg-card border rounded-xl p-5 shadow-sm overflow-hidden group transition-colors hover:border-primary/30 ${
        accent ? "border-primary/40" : "border-border"
      }`}
    >
      {/* Subtle gradient glow on accent cards */}
      {accent && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      )}

      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-2">
          <p className="text-[11px] leading-[16px] tracking-[0.05em] font-semibold uppercase text-muted-foreground">
            {label}
          </p>
          <p
            className={`font-mono text-[32px] leading-[40px] font-semibold tracking-tight ${
              accent ? "text-primary" : "text-foreground"
            }`}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-[12px] leading-[16px] text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            accent
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">{icon}</span>
        </div>
      </div>
    </motion.div>
  );
}

function IntentBadge({ score }: { score: number | string | undefined }) {
  if (score === undefined || score === null || score === "--") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-mono text-[12px] border border-border">
        --
      </span>
    );
  }
  const numScore = typeof score === "number" ? score : Number(score);
  if (numScore >= 80) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/15 text-primary font-mono text-[12px] font-semibold border border-primary/20">
        {numScore}
        <span className="material-symbols-outlined text-[14px]">
          local_fire_department
        </span>
      </span>
    );
  }
  if (numScore >= 70) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 font-mono text-[12px] font-semibold border border-sky-500/20">
        {numScore}
        <span className="material-symbols-outlined text-[14px]">
          trending_up
        </span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-mono text-[12px] border border-border">
      {numScore}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  if (s === "analyzed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        Analyzed
      </span>
    );
  }
  if (s === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20 animate-pulse">
      <span className="material-symbols-outlined text-[12px] spin-slow">
        sync
      </span>
      Processing
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error("Failed to fetch accounts", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Derived KPIs
  const kpis = useMemo(() => {
    const numericScores = accounts
      .map((a) =>
        typeof a.intent_score === "number"
          ? a.intent_score
          : Number(a.intent_score)
      )
      .filter((s) => !isNaN(s));

    const totalAccounts = accounts.length;
    const highIntent = numericScores.filter((s) => s >= 80).length;
    const totalStakeholders = accounts.reduce(
      (sum, a) => sum + (a.stakeholders_count || 0),
      0
    );
    const avgIntent =
      numericScores.length > 0
        ? Math.round(
            numericScores.reduce((sum, s) => sum + s, 0) /
              numericScores.length
          )
        : 0;

    return { totalAccounts, highIntent, totalStakeholders, avgIntent };
  }, [accounts]);

  // Priority accounts ? sorted by intent score desc, top 5
  const priorityAccounts = useMemo(() => {
    return [...accounts]
      .filter((a) => a.status?.toLowerCase() === "analyzed")
      .sort((a, b) => {
        const sa =
          typeof a.intent_score === "number"
            ? a.intent_score
            : Number(a.intent_score) || 0;
        const sb =
          typeof b.intent_score === "number"
            ? b.intent_score
            : Number(b.intent_score) || 0;
        return sb - sa;
      })
      .slice(0, 5);
  }, [accounts]);

  // Activity feed
  const activityFeed = useMemo(
    () => deriveActivityFeed(accounts),
    [accounts]
  );

  // Skeleton placeholders while loading
  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto space-y-8 p-2">
        {/* Greeting skeleton */}
        <div className="space-y-2 pt-2">
          <div className="h-8 w-64 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-96 bg-muted/60 rounded animate-pulse" />
        </div>
        {/* KPI skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-xl p-5 space-y-3 animate-pulse"
            >
              <div className="h-3 w-20 bg-muted rounded" />
              <div className="h-8 w-16 bg-muted rounded" />
            </div>
          ))}
        </div>
        {/* Table skeleton */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 animate-pulse">
          <div className="h-5 w-48 bg-muted rounded" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-muted/40 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto space-y-8 p-2">
      {/* ----------------------------------------------------------------- */}
      {/* Greeting Header                                                    */}
      {/* ----------------------------------------------------------------- */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-2"
      >
        <div>
          <h1 className="text-[32px] leading-[40px] font-semibold text-foreground tracking-tight">
            {getGreeting()} 👋
          </h1>
          <p className="text-[16px] leading-[24px] text-muted-foreground mt-1">
            Here&apos;s your ABM pipeline overview for today.
          </p>
        </div>
        <button
          onClick={() => router.push("/upload")}
          className="flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-[14px] font-semibold hover:bg-primary/90 transition-colors shadow-sm shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Account
        </button>
      </motion.div>

      {/* ----------------------------------------------------------------- */}
      {/* KPI Metric Cards                                                   */}
      {/* ----------------------------------------------------------------- */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <KpiCard
          label="Total Accounts"
          value={kpis.totalAccounts}
          icon="corporate_fare"
          subtitle="Across all tiers"
        />
        <KpiCard
          label="High Intent"
          value={kpis.highIntent}
          icon="local_fire_department"
          accent
          subtitle="Score ≥ 80"
        />
        <KpiCard
          label="Stakeholders Mapped"
          value={kpis.totalStakeholders}
          icon="groups"
          subtitle="Decision-makers identified"
        />
        <KpiCard
          label="Avg Intent Score"
          value={kpis.avgIntent > 0 ? kpis.avgIntent : "--"}
          icon="speed"
          subtitle={
            kpis.avgIntent >= 75
              ? "Strong pipeline signal"
              : kpis.avgIntent > 0
              ? "Building momentum"
              : "No data yet"
          }
        />
      </motion.div>

      {/* ----------------------------------------------------------------- */}
      {/* Two-Column: Priority Accounts + Activity Feed                      */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* ---- Priority Accounts (3/5 width) ---- */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="xl:col-span-3 bg-card border border-border rounded-xl shadow-sm overflow-hidden"
        >
          {/* Section header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">
                priority_high
              </span>
              <h2 className="text-[16px] leading-[24px] font-semibold text-foreground">
                Priority Accounts
              </h2>
              <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
                Top {priorityAccounts.length}
              </span>
            </div>
            <button
              onClick={() => router.push("/workspace")}
              className="text-[12px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              View all
              <span className="material-symbols-outlined text-[16px]">
                arrow_forward
              </span>
            </button>
          </div>

          {/* Account rows */}
          {priorityAccounts.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <span className="material-symbols-outlined text-[40px] text-muted-foreground/40 mb-3 block">
                inbox
              </span>
              <p className="text-[14px] text-muted-foreground mb-4">
                No analyzed accounts yet.
              </p>
              <button
                onClick={() => router.push("/upload")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">
                  upload
                </span>
                Upload your first account
              </button>
            </div>
          ) : (
            <motion.div
              variants={listVariants}
              initial="hidden"
              animate="visible"
            >
              {priorityAccounts.map((account, idx) => {
                const initial = (
                  account.company_name ||
                  account.domain ||
                  "?"
                )
                  .charAt(0)
                  .toUpperCase();
                const name =
                  account.company_name || account.domain || "Unknown account";

                return (
                  <motion.div
                    key={account.id}
                    variants={rowVariants}
                    className={`flex items-center gap-4 px-6 py-4 hover:bg-muted/40 transition-colors group cursor-pointer ${
                      idx < priorityAccounts.length - 1
                        ? "border-b border-border/50"
                        : ""
                    }`}
                    onClick={() => router.push(`/accounts/${account.id}`)}
                  >
                    {/* Rank + Avatar */}
                    <span className="text-[12px] font-mono text-muted-foreground w-5 text-right shrink-0">
                      {idx + 1}
                    </span>
                    <div className="w-9 h-9 rounded-lg border border-border bg-muted flex items-center justify-center shrink-0">
                      <span className="text-[16px] font-bold text-foreground">
                        {initial}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {account.domain || "No domain"}
                        {account.industry ? ` · ${account.industry}` : ""}
                      </p>
                    </div>

                    {/* Intent + Status */}
                    <div className="flex items-center gap-3 shrink-0">
                      <IntentBadge score={account.intent_score} />
                      <StatusPill status={account.status} />
                      <span className="text-[12px] font-mono text-muted-foreground hidden lg:block w-16 text-right">
                        {account.stakeholders_count || 0}{" "}
                        <span className="text-[10px]">ppl</span>
                      </span>
                    </div>

                    {/* Action arrow */}
                    <span className="material-symbols-outlined text-[18px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      chevron_right
                    </span>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </motion.div>

        {/* ---- Recent Activity (2/5 width) ---- */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
          className="xl:col-span-2 bg-card border border-border rounded-xl shadow-sm overflow-hidden"
        >
          {/* Section header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-muted-foreground">
                bolt
              </span>
              <h2 className="text-[16px] leading-[24px] font-semibold text-foreground">
                Recent Activity
              </h2>
            </div>
          </div>

          {/* Activity feed */}
          {activityFeed.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <span className="material-symbols-outlined text-[40px] text-muted-foreground/40 mb-3 block">
                history
              </span>
              <p className="text-[14px] text-muted-foreground">
                No activity yet. Analyze an account to see events here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50 max-h-[480px] overflow-y-auto">
              {activityFeed.map((event, idx) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + idx * 0.05, duration: 0.3 }}
                  className={`flex gap-3 px-6 py-3.5 hover:bg-muted/30 transition-colors border-l-2 ${event.borderColor}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <span
                      className={`material-symbols-outlined text-[16px] ${event.iconColor}`}
                    >
                      {event.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground">
                      {event.title}
                    </p>
                    <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
                      {event.description}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0 mt-0.5">
                    {getTimeAgo(event.timestamp)}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
