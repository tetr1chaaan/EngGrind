from typing import Annotated

from fastapi import Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from .config import BOT_TOKEN
from .database import get_session
from .models import User
from .security import user_from_init_data, validate_init_data


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    session: AsyncSession = Depends(get_session),
) -> User:
    if not authorization or not authorization.startswith("tma "):
        raise HTTPException(status_code=401, detail="Telegram initData is required")
    fields = validate_init_data(authorization[4:], BOT_TOKEN)
    payload = user_from_init_data(fields) if fields else None
    if not payload:
        raise HTTPException(status_code=401, detail="Telegram session is invalid or expired")
    user = await session.get(User, payload["id"])
    if not user:
        raise HTTPException(status_code=401, detail="Telegram session has not been initialized")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
