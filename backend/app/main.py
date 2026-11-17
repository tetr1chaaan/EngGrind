from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import CurrentUser
from .config import BOT_TOKEN
from .database import engine, get_session
from .models import Base, User, WordCard
from .schemas import TelegramInitData, TelegramUserResponse, WordCreate, WordResponse
from .security import user_from_init_data, validate_init_data


@asynccontextmanager
async def lifespan(_: FastAPI):
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(title="EngGrind API", version="0.1.0", lifespan=lifespan)
DbSession = Annotated[AsyncSession, Depends(get_session)]


@app.get("/api/health")
async def health(session: DbSession) -> dict[str, str]:
    await session.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}


@app.post("/api/session", response_model=dict[str, TelegramUserResponse])
async def create_session(payload: TelegramInitData, session: DbSession) -> dict[str, TelegramUserResponse]:
    fields = validate_init_data(payload.initData, BOT_TOKEN)
    user_data = user_from_init_data(fields) if fields else None
    if not user_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Telegram session is invalid or expired")

    user = await session.get(User, user_data["id"])
    if user is None:
        user = User(telegram_id=user_data["id"], first_name=str(user_data["first_name"]), username=user_data.get("username"))
        session.add(user)
    else:
        user.first_name = str(user_data["first_name"])
        user.username = user_data.get("username")
    await session.commit()
    return {"user": TelegramUserResponse(id=user.telegram_id, first_name=user.first_name, username=user.username)}


@app.get("/api/words", response_model=list[WordResponse])
async def list_words(user: CurrentUser, session: DbSession) -> list[WordCard]:
    result = await session.scalars(select(WordCard).where(WordCard.telegram_id == user.telegram_id).order_by(WordCard.created_at.desc()))
    return list(result)


@app.post("/api/words", response_model=WordResponse, status_code=status.HTTP_201_CREATED)
async def create_word(payload: WordCreate, user: CurrentUser, session: DbSession) -> WordCard:
    word = payload.word.strip().lower()
    existing = await session.scalar(select(WordCard).where(WordCard.telegram_id == user.telegram_id, WordCard.word == word))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Word already saved")
    card = WordCard(telegram_id=user.telegram_id, word=word, meaning=payload.meaning, example=payload.example)
    session.add(card)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Word already saved") from None
    await session.refresh(card)
    return card
