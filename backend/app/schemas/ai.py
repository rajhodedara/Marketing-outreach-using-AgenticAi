from __future__ import annotations

from pydantic import BaseModel, Field

class CitationRef(BaseModel):
    source_id: str = Field(..., description="ID of the source document")
    quote: str = Field(..., description="Exact quote from the source")

class ResearchFinding(BaseModel):
    topic: str = Field(..., description="Topic of the finding")
    summary: str = Field(..., description="Summary of the finding")
    citations: list[CitationRef] = Field(default_factory=list, description="Citations supporting the finding")

class ResearchFindings(BaseModel):
    findings: list[ResearchFinding] = Field(default_factory=list)

class StakeholderProfile(BaseModel):
    name: str = Field(..., description="Name of the stakeholder")
    role: str = Field(..., description="Role or title of the stakeholder")
    influence_level: str = Field(..., description="Level of influence (e.g., High, Medium, Low)")
    key_concerns: list[str] = Field(default_factory=list, description="Key concerns or pain points")

class BuyingSignal(BaseModel):
    signal_type: str = Field(..., description="Type of buying signal")
    description: str = Field(..., description="Description of the signal")
    urgency: str = Field(..., description="Urgency level (e.g., High, Medium, Low)")

class IntentSignals(BaseModel):
    signals: list[BuyingSignal] = Field(default_factory=list)
    overall_intent_score: int = Field(..., description="Overall intent score from 0 to 100")

class OutreachDraft(BaseModel):
    target_persona: str = Field(..., description="The target persona for the outreach")
    channel: str = Field(..., description="Channel for the outreach (e.g., Email, LinkedIn)")
    content: str = Field(..., description="The draft content")

class AccountPlan(BaseModel):
    account_id: str = Field(..., description="Account identifier")
    strategy_summary: str = Field(..., description="Summary of the strategy")
    key_steps: list[str] = Field(default_factory=list, description="Key actionable steps")

class ClaimVerdict(BaseModel):
    claim_text: str = Field(..., description="The claim being evaluated")
    supported: bool = Field(..., description="Whether the claim is supported by sources")
    supporting_citation: CitationRef | None = Field(None, description="Citation supporting the claim if supported")
    reason: str = Field(..., description="Reasoning for the verdict")

class CriticVerdict(BaseModel):
    overall_pass: bool = Field(..., description="Whether all claims are supported")
    claims_checked: int = Field(..., description="Number of claims checked")
    claims_supported: int = Field(..., description="Number of claims supported")
    claims_unsupported: int = Field(..., description="Number of claims unsupported")
    verdicts: list[ClaimVerdict] = Field(default_factory=list, description="Verdicts for each claim")
    retry_count: int = Field(default=0, description="Number of retries attempted")
