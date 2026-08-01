"use client";

import { useCallback, useState } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Link from "next/link";

type StakeholderProps = {
  stakeholders: {
    name: string;
    role: string;
    influence_level: string;
    key_concerns: string[];
    history?: string[];
  }[];
  accountId: string;
};

export default function StakeholderMap({
  stakeholders,
  accountId,
}: StakeholderProps) {
  const [selectedStakeholder, setSelectedStakeholder] = useState<
    StakeholderProps["stakeholders"][number] | null
  >(null);

  const getInitials = (s: StakeholderProps["stakeholders"][number]) => {
    let nameToUse = s.name;
    if (!nameToUse || nameToUse.includes("[Not Provided]")) {
      nameToUse = s.role || "NA";
    }
    const clean = nameToUse.replace(/[^a-zA-Z\s]/g, "").trim();
    if (!clean) return "NA";
    return clean
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const influenceColor = (level: string) => {
    const l = (level || "").toLowerCase();
    if (l === "high" || l === "decision_maker" || l === "decision-maker")
      return "border-primary bg-primary/5";
    if (l === "medium" || l === "influencer") return "border-sky-500/40 bg-sky-500/5";
    return "border-border bg-card";
  };

  // Build nodes with better layout — arc arrangement
  const nodes: Node[] = stakeholders.map((s, i) => {
    const angle = (Math.PI / (stakeholders.length + 1)) * (i + 1);
    const radiusX = Math.max(200, stakeholders.length * 100);
    const radiusY = 80;
    const centerX = radiusX;
    const centerY = 160;

    return {
      id: i.toString(),
      position: {
        x: centerX + radiusX * Math.cos(Math.PI - angle) - 70,
        y: centerY - radiusY * Math.sin(angle),
      },
      data: {
        label: (
          <div className="flex flex-col items-center justify-center p-1.5 cursor-pointer text-center">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-primary font-bold border-2 mb-1.5 shadow-sm text-[13px] ${influenceColor(s.influence_level)}`}
            >
              {getInitials(s)}
            </div>
            <div className="font-semibold text-foreground text-[12px] leading-tight truncate max-w-[120px]">
              {s.name}
            </div>
            <div className="text-[9px] text-muted-foreground truncate max-w-[120px] mt-0.5">
              {s.role}
            </div>
          </div>
        ),
      },
      type: "default",
      style: {
        background: "var(--card)",
        color: "var(--foreground)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        width: 140,
        padding: "4px",
      },
    };
  });

  // Connect nodes in a line
  const edges: Edge[] = [];
  for (let i = 0; i < stakeholders.length - 1; i++) {
    edges.push({
      id: `e${i}-${i + 1}`,
      source: i.toString(),
      target: (i + 1).toString(),
      type: "smoothstep",
      animated: true,
      style: { stroke: "var(--primary)", strokeWidth: 1.5, opacity: 0.5 },
    });
  }

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const s = stakeholders[parseInt(node.id)];
      if (s) setSelectedStakeholder(s);
    },
    [stakeholders]
  );

  return (
    <div className="relative w-full h-[280px] border border-border rounded-xl overflow-hidden bg-card">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={onNodeClick}
        fitView
        preventScrolling={false}
        zoomOnScroll={false}
        panOnScroll={true}
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--muted-foreground)" gap={20} size={1} />
        <Controls
          showInteractive={false}
          className="!border-border !bg-card !shadow-sm [&>button]:!border-border [&>button]:!bg-card"
        />
      </ReactFlow>

      {/* Microcopy hint */}
      <div className="absolute bottom-2 right-3 text-[10px] text-muted-foreground/50 font-mono pointer-events-none">
        Click a node to view details
      </div>

      {/* Slide-out Panel */}
      {selectedStakeholder && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-background/30 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setSelectedStakeholder(null)}
          />

          {/* Panel */}
          <div className="fixed top-0 right-0 h-full w-[380px] max-w-full bg-card border-l border-border shadow-[-4px_0_16px_rgba(0,0,0,0.08)] z-50 flex flex-col animate-in slide-in-from-right duration-200">
            <header className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-primary text-[14px] font-bold border-2 ${influenceColor(selectedStakeholder.influence_level)}`}
                >
                  {getInitials(selectedStakeholder)}
                </div>
                <div>
                  <h2 className="text-[15px] leading-[20px] font-semibold text-foreground">
                    {selectedStakeholder.name}
                  </h2>
                  <p className="text-[11px] leading-[14px] text-muted-foreground">
                    {selectedStakeholder.role}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStakeholder(null)}
                className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">
                  close
                </span>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Influence level */}
              <div>
                <p className="text-[10px] tracking-[0.05em] font-semibold uppercase text-muted-foreground mb-1.5">
                  Influence Level
                </p>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${
                    (selectedStakeholder.influence_level || "")
                      .toLowerCase()
                      .includes("high") ||
                    (selectedStakeholder.influence_level || "")
                      .toLowerCase()
                      .includes("decision")
                      ? "bg-primary/10 border-primary/20 text-primary"
                      : "bg-muted border-border text-muted-foreground"
                  }`}
                >
                  {selectedStakeholder.influence_level || "Unknown"}
                </span>
              </div>

              {/* Quick actions */}
              <div className="flex gap-2">
                <Link
                  href={`/accounts/${accountId}/outreach`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-primary text-primary-foreground rounded-lg text-[12px] font-medium hover:bg-primary/90 transition-colors active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    mail
                  </span>
                  Email
                </Link>
                <button className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-secondary border border-border text-secondary-foreground rounded-lg text-[12px] font-medium hover:bg-muted transition-colors active:scale-[0.98]">
                  <span className="material-symbols-outlined text-[15px]">
                    calendar_month
                  </span>
                  Meeting
                </button>
              </div>

              {/* Key concerns */}
              {selectedStakeholder.key_concerns &&
                selectedStakeholder.key_concerns.length > 0 && (
                  <section>
                    <p className="text-[10px] tracking-[0.05em] font-semibold uppercase text-muted-foreground mb-2">
                      Key Concerns
                    </p>
                    <div className="space-y-1.5">
                      {selectedStakeholder.key_concerns.map(
                        (concern: string, i: number) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 py-1.5"
                          >
                            <span className="material-symbols-outlined text-[13px] text-muted-foreground mt-0.5">
                              arrow_right
                            </span>
                            <span className="text-[12px] leading-[17px] text-foreground">
                              {concern}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </section>
                )}

              {/* History */}
              <section>
                <p className="text-[10px] tracking-[0.05em] font-semibold uppercase text-muted-foreground mb-2">
                  Engagement History
                </p>
                <div className="text-[12px] text-muted-foreground py-2">
                  {selectedStakeholder.history?.length
                    ? "Prior engagement on record."
                    : "No prior engagement history."}
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
