import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
WEB_APP_URL = os.getenv("WEB_APP_URL", "")
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://enggrind:enggrind@localhost:5432/enggrind",
)
