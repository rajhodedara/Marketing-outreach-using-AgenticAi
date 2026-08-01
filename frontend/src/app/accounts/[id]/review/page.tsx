"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ReviewApprovalView({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const accountId = resolvedParams.id;
  const router = useRouter();

  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccountData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const fetchAccountData = async () => {
    try {
      const res = await fetch(`/api/accounts/${accountId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.latest_analysis?.result?.outreach_drafts) {
          setDrafts(data.latest_analysis.result.outreach_drafts);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const activeDraft = drafts[0] || null;

  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 lg:p-8 h-[calc(100vh-4rem)]">
      <div className="max-w-4xl mx-auto space-y-6 pb-8">
        
        {/* Header Section */}
        <div className="flex justify-between items-end border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <span className="text-[11px] leading-[16px] tracking-[0.05em] font-semibold uppercase">CAMPAIGN: Q4 ENTERPRISE EXPANSION</span>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              <span className="text-[11px] leading-[16px] tracking-[0.05em] font-semibold uppercase">ACME CORP</span>
            </div>
            <h2 className="text-[32px] leading-[40px] tracking-[-0.02em] font-semibold text-foreground">Review Outreach Draft</h2>
            <p className="text-[16px] leading-[24px] text-muted-foreground mt-1">Review AI-generated content and citations before finalizing synchronization to CRM.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-muted px-2 py-1 rounded font-mono text-[13px] text-muted-foreground border border-border">Draft ID: 89A-24F</span>
            <span className="bg-muted px-2 py-1 rounded font-mono text-[13px] text-muted-foreground border border-border flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">auto_awesome</span> AI Generated
            </span>
          </div>
        </div>
        
        {/* Bento Grid Layout for Review Content */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column: The Draft */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-border">
                <h3 className="text-[18px] leading-[24px] tracking-[-0.01em] font-semibold text-foreground">Email Draft</h3>
                <div className="flex gap-2">
                  <button className="text-muted-foreground hover:text-primary transition-colors p-1" title="Copy to clipboard">
                    <span className="material-symbols-outlined text-[20px]">content_copy</span>
                  </button>
                  <button className="text-muted-foreground hover:text-primary transition-colors p-1" title="Edit inline">
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
                  <span className="text-[11px] leading-[16px] tracking-[0.05em] font-semibold uppercase text-muted-foreground text-right">TO:</span>
                  <span className="text-[16px] leading-[24px] border border-border rounded px-2 py-1 bg-background flex items-center gap-2 w-fit">
                    <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[10px]">S</span>
                    Sarah Jenkins <span className="text-muted-foreground font-mono text-[11px]">&lt;s.jenkins@acmecorp.com&gt;</span>
                  </span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
                  <span className="text-[11px] leading-[16px] tracking-[0.05em] font-semibold uppercase text-muted-foreground text-right">SUBJECT:</span>
                  <span className="text-[16px] leading-[24px] border border-border rounded px-2 py-1 bg-background w-full font-medium">
                    {activeDraft ? "Review Outreach" : "Loading..."}
                  </span>
                </div>
                
                {/* The actual email content */}
                <div className="mt-6 border border-border rounded p-4 bg-background text-[18px] leading-relaxed text-foreground whitespace-pre-wrap relative">
                  <span className="absolute top-2 right-2 bg-muted text-xs px-2 py-1 rounded text-muted-foreground font-mono">Tone: Professional, Direct</span>
                  {activeDraft ? activeDraft.content : 'Loading draft...'}
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column: Citations & Context */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm h-full">
              <h3 className="text-[18px] leading-[24px] tracking-[-0.01em] font-semibold mb-4 flex items-center gap-2 pb-2 border-b border-border">
                <span className="material-symbols-outlined text-[20px] text-primary">fact_check</span> Citations
              </h3>
              
              <ul className="space-y-4">
                <li className="border border-border rounded p-3 bg-background">
                  <div className="flex items-start gap-2">
                    <span className="bg-primary/10 text-primary font-mono text-[10px] px-1.5 py-0.5 rounded mt-0.5">[1]</span>
                    <div>
                      <h4 className="text-[12px] leading-[16px] font-semibold">Q3 Earnings Transcript</h4>
                      <p className="text-[12px] leading-[16px] text-muted-foreground mt-1">"As we move into 2024, optimizing our new hybrid cloud deployment remains a central strategic objective to manage escalating operational costs."</p>
                      <Link href="#" className="text-[11px] leading-[16px] tracking-[0.05em] font-semibold uppercase text-primary mt-2 inline-flex items-center gap-1 hover:underline">
                        View Source <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                      </Link>
                    </div>
                  </div>
                </li>
                
                <li className="border border-border rounded p-3 bg-background">
                  <div className="flex items-start gap-2">
                    <span className="bg-primary/10 text-primary font-mono text-[10px] px-1.5 py-0.5 rounded mt-0.5">[2]</span>
                    <div>
                      <h4 className="text-[12px] leading-[16px] font-semibold">Internal Case Study</h4>
                      <p className="text-[12px] leading-[16px] text-muted-foreground mt-1">Metric derived from TechGlobal Inc. implementation (Q1 2023), approved for external use in enterprise segments.</p>
                    </div>
                  </div>
                </li>
              </ul>
              
              <div className="mt-6 pt-4 border-t border-border">
                <h4 className="text-[11px] leading-[16px] tracking-[0.05em] font-semibold uppercase text-muted-foreground mb-2">Sync Destination</h4>
                <div className="flex items-center gap-3 p-2 border border-border rounded bg-background">
                  <div className="w-6 h-6 flex items-center justify-center bg-blue-500 rounded text-white text-[10px] font-bold">SF</div>
                  <span className="text-[12px] leading-[16px] font-medium text-foreground">Salesforce (Production)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer Actions & Disclaimer */}
        <div className="mt-8 pt-6 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[12px] leading-[16px] text-muted-foreground flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">info</span>
            Drafts are generated for review only and will not be sent automatically.
          </p>
          <div className="flex gap-4">
            <button className="bg-card border border-border text-foreground px-6 py-2.5 rounded text-[16px] leading-[24px] font-medium hover:bg-muted transition-colors shadow-sm">
              Request Revisions
            </button>
            <button 
              onClick={() => router.push(`/accounts/${accountId}`)}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded text-[16px] leading-[24px] font-medium hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">sync</span>
              Approve & Sync to CRM
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
}
