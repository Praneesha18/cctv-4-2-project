from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "ML Service"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    clip_model_name: str = "ViT-B/16"
    clip_cache_dir: str = "/tmp/clip-cache"
    clip_download_retries: int = 3
    clip_download_retry_backoff_seconds: float = 2.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


settings = Settings()
