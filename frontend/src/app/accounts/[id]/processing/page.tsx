"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AIProcessingView({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const accountId = resolvedParams.id;
  const router = useRouter();

  const [account, setAccount] = useState<{ company_name: string; domain: string } | null>(null);
  const [messages, setMessages] = useState<string[]>([
    "> Connecting to intent data sources... OK",
    "> Analyzing recent news articles...",
    "> Scanning transcript segments for budget mentions..."
  ]);
  const [currentStep, setCurrentStep] = useState(2); // 0, 1 complete. 2 in progress

  useEffect(() => {
    // Start the analysis when entering this page
    startAnalysis();
    
    // Simulate terminal output updates
    const terminalInterval = setInterval(() => {
      const msgs = [
        "> Found 3 recent funding signals...",
        "> Cross-referencing executive job changes...",
        "> Detecting high intent for 'Enterprise Security'...",
        "> Synthesizing signal clusters...",
        "> Drafting persona-specific sequences...",
        "> Validating claims against constraints..."
      ];
      setMessages(prev => {
        const newMsg = msgs[Math.floor(Math.random() * msgs.length)];
        const next = [...prev, newMsg];
        if (next.length > 4) next.shift();
        return next;
      });
    }, 2500);

    return () => clearInterval(terminalInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startAnalysis = async () => {
    try {
      // Get basic account info first
      const accountRes = await fetch(`http://localhost:8000/api/accounts/${accountId}`);
      if (accountRes.ok) {
        const data = await accountRes.json();
        setAccount({ company_name: data.company_name || data.domain, domain: data.domain });
      }

      // Trigger analysis
      const res = await fetch(`http://localhost:8000/api/accounts/${accountId}/analyze`, {
        method: 'POST'
      });
      
      let sessionId = null;
      if (res.ok) {
          const result = await res.json();
          sessionId = result.session_id;
      }
      
      // We will just wait 5 seconds and then transition to simulate completion for now
      // Or we can actually poll
      pollStatus(sessionId);
    } catch (e) {
      console.error(e);
      toast.error("Failed to start analysis");
      setTimeout(() => router.push(`/accounts/${accountId}`), 2000);
    }
  };

  const pollStatus = async (sessionId: string | null) => {
    const pollInterval = setInterval(async () => {
      try {
        if (!sessionId) {
          // fallback
          const res = await fetch(`http://localhost:8000/api/accounts/${accountId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'completed' || data.status === 'analyzed') {
              clearInterval(pollInterval);
              setCurrentStep(4);
              toast.success("Analysis Complete");
              setTimeout(() => {
                router.push(`/accounts/${accountId}`);
              }, 1000);
            } else {
              setCurrentStep(prev => prev < 4 ? prev + 0.5 : prev);
            }
          }
          return;
        }

        const res = await fetch(`http://localhost:8000/api/analysis/${sessionId}`);
        if (res.ok) {
          const session = await res.json();
          if (session.status === 'completed') {
            clearInterval(pollInterval);
            setCurrentStep(4);
            toast.success("Analysis Complete");
            setTimeout(() => {
              router.push(`/accounts/${accountId}`);
            }, 1000);
          } else if (session.status === 'failed') {
            clearInterval(pollInterval);
            toast.error("Analysis Failed");
            setTimeout(() => {
              router.push(`/accounts/${accountId}`);
            }, 1000);
          } else {
            // Update step based on random progression if still pending
            setCurrentStep(prev => prev < 4 ? prev + 0.5 : prev);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }, 3000);
  };

  const cancelAnalysis = () => {
    router.push(`/accounts/${accountId}`);
  };

  // Convert fractional steps to whole steps for UI rendering
  const activeStep = Math.floor(currentStep);

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative bg-background/50 backdrop-blur-[2px] h-[calc(100vh-4rem)]">
      {/* Agent Processing Container */}
      <div className="w-full max-w-3xl px-4 py-8 flex flex-col items-center">
        <div className="text-center mb-8">
          <h2 className="text-[32px] leading-[40px] tracking-[-0.02em] font-semibold text-foreground mb-2">AI Agent Processing</h2>
          <p className="text-[18px] leading-[28px] text-muted-foreground">Synthesizing account intelligence for {account?.company_name || 'Acme Corp'}.</p>
        </div>

        {/* Vertical Pipeline */}
        <div className="w-full max-w-md relative">
          {/* Continuous Line Behind */}
          <div className="absolute left-[1.125rem] top-4 bottom-4 w-[2px] bg-border z-0"></div>

          {/* Step 1: Complete */}
          <div className="flex items-start gap-3 mb-6 relative z-10">
            <div className={`w-10 h-10 rounded-full flex flex-shrink-0 items-center justify-center ${activeStep > 0 ? 'bg-green-50 border border-green-200' : 'bg-muted border border-border'}`}>
              <span className={`material-symbols-outlined text-[20px] ${activeStep > 0 ? 'text-green-700' : 'text-muted-foreground'}`}>check</span>
            </div>
            <div className="pt-2">
              <h3 className={`text-[18px] leading-[24px] tracking-[-0.01em] font-semibold mb-1 ${activeStep > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>Researching Company</h3>
              <p className="text-[12px] leading-[16px] text-muted-foreground">Aggregated external data points.</p>
            </div>
          </div>

          {/* Step 2: Complete */}
          <div className="flex items-start gap-3 mb-6 relative z-10">
            <div className={`w-10 h-10 rounded-full flex flex-shrink-0 items-center justify-center ${activeStep > 1 ? 'bg-green-50 border border-green-200' : activeStep === 1 ? 'bg-primary' : 'bg-muted border border-border'}`}>
              <span className={`material-symbols-outlined text-[20px] ${activeStep > 1 ? 'text-green-700' : activeStep === 1 ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                {activeStep > 1 ? 'check' : 'rocket_launch'}
              </span>
            </div>
            <div className="pt-2">
              <h3 className={`text-[18px] leading-[24px] tracking-[-0.01em] font-semibold mb-1 ${activeStep > 1 ? 'text-foreground' : activeStep === 1 ? 'text-primary' : 'text-muted-foreground'}`}>Mapping Stakeholders</h3>
              <p className="text-[12px] leading-[16px] text-muted-foreground">Identified key decision makers.</p>
            </div>
          </div>

          {/* Step 3: In Progress (Active) */}
          <div className="flex items-start gap-3 mb-6 relative z-10">
            <div className="relative w-10 h-10 flex flex-shrink-0 items-center justify-center">
              {activeStep === 2 && <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-20"></div>}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeStep > 2 ? 'bg-green-50 border border-green-200' : activeStep === 2 ? 'bg-primary shadow-[0_4px_12px_rgba(36,81,255,0.3)]' : 'bg-muted border border-border'}`}>
                <span className={`material-symbols-outlined text-[20px] ${activeStep > 2 ? 'text-green-700' : activeStep === 2 ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                  {activeStep > 2 ? 'check' : activeStep === 2 ? 'rocket_launch' : 'auto_awesome'}
                </span>
              </div>
            </div>
            <div className="pt-2 w-full">
              <h3 className={`text-[18px] leading-[24px] tracking-[-0.01em] font-semibold mb-1 ${activeStep > 2 ? 'text-foreground' : activeStep === 2 ? 'text-primary' : 'text-muted-foreground'}`}>Identifying Buying Signals</h3>
              
              {activeStep === 2 && (
                <>
                  {/* Active Progress Line */}
                  <div className="h-1 w-full bg-border rounded-full overflow-hidden mt-2 mb-2 relative">
                    <div className="absolute top-0 left-0 h-full w-1/2 bg-gradient-to-r from-primary/50 via-primary to-primary/50 animate-pulse"></div>
                  </div>
                  
                  {/* Live Terminal Output */}
                  <div className="bg-card text-card-foreground p-3 rounded border border-border mt-2 font-mono text-[13px] h-24 overflow-hidden relative shadow-inner">
                    <div className="flex flex-col gap-1 text-[12px] opacity-80">
                      {messages.map((msg, idx) => (
                        <span key={idx} className={idx === messages.length - 1 ? 'animate-pulse' : ''}>{msg}</span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Step 4: Pending */}
          <div className={`flex items-start gap-3 mb-6 relative z-10 ${activeStep < 3 ? 'opacity-50' : ''}`}>
            <div className={`w-10 h-10 rounded-full border flex flex-shrink-0 items-center justify-center ${activeStep > 3 ? 'bg-green-50 border-green-200' : activeStep === 3 ? 'bg-primary border-transparent' : 'bg-muted border-border'}`}>
              <span className={`material-symbols-outlined text-[20px] ${activeStep > 3 ? 'text-green-700' : activeStep === 3 ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                {activeStep > 3 ? 'check' : 'auto_awesome'}
              </span>
            </div>
            <div className="pt-2">
              <h3 className={`text-[18px] leading-[24px] tracking-[-0.01em] font-semibold mb-1 ${activeStep > 3 ? 'text-foreground' : activeStep === 3 ? 'text-primary' : 'text-muted-foreground'}`}>Drafting Strategy</h3>
              <p className="text-[12px] leading-[16px] text-muted-foreground">{activeStep === 3 ? 'Generating personalized outreach...' : 'Waiting for intelligence signals...'}</p>
            </div>
          </div>

          {/* Step 5: Pending */}
          <div className={`flex items-start gap-3 relative z-10 ${activeStep < 4 ? 'opacity-50' : ''}`}>
            <div className={`w-10 h-10 rounded-full border flex flex-shrink-0 items-center justify-center ${activeStep > 4 ? 'bg-green-50 border-green-200' : activeStep === 4 ? 'bg-primary border-transparent' : 'bg-muted border-border'}`}>
              <span className={`material-symbols-outlined text-[20px] ${activeStep > 4 ? 'text-green-700' : activeStep === 4 ? 'text-primary-foreground' : 'text-muted-foreground'}`}>verified</span>
            </div>
            <div className="pt-2">
              <h3 className={`text-[18px] leading-[24px] tracking-[-0.01em] font-semibold mb-1 ${activeStep > 4 ? 'text-foreground' : activeStep === 4 ? 'text-primary' : 'text-muted-foreground'}`}>Verifying Claims</h3>
              <p className="text-[12px] leading-[16px] text-muted-foreground">{activeStep === 4 ? 'Reviewing against guidelines...' : 'Final review against guidelines.'}</p>
            </div>
          </div>

        </div>

        {/* Actions */}
        <div className="mt-8 pt-4">
          <button 
            onClick={cancelAnalysis}
            className="px-6 py-2 rounded bg-background text-foreground border border-border text-[11px] leading-[16px] tracking-[0.05em] font-semibold uppercase hover:bg-muted transition-colors shadow-sm"
          >
            Cancel Analysis
          </button>
        </div>
      </div>
    </div>
  );
}
