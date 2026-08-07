from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Existing
    groq_api_key: str = ""
    openrouter_api_key: str = ""
    cerebras_api_key: str = ""
    database_url: str = "sqlite+aiosqlite:///./data/abm.db"
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    qdrant_in_memory: bool = True
    supabase_jwt_secret: str = ""
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    log_level: str = "INFO"
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587

    # Vapi
    vapi_public_key: str = ""
    vapi_private_key: str = ""

    # LLM for Vapi (Groq)
    llm_api_key: str = ""

    # ElevenLabs TTS
    tts_api_key: str = ""

    # Google Calendar
    google_client_id: str = ""
    google_client_secret: str = ""
    google_refresh_token: str = ""

    # Nova backend URL (ngrok)
    nova_backend_url: str = ""

    # Slack
    slack_bot_token: str = ""
    slack_signing_secret: str = ""

    # Gmail (sending)
    google_gmail_scopes: str = "https://www.googleapis.com/auth/gmail.send"

    # Live Search Config
    live_research_mode: bool = True
    tavily_api_key: str = ""
    apollo_api_key: str = ""
    serpapi_api_key: str = ""
    gnews_api_key: str = ""
    datamagnet_api_key: str = ""
    max_search_queries: int = 3
    max_companies: int = 3
    max_articles_per_company: int = 3
    max_contacts_per_company: int = 3

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def use_mock_llm(self) -> bool:
        return not bool(self.openrouter_api_key) and not bool(self.cerebras_api_key) and not bool(self.groq_api_key)

settings = Settings()
