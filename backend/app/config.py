from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
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

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def use_mock_llm(self) -> bool:
        return not bool(self.openrouter_api_key) and not bool(self.cerebras_api_key) and not bool(self.groq_api_key)

settings = Settings()
