"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function OutreachStrategyView({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const accountId = resolvedParams.id;
  
  const [activeStep, setActiveStep] = useState(1);
  const [showCitation, setShowCitation] = useState(false);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Controlled fields for email sending
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  
  const activeDraft = drafts[activeStep - 1] || null;

  useEffect(() => {
    if (activeDraft) {
      // Create a fake email for the persona or let user edit it
      const nameOnly = activeDraft.target_persona.split('(')[0].trim();
      const fakeEmail = nameOnly.toLowerCase().replace(/[^a-z0-9]/g, '.') + "@example.com";
      setToEmail(fakeEmail);
      setSubject("Addressing your core priorities");
    }
  }, [activeDraft, activeStep]);

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

  const regenerateDraft = async () => {
    if (!accountId || drafts.length === 0) return;
    const toastId = toast.loading("Re-generating draft with AI...", { description: "Agent is rewriting the draft based on latest insights." });
    try {
      const res = await fetch(`/api/accounts/${accountId}/drafts/${activeStep - 1}/regenerate`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Failed to regenerate");
      const data = await res.json();
      
      const newDrafts = [...drafts];
      newDrafts[activeStep - 1] = data.draft;
      setDrafts(newDrafts);
      
      toast.success("Draft successfully re-generated!", { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error("Failed to regenerate draft.", { id: toastId });
    }
  };

  const handleSendEmail = async () => {
    if (!accountId || !activeDraft) return;
    const toastId = toast.loading("Sending email...", { description: "Dispatching via SMTP relay..." });
    try {
      const res = await fetch(`/api/accounts/${accountId}/drafts/${activeStep - 1}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_email: toEmail,
          subject: subject,
          content: activeDraft.content
        })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to send");
      }
      toast.success("Email sent successfully!", { id: toastId });
    } catch (e: any) {
      console.error(e);
      toast.error(`Send failed: ${e.message}`, { id: toastId });
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-background h-[calc(100vh-4rem)]">
      {/* Left Pane: Sequence Stepper */}
      <aside className="w-72 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-6 border-b border-border bg-muted/50">
          <h2 className="text-[18px] leading-[24px] tracking-[-0.01em] font-semibold text-foreground">Campaign: Q4 Meridian Push</h2>
          <p className="text-[12px] leading-[16px] text-muted-foreground mt-1">Targeting VPs of IT Infrastructure</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="text-[11px] leading-[16px] tracking-[0.05em] font-semibold uppercase text-muted-foreground mb-4">Sequence Steps</div>
          
          {drafts.length > 0 ? drafts.map((draft, idx) => (
            <div key={idx} className="relative pl-6 pb-6">
              {idx < drafts.length - 1 && <div className="absolute left-1.5 top-2 bottom-0 w-px bg-border"></div>}
              <div className={`absolute left-0 top-1 w-3 h-3 rounded-full ${activeStep === idx + 1 ? 'bg-primary ring-4 ring-primary/30' : 'bg-border border border-muted-foreground/30'}`}></div>
              <div 
                className={`${activeStep === idx + 1 ? 'bg-muted/50 border-primary/50 shadow-sm' : 'bg-card border-border hover:border-muted-foreground opacity-70'} border rounded p-3 cursor-pointer transition-colors`}
                onClick={() => setActiveStep(idx + 1)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[11px] leading-[16px] tracking-[0.05em] font-semibold uppercase ${activeStep === idx + 1 ? 'text-primary' : 'text-muted-foreground'}`}>Step {idx + 1}</span>
                  <span className="text-[11px] leading-[16px] tracking-[0.05em] font-semibold uppercase text-muted-foreground bg-border/50 px-2 py-0.5 rounded-sm">{draft.channel}</span>
                </div>
                <div className={`text-[16px] leading-[24px] ${activeStep === idx + 1 ? 'text-foreground font-medium' : 'text-foreground'}`}>{draft.target_persona.split('(')[0].trim()}</div>
                {draft.channel.toLowerCase() === 'email' && <div className="text-[12px] leading-[16px] text-muted-foreground mt-1 line-clamp-1">Subject: ...</div>}
              </div>
            </div>
          )) : (
            <div className="text-[12px] text-muted-foreground">{loading ? 'Loading drafts...' : 'No drafts available for this account.'}</div>
          )}
          
          <button className="mt-6 w-full py-2 border border-dashed border-border rounded text-muted-foreground text-[12px] leading-[16px] hover:bg-muted/50 transition-colors flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-[16px]">add</span> Add Step
          </button>
        </div>
      </aside>
      
      {/* Center Pane: Email Editor */}
      <section className="flex-1 flex flex-col min-w-0 bg-card relative">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-[11px] leading-[16px] tracking-[0.05em] font-semibold uppercase text-muted-foreground mb-1">Editing Draft • Meridian Health</div>
            <h2 className="text-[18px] leading-[24px] tracking-[-0.01em] font-semibold text-foreground">Initial Outreach Email</h2>
          </div>
          <div className="flex gap-2">
            <button 
              suppressHydrationWarning
              className="bg-card text-foreground border border-border text-[12px] leading-[16px] px-4 py-2 rounded hover:bg-muted transition-colors flex items-center gap-1 disabled:opacity-50"
              onClick={regenerateDraft}
              disabled={loading || drafts.length === 0}
            >
              <span className="material-symbols-outlined text-[16px]">magic_button</span> Re-generate
            </button>
            <button 
              suppressHydrationWarning
              onClick={handleSendEmail}
              disabled={loading || drafts.length === 0}
              className="bg-primary text-primary-foreground text-[12px] leading-[16px] px-4 py-2 rounded hover:bg-primary/90 transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">send</span> Approve & Schedule
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Email Header */}
            <div className="bg-muted border border-border rounded p-3 space-y-2">
              <div className="flex items-center gap-3">
                <span className="w-16 text-right text-[11px] leading-[16px] tracking-[0.05em] font-semibold uppercase text-muted-foreground">To:</span>
                <input 
                  className="text-[16px] leading-[24px] text-foreground bg-card border border-border px-2 py-1 rounded-sm w-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent" 
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  placeholder="recipient@example.com"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="w-16 text-right text-[11px] leading-[16px] tracking-[0.05em] font-semibold uppercase text-muted-foreground">Subject:</span>
                <input 
                  className="text-[16px] leading-[24px] text-foreground bg-card border border-border px-2 py-1 rounded-sm w-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent" 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email Subject"
                />
              </div>
            </div>
            
            {/* Email Body */}
            <div className="bg-card border border-border rounded p-6 min-h-[400px] shadow-sm text-[16px] leading-relaxed text-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-primary/20 whitespace-pre-wrap">
              {activeDraft ? activeDraft.content : (loading ? 'Loading draft content...' : 'No draft content available.')}
            </div>
          </div>
        </div>
      </section>
      
      {/* Right Pane: Citation Inspector */}
      {showCitation && (
        <aside className="w-80 border-l border-border bg-background flex flex-col shrink-0 shadow-[-4px_0_12px_rgba(0,0,0,0.02)]">
          <div className="p-3 border-b border-border bg-card flex items-center justify-between">
            <div className="flex items-center gap-1 text-primary">
              <span className="material-symbols-outlined text-[18px]">menu_book</span>
              <span className="text-[11px] leading-[16px] tracking-[0.05em] font-bold uppercase">Citation Inspector</span>
            </div>
            <button className="text-muted-foreground hover:text-foreground" onClick={() => setShowCitation(false)}>
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* Source Info */}
            <div className="bg-card border border-border rounded p-2">
              <div className="text-[11px] leading-[16px] tracking-[0.05em] font-semibold uppercase text-muted-foreground mb-1">Source Document</div>
              <div className="text-[12px] leading-[16px] font-medium flex items-center gap-1 mb-1">
                <span className="material-symbols-outlined text-[16px] text-muted-foreground">description</span> Earnings Call Transcript
              </div>
              <div className="text-[12px] leading-[16px] text-muted-foreground">Meridian Health Q3 2023 • Oct 14</div>
            </div>
            
            {/* Excerpt */}
            <div>
              <div className="text-[11px] leading-[16px] tracking-[0.05em] font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                <span className="inline-flex items-center justify-center w-4 h-4 bg-primary text-primary-foreground rounded-full text-[10px]">1</span> Excerpt Match
              </div>
              <div className="bg-[#1e1e1e] rounded p-2 border border-border/30">
                <div className="font-mono text-[13px] leading-[18px] text-[#d4d4d4]">
                  <span className="text-[#569cd6]">CIO (David Chen):</span> "...yes, our expansion has been aggressive. The challenge we're facing now is network latency. We've seen a <span className="bg-[#ffff00]/30 text-white px-1">40% increase in diagnostic imaging data</span> flowing from these new satellite clinics, and frankly, our current MPLS setup is bottlenecking."
                </div>
              </div>
            </div>
            
            <div className="border-t border-border pt-3 mt-3">
              <div className="text-[11px] leading-[16px] tracking-[0.05em] font-semibold uppercase text-muted-foreground mb-2">AI Reasoning</div>
              <p className="text-[12px] leading-[16px] text-muted-foreground">
                The system highlighted this metric to establish immediate relevance with the prospect's known pain point regarding infrastructure scaling for medical imaging.
              </p>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
