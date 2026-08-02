"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Account = {
  id: string;
  domain: string | null;
  company_name: string | null;
  created_at: string;
  status: string;
  intent_score?: number | string;
  stakeholders_count?: number;
};

export default function AccountsPage() {
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAccounts();
  }, [fetchAccounts]);

  const getStatusDisplay = (status: string) => {
    const lowerStatus = (status || "").toLowerCase();
    if (lowerStatus === 'analyzed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
          Analyzed
        </span>
      );
    } else if (lowerStatus === 'error' || lowerStatus === 'needs_refresh') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium bg-[#fffbeb] text-[#b45309] border border-[#fde68a]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></span>
          Needs Refresh
        </span>
      );
    } else if (lowerStatus === 'pending') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></span>
          Pending
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] animate-pulse">
          <span className="material-symbols-outlined text-[12px] spin-slow">sync</span>
          Processing
        </span>
      );
    }
  };

  const getIntentScore = (scoreValue?: number | string) => {
    if (scoreValue === undefined || scoreValue === null || scoreValue === "--") {
      return (
        <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted text-muted-foreground font-mono text-[13px] border border-border">
          --
          <span className="material-symbols-outlined text-[14px] ml-1">remove</span>
        </div>
      );
    }

    const score = typeof scoreValue === "number" ? scoreValue : Number(scoreValue);
    
    if (score >= 80) {
      return (
        <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-primary text-primary-foreground font-mono text-[13px] shadow-sm">
          {score}
          <span className="material-symbols-outlined text-[14px] ml-1">local_fire_department</span>
        </div>
      );
    } else if (score >= 70) {
      return (
        <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#dee1ff] border border-[#b9c3ff] text-[#001258] font-mono text-[13px]">
          {score}
          <span className="material-symbols-outlined text-[14px] ml-1 text-primary">trending_up</span>
        </div>
      );
    } else {
      return (
        <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted text-muted-foreground font-mono text-[13px] border border-border">
          {score}
          <span className="material-symbols-outlined text-[14px] ml-1">remove</span>
        </div>
      );
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto space-y-6 p-6">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h2 className="text-[32px] leading-[40px] tracking-[-0.02em] font-semibold text-foreground mb-2">Accounts Overview</h2>
          <p className="text-[16px] leading-[24px] text-muted-foreground">Manage and monitor target enterprise accounts.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-card border border-border rounded-lg p-4 min-w-[140px] shadow-sm">
            <div className="text-[11px] leading-[16px] tracking-[0.05em] font-semibold uppercase text-muted-foreground mb-1">TOTAL ACCOUNTS</div>
            <div className="font-mono text-[24px] font-medium text-foreground">{loading ? "-" : accounts.length}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 min-w-[140px] shadow-sm border-l-4 border-l-primary">
            <div className="text-[11px] leading-[16px] tracking-[0.05em] font-semibold uppercase text-muted-foreground mb-1">HIGH INTENT</div>
            <div className="font-mono text-[24px] font-medium text-primary">87</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 min-w-[140px] shadow-sm">
            <div className="text-[11px] leading-[16px] tracking-[0.05em] font-semibold uppercase text-muted-foreground mb-1">PROCESSING</div>
            <div className="font-mono text-[24px] font-medium text-foreground">{loading ? "-" : accounts.filter(a => a.status === 'pending').length}</div>
          </div>
        </div>
      </div>

      {/* Data Table Container */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-border bg-sidebar">
          <div className="flex items-center gap-2">
            <button className="p-1.5 border border-border rounded bg-card text-muted-foreground hover:text-foreground transition-colors">
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
            </button>
            <span className="text-[12px] leading-[16px] font-medium text-muted-foreground">Filtered by: <span className="text-foreground">All Tiers</span></span>
          </div>
          <div className="flex gap-2">
            <button className="p-1.5 border border-border rounded bg-card text-muted-foreground hover:text-foreground transition-colors">
              <span className="material-symbols-outlined text-[18px]">view_column</span>
            </button>
            <button className="p-1.5 border border-border rounded bg-card text-muted-foreground hover:text-foreground transition-colors">
              <span className="material-symbols-outlined text-[18px]">more_horiz</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-border bg-sidebar">
                <th className="px-6 py-3 text-[11px] leading-[16px] tracking-[0.05em] text-muted-foreground font-semibold uppercase w-1/3">Account</th>
                <th className="px-6 py-3 text-[11px] leading-[16px] tracking-[0.05em] text-muted-foreground font-semibold uppercase">Intent Score</th>
                <th className="px-6 py-3 text-[11px] leading-[16px] tracking-[0.05em] text-muted-foreground font-semibold uppercase">Status</th>
                <th className="px-6 py-3 text-[11px] leading-[16px] tracking-[0.05em] text-muted-foreground font-semibold uppercase text-right">Stakeholders</th>
                <th className="px-6 py-3 text-[11px] leading-[16px] tracking-[0.05em] text-muted-foreground font-semibold uppercase text-right">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-[12px] leading-[16px]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex justify-center mb-2">
                      <span className="material-symbols-outlined text-[24px] spin-slow">sync</span>
                    </div>
                    Loading accounts...
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No accounts found. Upload data to get started.
                  </td>
                </tr>
              ) : (
                accounts.map((account) => {
                  const initial = (account.company_name || account.domain || "?").charAt(0).toUpperCase();
                  const name = account.company_name || account.domain || "Unknown account";
                  
                  return (
                    <tr 
                      key={account.id} 
                      className="hover:bg-muted/50 transition-colors group cursor-pointer"
                      onClick={() => router.push(`/accounts/${account.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded border border-border bg-card flex items-center justify-center shrink-0">
                            <span className="text-[18px] font-bold text-foreground">{initial}</span>
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{name}</div>
                            <div className="text-muted-foreground text-[11px] mt-0.5">{account.domain}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getIntentScore(account.intent_score)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusDisplay(account.status)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-[13px] text-muted-foreground">
                        {account.stakeholders_count ?? 0}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-[13px] text-muted-foreground">
                        {new Date(account.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-card">
          <span className="text-[12px] leading-[16px] text-muted-foreground">
            Showing {accounts.length > 0 ? 1 : 0} to {accounts.length} of {accounts.length} entries
          </span>
          <div className="flex gap-1">
            <button className="px-2 py-1 border border-border rounded bg-card text-muted-foreground hover:bg-muted disabled:opacity-50" disabled={true}>
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>
            <button className="px-2 py-1 border border-border rounded bg-card text-muted-foreground hover:bg-muted disabled:opacity-50" disabled={loading || accounts.length === 0}>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
