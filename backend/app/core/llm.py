from langchain_openai import ChatOpenAI
from app.config import settings
import logging

logger = logging.getLogger(__name__)

def get_openrouter_llm(model: str = "anthropic/claude-3.5-sonnet", temperature: float = 0) -> ChatOpenAI | None:
    if settings.use_mock_llm:
        return None
    if not settings.openrouter_api_key:
        logger.warning("OpenRouter API key is missing.")
        return None
    return ChatOpenAI(
        model=model,
        temperature=temperature,
        openai_api_key=settings.openrouter_api_key,
        openai_api_base="https://openrouter.ai/api/v1"
    )

def get_cerebras_llm(model: str = "llama3.1-70b", temperature: float = 0) -> ChatOpenAI | None:
    if settings.use_mock_llm:
        return None
    if not settings.cerebras_api_key:
        logger.warning("Cerebras API key is missing.")
        return None
    return ChatOpenAI(
        model=model,
        temperature=temperature,
        openai_api_key=settings.cerebras_api_key,
        openai_api_base="https://api.cerebras.ai/v1"
    )
