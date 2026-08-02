from __future__ import annotations

from pydantic import BaseModel, Field

class CitationRef(BaseModel):
    source_id: str = Field(..., description="ID of the source document")
    quote: str = Field(..., description="Exact quote from the source")

class CitationMetadata(BaseModel):
    id: str = Field(..., description="ID matching the inline marker (e.g., '1' for [1])")
    source_type: str = Field(..., description="Type of source (e.g., 'Transcript', 'News', 'CRM')")
    source_name: str = Field(..., description="Name of the source")
    context: str = Field(..., description="Date, timestamp, or context (e.g., 'Q3 review - 02:14')")
    snippet: str = Field(..., description="Exact quote or snippet from the source")


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
    content: str = Field(..., description="The draft content. Use inline markers like [1] to cite sources.")
    citations: list[CitationMetadata] = Field(default_factory=list, description="List of citations used in the draft content")

class ActionOutput(BaseModel):
    account_plan: AccountPlan | None = Field(None, description="The structured account plan. Optional if a custom directive was given.")
    outreach_drafts: list[OutreachDraft] | None = Field(None, description="The drafted outreach messages. Optional if a custom directive was given.")
    custom_response: str | None = Field(None, description="The comprehensive, raw markdown response strictly fulfilling a user's custom directive. Ignore the other fields if you use this.")

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
