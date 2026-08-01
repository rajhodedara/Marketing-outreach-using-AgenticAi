import pytest
from pathlib import Path
from app.agents.state import PipelineState
from app.schemas.ai import AccountPlan
from app.agents.critic import critic_node
from app.core.config import settings

@pytest.mark.asyncio
async def test_critic_adversarial():
    # Force use of real LLM for this test
    original_use_mock_llm = settings.use_mock_llm
    settings.use_mock_llm = False
    
    try:
        # Construct path to the sample data
        base_dir = Path(__file__).resolve().parent.parent
        adversarial_file = base_dir / "sample_data" / "adversarial_insert.txt"
        
        # If the adversarial insert exists, we'll read it, but we won't include it in chunks
        # to simulate the scenario where the LLM hallucinated it.
        # Even if it doesn't exist locally, we can hardcode the string.
        fake_soc2_claim = "The company recently experienced severe SOC2 audit failures."
        if adversarial_file.exists():
            fake_soc2_claim = adversarial_file.read_text().strip()
            
        # Construct fake state
        state: PipelineState = {
            "account_id": "test_acc_123",
            "company_name": "TestCorp",
            "retrieved_chunks": [
                "TestCorp is a fast-growing B2B software company.",
                "They are looking to expand their operations in Europe.",
                "Recent funding round raised $50M for expansion."
            ],
            "account_plan": AccountPlan(
                account_id="test_acc_123",
                strategy_summary="Leverage their recent security issues to sell our compliance tool.",
                key_steps=[
                    "Reach out to the CISO.",
                    f"Mention this pain point: {fake_soc2_claim}"
                ]
            )
        }
        
        # Run the critic node
        result = await critic_node(state)
        
        # Check verdict
        assert "critic_verdict" in result
        verdict = result["critic_verdict"]
        
        # Should not pass because of the unsupported SOC2 claim
        assert not verdict.overall_pass
        assert verdict.claims_unsupported > 0
        
        # Verify that specifically the SOC2 claim is marked as unsupported
        soc2_claim_verdicts = [v for v in verdict.verdicts if not v.supported and "SOC2" in v.claim_text]
        assert len(soc2_claim_verdicts) > 0, "Expected to find an unsupported claim mentioning SOC2"
        assert not soc2_claim_verdicts[0].supported

    finally:
        # Restore original setting
        settings.use_mock_llm = original_use_mock_llm
