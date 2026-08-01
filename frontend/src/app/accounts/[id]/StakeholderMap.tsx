"use client";

import { useCallback, useState } from 'react';
import { ReactFlow, Controls, Background, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Link from 'next/link';

type StakeholderProps = {
  stakeholders: any[];
  accountId: string;
};

export default function StakeholderMap({ stakeholders, accountId }: StakeholderProps) {
  const [selectedStakeholder, setSelectedStakeholder] = useState<any | null>(null);

  // Generate nodes from stakeholders
  const nodes: Node[] = stakeholders.map((s, i) => {
    return {
      id: i.toString(),
      position: { x: 250 * i, y: (i % 2 === 0) ? 50 : 150 },
      data: { 
        label: (
          <div className="flex flex-col items-center justify-center p-2 cursor-pointer text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-primary font-bold border border-border mb-2 shadow-sm">
              {s.name.split(" ").map((n: string) => n[0]).join("").substring(0,2).toUpperCase()}
            </div>
            <div className="font-semibold text-foreground text-[14px]">{s.name}</div>
            <div className="text-[10px] text-muted-foreground">{s.role}</div>
          </div>
        )
      },
      type: 'default',
      style: {
        background: 'var(--card)',
        color: 'var(--foreground)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        width: 160,
      }
    };
  });

  // Generate some dummy edges connecting them in a line for now
  const edges: Edge[] = [];
  for (let i = 0; i < stakeholders.length - 1; i++) {
    edges.push({
      id: `e${i}-${i+1}`,
      source: i.toString(),
      target: (i + 1).toString(),
      type: 'smoothstep',
      animated: true,
      style: { stroke: 'var(--primary)' }
    });
  }

  const onNodeClick = useCallback((event: any, node: Node) => {
    const s = stakeholders[parseInt(node.id)];
    if (s) setSelectedStakeholder(s);
  }, [stakeholders]);

  return (
    <div className="relative w-full h-[400px] border border-border rounded-lg overflow-hidden bg-card shadow-sm">
      <ReactFlow 
        nodes={nodes} 
        edges={edges} 
        onNodeClick={onNodeClick}
        fitView
        preventScrolling={false}
        zoomOnScroll={false}
        panOnScroll={true}
        attributionPosition="bottom-left"
      >
        <Background color="var(--muted-foreground)" gap={16} />
        <Controls />
      </ReactFlow>

      {/* Slide-out Panel */}
      {selectedStakeholder && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-background/20 backdrop-blur-sm z-40 transition-opacity" 
            onClick={() => setSelectedStakeholder(null)} 
          />
          
          {/* Panel */}
          <div className="fixed top-0 right-0 h-full w-[400px] max-w-[100%] bg-card border-l border-border shadow-[-8px_0_24px_rgba(0,0,0,0.1)] z-50 flex flex-col transform transition-transform animate-in slide-in-from-right duration-300">
            
            <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-primary text-[16px] font-bold border border-border">
                  {selectedStakeholder.name.split(" ").map((n: string) => n[0]).join("").substring(0,2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-[16px] leading-[20px] font-semibold text-foreground">{selectedStakeholder.name}</h2>
                  <p className="text-[11px] leading-[14px] text-muted-foreground">{selectedStakeholder.role}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStakeholder(null)}
                className="w-8 h-8 flex items-center justify-center rounded text-muted-foreground hover:bg-muted transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Actions */}
              <div className="flex gap-2">
                <Link href={`/accounts/${accountId}/outreach`} className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-primary text-primary-foreground rounded text-[12px] font-medium hover:bg-primary/90 transition-colors">
                  <span className="material-symbols-outlined text-[16px]">mail</span> Email
                </Link>
                <button className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-background border border-border text-foreground rounded text-[12px] font-medium hover:bg-muted transition-colors">
                  <span className="material-symbols-outlined text-[16px]">calendar_month</span> Meeting
                </button>
              </div>

              {/* Priorities */}
              {selectedStakeholder.key_concerns && (
                <section>
                  <h3 className="text-[10px] tracking-[0.05em] font-semibold uppercase text-muted-foreground mb-2">Key Concerns</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedStakeholder.key_concerns.map((concern: string, i: number) => (
                      <span key={i} className={`px-2 py-1 text-[11px] border rounded flex items-center gap-1 ${i === 0 ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-muted border-border text-foreground'}`}>
                        <span className="material-symbols-outlined text-[14px]">{i === 0 ? 'trending_up' : 'label'}</span>
                        {concern}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Insights */}
              <section>
                <h3 className="text-[10px] tracking-[0.05em] font-semibold uppercase text-muted-foreground mb-2">Insights</h3>
                <div className="p-3 bg-muted border border-border rounded text-[12px] italic text-muted-foreground">
                  "Evaluates scalable infrastructure. Watch for budget reallocation signals."
                </div>
              </section>

              {/* History */}
              <section>
                <h3 className="text-[10px] tracking-[0.05em] font-semibold uppercase text-muted-foreground mb-2">History</h3>
                <div className="text-[12px] text-muted-foreground">
                  {selectedStakeholder.history?.length ? 'History events...' : 'No prior engagement history.'}
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
