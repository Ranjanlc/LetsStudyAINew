# LetsStudyAI — AI-Powered Study Assistant

This is our course project for CSCI 4083. We built an AI study assistant that uses multiple agents to help students plan their study schedule, understand topics, and test themselves — all powered by their own uploaded notes.

The big idea: upload your PDF or Word notes, and the AI will answer your questions from them, not just generic stuff.

---

## What It Does

The app has three AI agents, each doing a different job:

- **Planner Agent** — you add your subjects and deadlines, it builds a study schedule for you
- **Tutor Agent** — you ask it questions, it answers using your uploaded notes (RAG)
- **Evaluator Agent** — it generates quiz questions either by topic or directly from your documents

There's also a Documents page where you upload your notes (PDF, DOCX, or TXT) so the AI has something to work with.

---

## How to Run It

You need **PostgreSQL** running locally (or set `DATABASE_URL` to any Postgres you control), plus two terminals — backend and frontend.

### Step 0 — PostgreSQL

Create a database (example name `letsstudyai`). Quick option with Docker:

```bash
docker run --name letsstudyai-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=letsstudyai -p 5432:5432 -d postgres:16
```

Then set `DATABASE_URL` in `server/.env` (see Step 2).

### Step 1 — Get a free Groq API key

Go to [console.groq.com](https://console.groq.com) and sign up. It's completely free, no credit card needed. Copy your API key.

### Step 2 — Set up the backend

```bash
cd server
cp .env.example .env
```

Open `server/.env` and set:

- **`DATABASE_URL`** — e.g. `postgres://postgres:postgres@localhost:5432/letsstudyai`
- **`JWT_SECRET`** — any random string **at least 16 characters** (used to sign login tokens)
- **`GROQ_API_KEY`** — optional but needed for AI tutor / planner / quizzes

The server creates tables on first start.

### Step 3 — Start the backend

```bash
cd server
npm install
npm start
```

It runs on `http://localhost:3001`

### Step 4 — Start the frontend (open a new terminal)

```bash
npm install
npm run dev
```

It runs on `http://localhost:5173` — open that in your browser. **Register** a new account on first visit (your study plan, chat, and profile are stored per user in Postgres).

---

## Tech Stack

| Part | What we used |
|------|-------------|
| Frontend | React 19, Vite, Framer Motion |
| Backend | Node.js, Express |
| Accounts | JWT + bcrypt, PostgreSQL (`users`, `user_app_state`, `user_documents`) |
| AI / LLM | Groq API (Llama 3) — free |
| Document Search (RAG) | TF-IDF + cosine similarity |
| File Parsing | pdf-parse (PDF), mammoth (DOCX) |

We chose Groq because it's fast and free. We built the RAG system from scratch using TF-IDF instead of using a vector database, which kept things simple and didn't require any extra services.

---

## Project Structure

```
LetsStudyAI/
├── src/                    # React frontend
│   ├── agents/             # Planner, Tutor, Evaluator agent logic
│   ├── pages/              # Dashboard, Planner, Tutor, Evaluator, Documents, Profile
│   └── context/            # App state (AppContext), Theme (ThemeContext)
├── server/                 # Express backend
│   ├── routes/             # chat.js, documents.js
│   └── rag/                # documentParser.js, vectorStore.js, ragEngine.js
└── README.md
```

---

## Team

| Name | Role |
|------|------|
| Pankaj Bhatta | Tutor Agent + RAG backend |
| Ranjan Lamichhane | System design + integration |
| Aadarsha Aryal | Planner Agent |
| Diwakar Mahato Sudi | Evaluator Agent |

**Course:** CSCI 4083 — Dr. Dileon Saint Jean
