"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowsClockwise, ClockCounterClockwise, CalendarBlank, EnvelopeSimple, Users, LinkedinLogo, Bell, Phone, X } from "@phosphor-icons/react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Integration {
  provider: string;
  name: string;
  description: string;
  category: "Scheduling" | "Email" | "CRM" | "Social Selling" | "Notifications" | "Call Intelligence";
  status: "connected" | "disconnected";
  auth_type: "api_key" | "webhook" | "oauth";
  last_synced?: string;
  icon: string;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "Scheduling": return CalendarBlank;
    case "Email": return EnvelopeSimple;
    case "CRM": return Users;
    case "Social Selling": return LinkedinLogo;
    case "Notifications": return Bell;
    case "Call Intelligence": return Phone;
    default: return EnvelopeSimple;
  }
};

export function LunaIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [authForm, setAuthForm] = useState({ api_key: "", webhook_url: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const res = await fetch("/api/nova/integrations");
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations || []);
      }
    } catch (err) {
      console.error("Failed to fetch integrations", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (provider: string, authType: string) => {
    setIsSubmitting(true);
    try {
      const payload = authType === "webhook" ? { webhook_url: authForm.webhook_url } : { api_key: authForm.api_key };
      const res = await fetch(`/api/nova/integrations/${provider}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setIntegrations(prev => prev.map(i => i.provider === provider ? { ...i, status: "connected", last_synced: new Date().toISOString() } : i));
        setConnectingProvider(null);
        setAuthForm({ api_key: "", webhook_url: "" });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = async (provider: string) => {
    try {
      const res = await fetch(`/api/nova/integrations/${provider}/disconnect`, { method: "POST" });
      if (res.ok) {
        setIntegrations(prev => prev.map(i => i.provider === provider ? { ...i, status: "disconnected", last_synced: undefined } : i));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredIntegrations = activeTab === "all" 
    ? integrations 
    : integrations.filter(i => i.category.toLowerCase() === activeTab.toLowerCase());

  const categories = ["All", ...Array.from(new Set(integrations.map(i => i.category)))];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <ArrowsClockwise className="animate-spin text-emerald-500" size={32} weight="duotone" />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-16">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tighter">Premium Integrations</h2>
          <p className="text-white/40 mt-2 font-medium tracking-wide">Connect Luna to your essential business tools.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white/5 border border-white/10 flex flex-wrap h-auto p-1.5 gap-1 rounded-full w-max shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]">
          {categories.map(cat => (
            <TabsTrigger 
              key={cat} 
              value={cat.toLowerCase()}
              className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/40 rounded-full px-5 py-2 text-xs uppercase tracking-widest font-semibold transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-white"
            >
              {cat}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pt-4">
        <AnimatePresence>
          {filteredIntegrations.map((integration, idx) => (
            <motion.div
              key={integration.provider}
              layout
              initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.7, delay: idx * 0.05, ease: [0.32, 0.72, 0, 1] }}
              className="group"
            >
              <div className="bg-white/5 border border-white/10 p-1.5 rounded-[2rem] shadow-2xl relative transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.1)] h-full flex flex-col">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-[2rem] pointer-events-none" />
                
                <div className="bg-[#0a0a0a] rounded-[calc(2rem-0.375rem)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-hidden flex flex-col h-full relative z-10">
                  <div className="p-6 flex flex-row items-start justify-between space-y-0 relative z-10">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 rounded-[1.25rem] bg-white/5 border border-white/10 flex items-center justify-center text-white/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                        {(() => {
                          const IconComponent = getCategoryIcon(integration.category);
                          return <IconComponent weight="light" size={28} />;
                        })()}
                      </div>
                      <div>
                        <h3 className="text-lg text-white font-medium tracking-tight">{integration.name}</h3>
                        <div className="text-[10px] uppercase tracking-widest text-emerald-400/80 mt-1 font-semibold">
                          {integration.category}
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <div className={`absolute inset-0 rounded-full blur-md ${integration.status === 'connected' ? 'bg-emerald-500/50' : 'bg-transparent'}`} />
                      <div className={`relative w-2.5 h-2.5 rounded-full border ${integration.status === 'connected' ? 'bg-emerald-400 border-emerald-300' : 'bg-white/20 border-white/10'}`} />
                    </div>
                  </div>
                  
                  <div className="px-6 text-sm text-white/50 flex-grow relative z-10 font-medium leading-relaxed">
                    {integration.description}
                    
                    {integration.status === 'connected' && integration.last_synced && (
                      <div className="mt-6 flex items-center text-[11px] uppercase tracking-widest text-white/30">
                        <ClockCounterClockwise weight="duotone" size={14} className="mr-2" />
                        Synced: {new Date(integration.last_synced).toLocaleDateString()}
                      </div>
                    )}

                    <AnimatePresence>
                      {connectingProvider === integration.provider && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, y: -10 }}
                          animate={{ opacity: 1, height: "auto", y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                            <label className="text-[10px] uppercase tracking-widest font-semibold text-white/50 block ml-1">
                              {integration.auth_type === 'webhook' ? 'Webhook URL' : 'API Key'}
                            </label>
                            <Input
                              type={integration.auth_type === 'webhook' ? 'url' : 'password'}
                              placeholder={integration.auth_type === 'webhook' ? 'https://...' : 'Enter your key'}
                              className="bg-[#050505] border-white/10 h-10 text-sm focus-visible:ring-emerald-500/50 rounded-xl px-4 text-white placeholder:text-white/20"
                              value={integration.auth_type === 'webhook' ? authForm.webhook_url : authForm.api_key}
                              onChange={(e) => setAuthForm(prev => ({
                                ...prev,
                                [integration.auth_type === 'webhook' ? 'webhook_url' : 'api_key']: e.target.value
                              }))}
                            />
                            <div className="flex gap-2">
                              <button 
                                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black h-10 text-xs font-semibold uppercase tracking-widest rounded-xl transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                                onClick={() => handleConnect(integration.provider, integration.auth_type)}
                                disabled={isSubmitting}
                              >
                                {isSubmitting ? <ArrowsClockwise weight="duotone" className="animate-spin" size={16} /> : 'Save'}
                              </button>
                              <button 
                                className="w-full border border-white/10 text-white/70 hover:text-white hover:bg-white/5 h-10 text-xs font-semibold uppercase tracking-widest rounded-xl transition-all duration-300 active:scale-[0.98]"
                                onClick={() => { setConnectingProvider(null); setAuthForm({ api_key: "", webhook_url: "" }); }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="p-6 pt-4 relative z-10 border-t border-white/5 mt-6">
                    {integration.status === 'connected' ? (
                      <button 
                        className="w-full h-12 text-white/40 hover:text-red-400 hover:bg-red-500/10 text-xs uppercase tracking-widest font-bold rounded-full transition-all duration-300 active:scale-[0.98]"
                        onClick={() => handleDisconnect(integration.provider)}
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button 
                        className="w-full h-12 border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white text-xs uppercase tracking-widest font-bold rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                        onClick={() => setConnectingProvider(connectingProvider === integration.provider ? null : integration.provider)}
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
