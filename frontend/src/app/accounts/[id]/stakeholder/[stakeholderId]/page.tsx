"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function StakeholderDetailView({ params }: { params: Promise<{ id: string, stakeholderId: string }> }) {
  const resolvedParams = use(params);
  const accountId = resolvedParams.id;
  const stakeholderId = resolvedParams.stakeholderId; // e.g. "0", "1", "2"
  const router = useRouter();

  const [stakeholders, setStakeholders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccountData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const fetchAccountData = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/accounts/${accountId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.latest_analysis?.result?.stakeholders) {
          setStakeholders(data.latest_analysis.result.stakeholders);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const data = stakeholders[parseInt(stakeholderId)];
  if (!data) return null;

  return (
    <div className="h-[calc(100vh-4rem)] w-full overflow-hidden flex font-body-md relative bg-background">
      {/* Background Context (Blurred Dashboard) */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-300 blur-sm opacity-60" 
        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDcwD4hlXXJ9dlhWKDY26cUHd4_0aO9IbcBbxSsQIXtzLbYpdMJfUGpM5INOVV3IznjvnKWV54W3N0AUUHe7hoir1kRZQLWRgVZgM36u-PbYXi1uBjZPCyGPtZJMLROExeQx_Q0KBqRCk-DX6nWJfhR0PsljD4UOJZQR6K48jsHKKxkavJCxY2fCsLXQKW48ogGJ09rAFjPZmLzc6ijwYFe9TMGWZL3OJO7PdjQYf0x0sz4Yqrvr1rw5w')" }}
      >
        <div className="absolute inset-0 bg-background/40"></div>
      </div>
      
      {/* Main Content Area */}
      <main className="flex-1 flex justify-end relative z-10 w-full h-full">
        {/* Backdrop for closing */}
        <div aria-label="Close panel" className="absolute inset-0 cursor-pointer" onClick={() => router.push(`/accounts/${accountId}`)}></div>
        
        {/* Slide-over Panel */}
        <aside className="w-full max-w-[480px] h-full bg-card shadow-[-12px_0_24px_-4px_rgba(0,0,0,0.1)] border-l border-border flex flex-col relative z-20">
          
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-primary text-[20px] font-bold border border-border">
                {data.name.split(" ").map((n: string) => n[0]).join("")}
              </div>
              <div>
                <h2 className="text-[18px] leading-[24px] tracking-[-0.01em] font-semibold text-foreground">{data.name}</h2>
                <p className="text-[12px] leading-[16px] text-muted-foreground">{data.role}</p>
              </div>
            </div>
            <button 
              onClick={() => router.push(`/accounts/${accountId}`)}
              aria-label="Close panel" 
              className="w-8 h-8 flex items-center justify-center rounded text-muted-foreground hover:bg-muted transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </header>
          
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
            
            {/* Quick Actions */}
            <div className="flex gap-2">
              <Link href={`/accounts/${accountId}/outreach`} className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-primary text-primary-foreground rounded text-[12px] leading-[16px] font-medium hover:bg-primary/90 transition-colors">
                <span className="material-symbols-outlined text-[16px]">mail</span>
                Email
              </Link>
              <button className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-background border border-border text-foreground rounded text-[12px] leading-[16px] font-medium hover:bg-muted transition-colors">
                <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                Meeting
              </button>
              <button className="w-10 h-10 flex items-center justify-center bg-background border border-border text-muted-foreground rounded hover:bg-muted transition-colors">
                <span className="material-symbols-outlined text-[20px]">more_horiz</span>
              </button>
            </div>
            
            {/* Inferred Priorities */}
            <section>
              <h3 className="text-[11px] leading-[16px] tracking-[0.05em] font-semibold uppercase text-muted-foreground mb-2">Key Concerns</h3>
              <div className="flex flex-wrap gap-2">
                {data.key_concerns?.map((concern: string, i: number) => (
                  <div key={i} className={`px-2 py-1 ${i === 0 ? 'bg-primary/10 border-primary/20 text-primary' : i === 1 ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-muted border-border text-foreground'} border rounded flex items-center gap-1`}>
                    <span className="material-symbols-outlined text-[14px]">
                      {i === 0 ? 'trending_up' : i === 1 ? 'group' : 'monitor_heart'}
                    </span>
                    <span className="text-[12px] leading-[16px]">{concern}</span>
                  </div>
                ))}
              </div>
            </section>
            
            {/* Extracted Quotes */}
            <section>
              <h3 className="text-[11px] leading-[16px] tracking-[0.05em] font-semibold uppercase text-muted-foreground mb-3">Direct Quotes & Insights</h3>
              <div className="space-y-4">
                {/* Fallback mock quotes since backend schema doesn't have quotes yet */}
                <div className="p-4 bg-background border border-border rounded-lg relative group shadow-sm">
                  <div className="absolute -left-3 top-4 bg-card p-1 border border-border rounded-full text-muted-foreground">
                    <span className="material-symbols-outlined text-[14px]">format_quote</span>
                  </div>
                  <p className="font-mono text-[13px] leading-[18px] text-foreground mb-2">
                    "We need a systemic fix, not a patch."
                  </p>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span className="material-symbols-outlined text-[12px]">call</span>
                    <span className="text-[12px] leading-[16px]">Call — Oct 14</span>
                  </div>
                </div>
              </div>
            </section>
            
            {/* Relationship History Timeline */}
            <section>
              <h3 className="text-[11px] leading-[16px] tracking-[0.05em] font-semibold uppercase text-muted-foreground mb-3">Relationship History</h3>
              <div className="relative pl-4 border-l border-border space-y-6 ml-2 pb-8">
                {data.history?.map((event: any, i: number) => (
                  <div key={i} className="relative">
                    <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-primary' : 'bg-muted-foreground'} ring-4 ring-card`}></div>
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="text-[16px] leading-[24px] font-medium text-foreground">{event.title}</h4>
                      <span className="text-[12px] leading-[16px] text-muted-foreground">{event.date}</span>
                    </div>
                    <p className="text-[12px] leading-[16px] text-muted-foreground">{event.desc}</p>
                  </div>
                ))}
                {!data.history?.length && <div className="text-muted-foreground text-sm">No history available</div>}
              </div>
            </section>
            
          </div>
        </aside>
      </main>
    </div>
  );
}
