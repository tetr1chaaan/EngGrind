from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TelegramInitData(BaseModel):
    initData: str = Field(min_length=1)


class TelegramUserResponse(BaseModel):
    id: int
    first_name: str
    username: str | None = None


class WordCreate(BaseModel):
    word: str = Field(min_length=1, max_length=100)
    meaning: str = Field(default="", max_length=1000)
    example: str = Field(default="", max_length=1000)


class WordResponse(WordCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
