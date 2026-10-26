"""
Application Configuration Module.

Loads database and runtime settings from environment variables (.env).
Supports DEV, QA, and PROD profiles (Capstone Section 33 & 34).
Supports MySQL (via PyMySQL / DBeaver), PostgreSQL, or SQLite for local development.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment-specific profile if set (e.g. .env.dev, .env.qa, .env.prod)
target_env = os.getenv("APP_ENV", "").strip().lower()
if target_env:
    profile_path = BASE_DIR / f".env.{target_env}"
    if profile_path.exists():
        load_dotenv(profile_path)

# Always load .env as default / local override if present
load_dotenv(BASE_DIR / ".env")


class Config:
    """Application configuration container supporting DEV, QA, and PROD profiles."""
    APP_ENV: str = os.getenv("APP_ENV", "dev")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")

    # Database settings (Defaults configured for local MySQL / DBeaver)
    DB_TYPE: str = os.getenv("DB_TYPE", "mysql")
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: str = os.getenv("DB_PORT", "3306")
    DB_NAME: str = os.getenv("DB_NAME", "it_asset_db")
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "root")

    # Security & JWT settings (Section 39)
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", "dev_secret_key_for_local_testing_only_capstone_2026"
    )
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

    # Logging settings (Section 37)
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    @classmethod
    def get_database_url(cls) -> str:
        """
        Constructs the SQLAlchemy database connection URL based on configured settings.
        Supports MySQL, PostgreSQL, and SQLite.
        """
        custom_url = os.getenv("DATABASE_URL")
        if custom_url:
            return custom_url

        db_type = cls.DB_TYPE.lower()
        if db_type == "mysql":
            return (
                f"mysql+pymysql://{cls.DB_USER}:{cls.DB_PASSWORD}@"
                f"{cls.DB_HOST}:{cls.DB_PORT}/{cls.DB_NAME}?charset=utf8mb4"
            )
        if db_type in ("postgres", "postgresql"):
            return (
                f"postgresql://{cls.DB_USER}:{cls.DB_PASSWORD}@"
                f"{cls.DB_HOST}:{cls.DB_PORT}/{cls.DB_NAME}"
            )
        # Fallback to local SQLite file in the data folder
        sqlite_path = BASE_DIR / "data" / "it_asset_local.db"
        return f"sqlite:///{sqlite_path}"


# Singleton config instance
config = Config()
