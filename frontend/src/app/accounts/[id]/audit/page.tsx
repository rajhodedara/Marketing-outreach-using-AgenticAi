"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function GroundingVerificationAuditView({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const accountId = resolvedParams.id;
  const router = useRouter();

  const [criticVerdict, setCriticVerdict] = useState<any>(null);
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
        if (data.latest_analysis?.result?.critic_verdict) {
          setCriticVerdict(data.latest_analysis.result.critic_verdict);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const verdicts = criticVerdict?.verdicts || [];

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-background h-[calc(100vh-4rem)]">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-primary mb-2">
            <span className="material-symbols-outlined text-sm">verified_user</span>
            <span className="text-[11px] leading-[16px] tracking-[0.05em] font-semibold uppercase text-primary">QA Audit Log</span>
          </div>
          <h2 className="text-[32px] leading-[40px] tracking-[-0.02em] font-semibold text-foreground mb-2">Guardrail Verification</h2>
          <p className="text-[18px] leading-[28px] text-muted-foreground">Review the AI's self-correction process and claim verification for the generated outreach draft.</p>
        </div>
        
        {/* Claims List (Bento-style list) */}
        <div className="flex flex-col gap-4">
          
          {loading ? (
            <div className="text-muted-foreground">Loading audit log...</div>
          ) : verdicts.length > 0 ? (
            verdicts.map((verdict: any, idx: number) => {
              const isVerified = verdict.supported;
              return (
                <div key={idx} className={`bg-card border border-border rounded-lg p-6 flex gap-4 hover:shadow-sm transition-shadow ${!isVerified ? 'bg-gradient-to-r from-orange-50/50 to-transparent dark:from-orange-950/20' : ''}`}>
                  <div className="pt-1">
                    <span className={`material-symbols-outlined ${isVerified ? 'text-green-700' : 'text-orange-600'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                      {isVerified ? 'shield' : 'warning'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`${isVerified ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'} px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider`}>
                        {isVerified ? 'Verified' : 'Unverified'}
                      </span>
                      {isVerified && verdict.supporting_citation && (
                        <span className="text-[12px] leading-[16px] text-muted-foreground">Source: {verdict.supporting_citation.source_id}</span>
                      )}
                    </div>
                    <p className={`font-mono text-[13px] leading-[18px] mb-2 ${isVerified ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                      "{verdict.claim_text}"
                    </p>
                    
                    {!isVerified && (
                      <div className="bg-background border border-orange-200 dark:border-orange-900 rounded p-3 mt-2">
                        <p className="text-[12px] leading-[16px] text-orange-900 dark:text-orange-400 font-medium flex items-center gap-2">
                          <span className="material-symbols-outlined text-[14px]">info</span>
                          Source data inconclusive
                        </p>
                        <p className="text-[12px] leading-[16px] text-muted-foreground mt-1 ml-6">
                          {verdict.reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-muted-foreground">No verification claims available.</div>
          )}
          
        </div>
      </div>
    </div>
  );
}
