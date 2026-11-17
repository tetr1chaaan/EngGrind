<div align="center">

# ⚡ EngGrind — Telegram Bot & Mini App

**Your all-in-one daily English habit tracker and IELTS prep ecosystem built right inside Telegram.**

[Features](#-core-modules) • [Format](#-2-in-1-telegram-ecosystem) • [Tech Stack](#-technology-stack) • [Free vs PRO](#-monetization-free-vs-pro)

</div>

---

## 💡 What is EngGrind?

Most students quit language learning and exam prep because of friction and complicated interfaces. **EngGrind** solves this by moving your daily English routine straight into **Telegram**, where you already spend your time:

* **🔥 Daily Training Routine:** Fresh daily exam tasks for **Listening** and **Reading** to keep your skills sharp.
* **📈 Streak & Retention:** Track your daily study streak. The bot sends smart evening reminders so you never lose your progress.
* **⚡ 1-Tap Seamless Dictionary:** Highlight any unfamiliar word in texts or audio transcripts inside the Mini App to instantly generate a smart AI flashcard.

---

## 🤖 2-in-1 Telegram Ecosystem

We combine the accessibility of chat bots with the rich interactive UI of modern web applications:

1. **Telegram Bot (Retention & Entry):**
   * Instant registration in 1 click (no passwords or emails).
   * Smart push notifications for streak protection and Anki review reminders.
   * Frictionless subscription checkout via **Telegram Stars**.
2. **Telegram Mini App (Interactive UI):**
   * Clean audio player for **Listening** with interactive transcripts.
   * Reader mode for **Reading** with native word highlighting.
   * Full text editor for the **Writing Analyzer**.
   * Interactive swipe flashcards with audio pronunciation.

---

## 🛠 Core Modules

### 1. 🎧 Listening Part
Real exam tasks from various English tests (IELTS, TOEFL, etc.).
* **Interactive Transcript:** Available immediately after submission with correct answers highlighted. Tap any word to add it to your flashcards.
* **Spelling Trainer:** A specialized training mode where users listen to audio clips containing tricky numbers, website links, or names, and type them out to test listening precision.

### 2. 📖 Reading Part
* Daily exam-style reading passages with comprehension questions.
* Highlight any word or phrase directly inside the reading text to instantly create a flashcard.

### 3. 🧠 Smart Flashcards (English-to-English)
Spaced repetition system (Anki-style) focused on pure target-language immersion.
* **AI Context Parsing:** When you highlight a word, the AI analyzes the sentence context and builds a clean English-to-English card featuring:
  * **Clear Definition:** Simple explanation of the word's meaning in English.
  * **Contextual Examples:** 2–3 natural example sentences.
  * **Pronunciation:** IPA transcription and audio support.
* **Daily Limits:** Free users can add **up to 5 new words per day**, while PRO users enjoy **unlimited** flashcard creation.

### 4. ✍️ Writing Analyzer (`PRO`)
Your personal AI examiner for written essays.
* **Error Breakdown:** Highlights grammatical, lexical, and punctuation errors with clear explanations.
* **Repetition Killer:** Identifies overused words and suggests stronger B2–C2 synonyms.
* **Official IELTS Scoring (0.0 – 9.0):** Evaluates essays across all 4 criteria:
  1. *Task Achievement / Task Response*
  2. *Coherence and Cohesion*
  3. *Lexical Resource*
  4. *Grammatical Range and Accuracy*

---

## 💻 Technology Stack

The working prototype uses a Python backend with PostgreSQL persistence:

* **Mini App frontend:** React + TypeScript + Vite. Telegram's official `telegram-web-app.js` script supplies theme, BackButton, and MainButton integration.
* **Bot:** Python + aiogram 3, currently using polling for local development and a `/start` Mini App button.
  The bot also supports `/app`, `/help`, `/words`, and `/addword word | meaning | example`; first contact creates or refreshes the user's profile, and vocabulary commands use the same PostgreSQL cards as the Mini App.
* **Backend API:** Python + FastAPI.
* **Database and ORM:** PostgreSQL + SQLAlchemy 2 async, using asyncpg. The prototype creates its tables at startup; add Alembic migrations before production.
* **Telegram identity:** The API validates the raw `Telegram.WebApp.initData` HMAC before creating a user session or accessing saved words. It does not trust `initDataUnsafe`.
* **Prototype persistence:** Telegram users' vocabulary cards are stored in PostgreSQL. Browser-only previews use localStorage.
* **AI and audio (later):** Keep provider calls and credentials on the backend; the current listening screen is transcript-only.

The new implementation lives in `web/` and `backend/`. The original standalone HTML/CSS/JavaScript prototype remains at the project root as a feature and content reference.

### Run locally

1. Install Python 3.11+, Node.js 20+, and Docker Compose.
2. Create and activate a virtual environment, then install dependencies: `python -m venv .venv`, `source .venv/bin/activate`, `pip install -r backend/requirements.txt`, and `npm install`.
3. Start PostgreSQL with `docker compose up -d db`.
4. Run `npm run dev` for Vite and FastAPI. Expose the Vite app through an HTTPS tunnel.
5. Run `npm run bot`. On first launch, the terminal securely prompts for the Telegram bot token (hidden input) and Mini App HTTPS URL, then saves them to `backend/.env` with owner-only permissions. The file is ignored by Git. You can also run `npm run setup` separately.
6. In Telegram, send `/start` to the bot and open EngGrind from its button.

---

## 💎 Monetization (Free vs PRO)

| Feature | Free Tier | PRO Tier |
| :--- | :---: | :---: |
| Daily Listening & Reading tasks | ✅ | ✅ |
| Interactive transcript after submission | ✅ | ✅ |
| Streak tracking & bot reminders | ✅ | ✅ |
| Spelling trainer mode | Limited (3/day) | ✅ Unlimited |
| **AI Flashcards (English definition + examples)** | **Up to 5 words/day** | ✅ **Unlimited** |
| **Archive of past tasks & full practice library** | ❌ | ✅ |
| **Writing Analyzer (IELTS essay grading)** | ❌ (1 demo check) | ✅ **Unlimited** |

---

## 🗺 Roadmap

* [x] **Phase 1:** Concept design & 2-in-1 architecture definition.
* [ ] **Phase 2:** Core Bot (aiogram) + FastAPI + PostgreSQL user progress and daily streaks.
* [ ] **Phase 3:** Interactive Transcripts + AI English Flashcards (5/day limit) + Anki review loop.
* [ ] **Phase 4:** Spelling Trainer & Audio support.
* [ ] **Phase 5:** Telegram Stars checkout integration + Writing Analyzer & past archive. 
