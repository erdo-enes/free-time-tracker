from pydantic_settings import BaseSettings
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent


class Settings(BaseSettings):
    app_name: str = "FreeTime Jira"
    database_url: str = f"sqlite:///{BASE_DIR / 'freetime.db'}"

    steam_api_key: str = ""
    steam_steamid: str = ""

    psn_npsso_token: str = ""

    xbox_openxbl_key: str = ""

    switch2_nso_token: str = ""

    tracker_poll_interval_seconds: int = 300

    class Config:
        env_file = ".env"
        env_prefix = "FREETIME_"


settings = Settings()
