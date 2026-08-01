"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { AlertCircle, CheckCircle2, PlayCircle, Loader2, ShieldCheck, ShieldAlert, FileText, Send, Building } from "lucide-react";
import { toast } from "sonner";

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

const CitationText = ({ text, citations }: { text: string; citations: CitationRef[] }) => {
  if (!text) return null;
  
  // Split text by citation markers [1], [2], etc.
  const parts = text.split(/(\[\d+\])/g);
  
  return (
    <span className="whitespace-pre-wrap leading-relaxed">
      {parts.map((part, i) => {
        const match = part.match(/\[(\d+)\]/);
        if (match) {
          const citeId = match[1];
          // We assume citation markers are 1-indexed based on array position or id.
          // Adjust logic based on how the backend generates the citation numbers.
          // Usually, it maps to the index in the citations array.
          const citationIndex = parseInt(citeId) - 1;
          const citation = citations[citationIndex];

          if (citation) {
            return (
              <HoverCard key={i}>
                <HoverCardTrigger asChild>
                  <sup className="cursor-pointer text-primary font-bold px-0.5 hover:underline">
                    [{citeId}]
                  </sup>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 shadow-xl border-primary/20 bg-card/95 backdrop-blur-md">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 border-b pb-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <h4 className="text-sm font-semibold truncate" title={citation.source_doc_name}>
                        {citation.source_doc_name}
                      </h4>
                    </div>
                    <p className="text-sm text-muted-foreground italic">
                      "{citation.snippet}"
                    </p>
                    {(citation.start_line !== undefined || citation.end_line !== undefined) && (
                      <div className="text-xs text-muted-foreground pt-2 text-right">
                        Line {citation.start_line}{citation.end_line && citation.end_line !== citation.start_line ? ` - ${citation.end_line}` : ""}
                      </div>
                    )}
                  </div>
                </HoverCardContent>
              </HoverCard>
            );
          }
          return <sup key={i} className="text-muted-foreground">[{citeId}]</sup>;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

export default function AnalysisView() {
  const params = useParams();
  const accountId = params.id as string;
  
  const [session, setSession] = useState<{ id: string; status: string } | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  const startAnalysis = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/accounts/${accountId}/analyze`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Failed to start analysis");
      const data = await res.json();
      setSession(data);
      pollSession(data.session_id || data.id);
      toast.success("Analysis started", { description: "Gathering insights and drafting outreach..." });
    } catch (error) {
      console.error(error);
      toast.error("Error", { description: "Could not start analysis." });
      setLoading(false);
    }
  };

  const pollSession = (sessionId: string) => {
    if (pollInterval.current) clearInterval(pollInterval.current);
    
    pollInterval.current = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/analysis/${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.status === "completed" || data.status === "failed") {
          clearInterval(pollInterval.current!);
          setResult(data.result || data);
          setLoading(false);
          if (data.status === "completed") {
            toast.success("Analysis complete");
          } else {
            toast.error("Analysis failed");
          }
        } else {
          setSession(prev => prev ? { ...prev, status: data.status } : null);
        }
      } catch (error) {
        console.error("Polling error", error);
      }
    }, 2000);
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md">
              <Building className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Account Intelligence</h1>
          </div>
          <p className="text-muted-foreground mt-1 ml-11">Deep analysis and orchestrated outreach for this account.</p>
        </div>
        {!result && !loading && (
          <Button onClick={startAnalysis} size="lg" className="gap-2 shadow-lg shadow-primary/20">
            <PlayCircle className="w-5 h-5" />
            Run Orchestrator Analysis
          </Button>
        )}
        {loading && (
          <Button disabled size="lg" variant="secondary" className="gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Analyzing {session?.status ? `(${session.status})` : ''}...
          </Button>
        )}
      </div>

      {!result && !loading && (
        <Card className="border-dashed border-2 bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-24 text-center">
            <Building className="w-16 h-16 text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-xl font-medium mb-2">Ready for Analysis</h3>
            <p className="text-muted-foreground max-w-md">
              Click the button above to start extracting signals, analyzing intent, and drafting personalized outreach.
            </p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card className="border-primary/20 bg-card overflow-hidden relative">
          <div className="absolute top-0 left-0 h-1 bg-primary animate-pulse w-full"></div>
          <CardContent className="flex flex-col items-center justify-center py-24 text-center">
            <div className="relative w-20 h-20 mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            </div>
            <h3 className="text-xl font-medium mb-2">Orchestrator Running</h3>
            <p className="text-muted-foreground animate-pulse">
              {session?.status === "extracting" && "Reading SEC filings and news..."}
              {session?.status === "analyzing" && "Synthesizing account challenges and initiatives..."}
              {session?.status === "drafting" && "Crafting personalized outreach..."}
              {session?.status === "critique" && "Critic validating claims..."}
              {!session?.status && "Initializing agents..."}
            </p>
          </CardContent>
        </Card>
      )}

      {result && result.plan && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Account Plan */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-sm border-border/50 bg-card/50 backdrop-blur-sm h-full flex flex-col">
              <CardHeader className="border-b bg-muted/20 pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Account Plan
                </CardTitle>
                <CardDescription>Synthesized intelligence</CardDescription>
              </CardHeader>
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">Executive Summary</h4>
                    <p className="text-sm">
                      <CitationText text={result.plan.summary} citations={result.plan.citations} />
                    </p>
                  </div>
                  
                  {result.plan.key_initiatives && result.plan.key_initiatives.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">Key Initiatives</h4>
                      <ul className="list-disc pl-4 space-y-2 text-sm">
                        {result.plan.key_initiatives.map((item, i) => (
                          <li key={i}>
                            <CitationText text={item} citations={result.plan.citations} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.plan.challenges && result.plan.challenges.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">Strategic Challenges</h4>
                      <ul className="list-disc pl-4 space-y-2 text-sm text-destructive/90">
                        {result.plan.challenges.map((item, i) => (
                          <li key={i}>
                            <CitationText text={item} citations={result.plan.citations} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {result.plan.recent_news && result.plan.recent_news.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">Recent Developments</h4>
                      <ul className="list-disc pl-4 space-y-2 text-sm">
                        {result.plan.recent_news.map((item, i) => (
                          <li key={i}>
                            <CitationText text={item} citations={result.plan.citations} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </Card>
          </div>

          {/* Right Column: Drafts & Critic */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm border-border/50 bg-card/50 backdrop-blur-sm h-full">
              <CardHeader className="border-b bg-muted/20 pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Send className="w-5 h-5 text-primary" />
                  Outreach Drafts
                </CardTitle>
                <CardDescription>Personalized messaging for personas</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="draft-0" className="w-full">
                  <div className="border-b px-4 py-2 bg-muted/10">
                    <TabsList className="bg-transparent">
                      {result.drafts.map((draft, idx) => (
                        <TabsTrigger key={idx} value={`draft-${idx}`} className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                          {draft.persona || draft.target_persona || `Persona ${idx + 1}`}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                  
                  {result.drafts.map((draft, idx) => (
                    <TabsContent key={idx} value={`draft-${idx}`} className="p-0 m-0">
                      <div className="p-6 space-y-6">
                        
                        {/* Critic Guardrail Header */}
                        {draft.critic_feedback && (
                          <div className={`p-4 rounded-lg border flex items-start gap-3 ${draft.critic_feedback.overall_pass ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400'}`}>
                            {draft.critic_feedback.overall_pass ? (
                              <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0 text-green-600 dark:text-green-500" />
                            ) : (
                              <ShieldAlert className="w-5 h-5 mt-0.5 shrink-0 text-yellow-600 dark:text-yellow-500" />
                            )}
                            <div>
                              <h4 className="font-semibold text-sm">
                                {draft.critic_feedback.overall_pass ? 'Critic Guardrail Passed' : 'Critic Guardrail Modified Draft'}
                              </h4>
                              {draft.critic_feedback.issues_found && draft.critic_feedback.issues_found.length > 0 && (
                                <ul className="text-sm mt-1 list-disc pl-4 space-y-1 opacity-90">
                                  {draft.critic_feedback.issues_found.map((issue, i) => (
                                    <li key={i}>{issue}</li>
                                  ))}
                                </ul>
                              )}
                              {draft.critic_feedback.stripped_claims && draft.critic_feedback.stripped_claims.length > 0 && (
                                <div className="mt-2 text-xs">
                                  <span className="font-semibold">Stripped Claims: </span>
                                  {draft.critic_feedback.stripped_claims.join("; ")}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-4">
                            <Badge variant="outline">{draft.channel}</Badge>
                          </div>
                          <div className="bg-muted/30 p-6 rounded-xl border border-border/50 text-sm font-medium whitespace-pre-wrap leading-relaxed">
                            <CitationText text={draft.content} citations={draft.citations} />
                          </div>
                        </div>

                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
