"""
Application Configuration Module.

Loads database and runtime settings from environment variables (.env).
Supports MySQL (via PyMySQL / DBeaver), PostgreSQL, or SQLite for local development.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env if present
load_dotenv(BASE_DIR / ".env")


class Config:
    """Application configuration container."""
    APP_ENV: str = os.getenv("APP_ENV", "dev")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")

    # Database settings (Defaults configured for local MySQL / DBeaver)
    DB_TYPE: str = os.getenv("DB_TYPE", "mysql")  # 'mysql', 'postgres', or 'sqlite'
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: str = os.getenv("DB_PORT", "3306")
    DB_NAME: str = os.getenv("DB_NAME", "it_asset_db")
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "root")

    @classmethod
    def get_database_url(cls) -> str:
        """
        Constructs the SQLAlchemy database connection URL based on configured settings.
        Default: mysql+pymysql://root:password@localhost:3306/it_asset_db
        """
        custom_url = os.getenv("DATABASE_URL")
        if custom_url:
            return custom_url

        if cls.DB_TYPE.lower() == "mysql":
            # PyMySQL driver connects smoothly with standard MySQL and MariaDB
            return f"mysql+pymysql://{cls.DB_USER}:{cls.DB_PASSWORD}@{cls.DB_HOST}:{cls.DB_PORT}/{cls.DB_NAME}?charset=utf8mb4"
        elif cls.DB_TYPE.lower() in ("postgres", "postgresql"):
            return f"postgresql://{cls.DB_USER}:{cls.DB_PASSWORD}@{cls.DB_HOST}:{cls.DB_PORT}/{cls.DB_NAME}"
        else:
            # Fallback to SQLite database file in the data folder
            sqlite_path = BASE_DIR / "data" / "it_asset_local.db"
            return f"sqlite:///{sqlite_path}"


# Singleton config instance
config = Config()
