from __future__ import annotations

from pydantic import BaseModel, Field
from typing import List, Optional

class SourceEvidence(BaseModel):
    title: Optional[str] = None
    publisher: Optional[str] = "Unknown"
    date: Optional[str] = "Recent"
    snippet: Optional[str] = "Signal detected in recent publications."
    url: Optional[str] = "#"

class SignalBreakdown(BaseModel):
    name: Optional[str] = "Signal"
    points: Optional[int] = 10

class WhyNowTrigger(BaseModel):
    event: Optional[str] = "Signal Detected"
    category: Optional[str] = "General"
    date: Optional[str] = "Recently"
    evidence: Optional[SourceEvidence] = None
    explanation: Optional[str] = ""

class DecisionMaker(BaseModel):
    name: Optional[str] = "Leadership"
    role: Optional[str] = "Executive"
    company: Optional[str] = ""
    relevance_score: Optional[int] = 0
    why_this_person: Optional[str] = "Selected based on ICP match"
    influence_level: Optional[str] = "High"
    role_alignment: Optional[str] = ""
    recommended_outreach_angle: Optional[str] = ""
    linkedin: Optional[str] = None
    email: Optional[str] = None

class RecommendedAction(BaseModel):
    primary_contact: Optional[str] = "Leadership"
    reason: Optional[str] = "ICP Match"
    suggested_outreach_angle: Optional[str] = "Discuss recent developments"
    conversation_goal: Optional[str] = "Explore opportunities"

class ICPScoreBreakdown(BaseModel):
    industry: Optional[int] = 10
    company_size: Optional[int] = 10
    required_signal: Optional[int] = 10
    persona_match: Optional[int] = 10
    timing: Optional[int] = 10

class ICPMatchReport(BaseModel):
    industry_match: Optional[str] = "Matched"
    size_match: Optional[str] = "Matched"
    signal_match: Optional[str] = "Matched"
    persona_match: Optional[str] = "Matched"
    timing_match: Optional[str] = "Now"
    score_breakdown: Optional[ICPScoreBreakdown] = None
    total_score: Optional[int] = 85

class ConfidenceBreakdown(BaseModel):
    source_reliability: Optional[int] = 80
    signal_freshness: Optional[int] = 80
    icp_match: Optional[int] = 80
    decision_maker_match: Optional[int] = 80

class CompanyMomentumEvent(BaseModel):
    date: Optional[str] = "Recently"
    description: Optional[str] = "Company event detected"

class StructuredSalesContext(BaseModel):
    # Target Person
    target_person_name: Optional[str] = ""
    target_person_role: Optional[str] = ""
    target_person_company: Optional[str] = ""
    target_person_why: Optional[str] = ""
    target_person_influence: Optional[str] = ""
    
    # Trigger Intelligence
    trigger_event: Optional[str] = ""
    trigger_category: Optional[str] = ""
    trigger_date: Optional[str] = ""
    trigger_source: Optional[str] = ""
    trigger_why_it_matters: Optional[str] = ""
    
    # Business Context
    business_challenge: Optional[str] = ""
    business_impact: Optional[str] = ""
    current_situation: Optional[str] = ""
    
    # Conversation Strategy
    opening_angle: Optional[str] = ""
    conversation_goal: Optional[str] = ""
    desired_outcome: Optional[str] = ""
    
    # Evidence
    evidence_used: List[str] = Field(default_factory=list)

class PersonalizationScore(BaseModel):
    total_score: Optional[int] = 92
    source_evidence: Optional[int] = 40
    persona_match: Optional[int] = 25
    company_signal: Optional[int] = 20
    timing: Optional[int] = 15

class TraceLog(BaseModel):
    discovered_through: Optional[str] = "Unknown"
    evidence_sources: List[str] = Field(default_factory=list)
    decision_maker_source: Optional[str] = "Unknown"

class OutreachSequence(BaseModel):
    email_1: Optional[str] = "Initial outreach draft"
    email_2: Optional[str] = "Follow-up draft"
    email_3: Optional[str] = "Breakup draft"

class DiscoveredCompany(BaseModel):
    company_name: Optional[str] = "Unknown Company"
    industry: Optional[str] = "Unknown Industry"
    domain: Optional[str] = None
    
    # Core Scores
    opportunity_score: Optional[int] = 85
    intent_strength: Optional[str] = "🔥 High"
    research_confidence: Optional[int] = 80
    
    why_selected: Optional[str] = "Strong ICP match."
    
    # Rich Intelligence Objects
    icp_match_report: Optional[ICPMatchReport] = None
    confidence_breakdown: Optional[ConfidenceBreakdown] = None
    personalization_score: Optional[PersonalizationScore] = None
    momentum_timeline: List[CompanyMomentumEvent] = Field(default_factory=list)
    
    why_now: List[WhyNowTrigger] = Field(default_factory=list)
    score_breakdown: List[SignalBreakdown] = Field(default_factory=list)
    pain_points: List[str] = Field(default_factory=list)
    
    decision_makers: List[DecisionMaker] = Field(default_factory=list)
    
    # Action
    recommended_action: Optional[RecommendedAction] = None
    sales_context: Optional[StructuredSalesContext] = None
    outreach_sequence: Optional[OutreachSequence] = None
    trace_log: Optional[TraceLog] = None

class ExecutiveBriefing(BaseModel):
    analyzed_companies: Optional[int] = 100
    qualified_accounts: Optional[int] = 10
    high_intent_accounts: Optional[int] = 5
    key_signals: List[str] = Field(default_factory=list)
    recommended_focus: Optional[str] = "Focus on intent signals"
    market_observation: Optional[str] = "Strong activity in this sector."

class DiscoverySynthesis(BaseModel):
    executive_briefing: Optional[ExecutiveBriefing] = None
    companies: List[DiscoveredCompany] = Field(default_factory=list)

class ICP(BaseModel):
    industry: Optional[str] = "General"
    company_characteristics: List[str] = Field(default_factory=list)
    buying_signals: List[str] = Field(default_factory=list)
    target_personas: List[str] = Field(default_factory=list)
