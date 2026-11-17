import asyncio
import logging
from html import escape

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import Command, CommandStart
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message, WebAppInfo
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError

from .config import BOT_TOKEN, WEB_APP_URL
from .database import SessionLocal
from .models import User, WordCard

logger = logging.getLogger(__name__)


def app_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="Open EngGrind", web_app=WebAppInfo(url=WEB_APP_URL))
    ]])


async def ensure_user(message: Message) -> int | None:
    """Create/update the app profile when a user first interacts with the bot."""
    telegram_user = message.from_user
    if telegram_user is None:
        return None

    async with SessionLocal() as session:
        statement = insert(User).values(
            telegram_id=telegram_user.id,
            first_name=telegram_user.first_name[:128],
            username=telegram_user.username,
        ).on_conflict_do_update(
            index_elements=[User.telegram_id],
            set_={"first_name": telegram_user.first_name[:128], "username": telegram_user.username},
        )
        await session.execute(statement)
        await session.commit()
    return telegram_user.id


async def main() -> None:
    if not BOT_TOKEN:
        raise RuntimeError("Set BOT_TOKEN in backend/.env before starting the bot")
    if not WEB_APP_URL.startswith("https://"):
        raise RuntimeError("Set WEB_APP_URL to the Mini App's HTTPS URL")

    bot = Bot(BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dispatcher = Dispatcher()

    @dispatcher.message(CommandStart())
    async def start(message: Message) -> None:
        await ensure_user(message)
        name = escape(message.from_user.first_name) if message.from_user else "there"
        await message.answer(
            f"Hi, {name}! Ready for a little English practice today?\n\n"
            "Open the Mini App to study, or use /words to review your saved vocabulary.",
            reply_markup=app_keyboard(),
        )

    @dispatcher.message(Command("app"))
    async def open_app(message: Message) -> None:
        await message.answer("Continue your English practice in the Mini App.", reply_markup=app_keyboard())

    @dispatcher.message(Command("help"))
    async def help_command(message: Message) -> None:
        await message.answer(
            "<b>EngGrind commands</b>\n"
            "/app — open the Mini App\n"
            "/words — list your saved vocabulary\n"
            "/addword word | meaning | example — save a flashcard\n"
            "You can also add and review cards in the Mini App."
        )

    @dispatcher.message(Command("words"))
    async def list_words(message: Message) -> None:
        telegram_id = await ensure_user(message)
        if telegram_id is None:
            return
        async with SessionLocal() as session:
            result = await session.scalars(
                select(WordCard)
                .where(WordCard.telegram_id == telegram_id)
                .order_by(WordCard.created_at.desc(), WordCard.id.desc())
                .limit(20)
            )
            cards = list(result)
        if not cards:
            await message.answer("You haven't saved any words yet. Add one with /addword or in the Mini App.")
            return
        pages = []
        current_page = "Your recent words"
        for card in cards:
            line = f"\n\n{card.word} — {card.meaning}\n{card.example}"
            if len(current_page) + len(line) > 3500:
                pages.append(current_page)
                current_page = "Your recent words (continued)"
            current_page += line
        if len(cards) == 20:
            current_page += "\nShowing the 20 most recent cards. Open the Mini App for your full list."
        pages.append(current_page)
        for page in pages:
            await message.answer(page, parse_mode=None)

    @dispatcher.message(Command("addword"))
    async def add_word(message: Message) -> None:
        telegram_id = await ensure_user(message)
        if telegram_id is None:
            return
        raw = (message.text or "").partition(" ")[2].strip()
        parts = [part.strip() for part in raw.split("|", maxsplit=2)]
        if len(parts) != 3 or not all(parts):
            await message.answer(
                "Use this format:\n<code>/addword word | meaning | example</code>\n"
                "For example: <code>/addword resilient | able to recover quickly | She stayed resilient after the setback.</code>"
            )
            return
        word, meaning, example = parts
        if len(word) > 100 or len(meaning) > 1000 or len(example) > 1000:
            await message.answer("Please keep the word under 100 characters and the meaning and example under 1,000 each.")
            return
        async with SessionLocal() as session:
            existing = await session.scalar(
                select(WordCard.id).where(WordCard.telegram_id == telegram_id, WordCard.word == word.lower())
            )
            if existing:
                await message.answer("You already saved that word. Use /words to review your cards.")
                return
            session.add(WordCard(telegram_id=telegram_id, word=word.lower(), meaning=meaning, example=example))
            try:
                await session.commit()
            except IntegrityError:
                await session.rollback()
                logger.exception("Failed to save a vocabulary card for Telegram user %s", telegram_id)
                await message.answer("I couldn't save that card just now. Please try again.")
                return
        await message.answer(f"Saved <b>{escape(word.lower())}</b> to your vocabulary.")

    try:
        await dispatcher.start_polling(bot)
    finally:
        await bot.session.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
