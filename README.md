# LetsStudyAI

Multi-agent, document-grounded study platform built for CSCI 4083.

LetsStudyAI combines three collaborating agents:
- **Planner** (roadmap + schedule + learning objectives)
- **Tutor** (RAG chat over uploaded notes)
- **Evaluator** (objective-aligned quizzes + mastery tracking)

The latest infrastructure adds a full **Subject -> Chapter -> Slides (documents)** hierarchy and a **baton-pass architecture** where each agent contributes shared context to the others.

---

## Key Features

### 1) Hierarchical Knowledge Library
- Relational structure: `subjects -> chapters -> user_documents`
- Documents are always linked to a chapter
- Upload and retrieval are scoped to authenticated user ownership
- Documents page is Planner-driven (subjects/chapters are imported from Planner context)

### 2) Multi-Document RAG Context
- Users can select multiple documents through a hierarchical context picker
- Tutor and Evaluator send `documentIds[]` to backend (backward-compatible with single `documentId`)
- RAG retrieval is filtered to selected documents only

### 3) Baton-Pass Agent Interaction Pattern
- **Planner -> Tutor**: roadmap briefing (focus subject, this week tasks, weak/mastered topics, objectives) injected as system context
- **Planner -> Evaluator**: learning objectives briefing injected into quiz generation prompt
- **Evaluator -> Planner/Tutor**: quiz outcomes update topic mastery, roadmap completion, and remediation inbox

### 4) Shared Global Context
Stored in `user_app_state.state` JSONB:
- `learningObjectives`
- `topicMastery`
- `agentInbox`

This enables persistent cross-agent memory per user.

### 5) Real-Time Evaluator Feedback
- Answers lock after selection
- Correct/incorrect options are visually highlighted
- Explanations are shown immediately
- Final summary remains available after quiz completion

---

## Architecture Overview

### Frontend
- React + Vite
- Global state with `AppContext` + reducer
- Pages: `Planner`, `Documents`, `Tutor`, `Evaluator`
- Shared `DocumentContextPicker` for active context selection

### Backend
- Node.js + Express
- JWT-authenticated routes
- PostgreSQL persistence
- Groq LLM integration for planner/tutor/evaluator prompts
- Custom TF-IDF based retrieval (`server/rag/*`)

### Data Layer
- `users`
- `user_app_state` (JSONB for planner/tutor/evaluator shared context)
- `subjects`
- `chapters`
- `user_documents`

---

## Model Configuration

Current model assignments:
- Planner generation: `qwen/qwen3-32b`
- Evaluator quiz generation: `llama-3.3-70b-versatile`
- Tutor chat: `meta-llama/llama-4-scout-17b-16e-instruct`

---

## Quick Start

## 1. Prerequisites
- Node.js 18+
- npm
- PostgreSQL (local or Docker)
- Groq API key

## 2. Start PostgreSQL (Docker example)
```bash
docker run --name letsstudyai-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=letsstudyai \
  -p 5432:5432 \
  -d postgres:16
```

If already created:
```bash
docker start letsstudyai-pg
```

## 3. Configure backend env
```bash
cd server
cp .env.example .env
```

Set these in `server/.env`:
- `DATABASE_URL=postgres://postgres:postgres@localhost:5432/letsstudyai`
- `JWT_SECRET=<min-16-char-secret>`
- `GROQ_API_KEY=<your-key>`

## 4. Install and run backend
```bash
cd server
npm install
npm start
```

Backend URL: `http://localhost:3001`

## 5. Install and run frontend
```bash
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

---

## Typical User Flow (Updated)

1. Register / login
2. In Planner, create subjects + topics and generate study roadmap
3. In Documents, click **Import from Planner** and upload files to selected chapter
4. In Tutor, select one or more documents and ask questions
5. In Evaluator, generate quiz from active docs (and/or focus topic)
6. Quiz results update:
   - topic mastery
   - remediation suggestions for Tutor
   - roadmap progress (completed tasks)

---

## API Surface (Core)

### Auth and state
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/user/state`
- `PUT /api/user/state`

### Library and documents
- `GET /api/subjects`
- `POST /api/subjects/sync-from-planner`
- `POST /api/documents/upload` (requires `chapterId`)
- `GET /api/documents?group=hierarchy`
- `DELETE /api/documents/:id`

### Planner
- `POST /api/planner/generate`
- `POST /api/planner/insights`
- `POST /api/planner/objectives`

### Tutor / Evaluator
- `POST /api/chat` (supports `documentIds[]`)
- `POST /api/chat/generate-quiz` (supports `documentIds[]`)

---

## Project Structure

```text
LetsStudyAI/
├── src/
│   ├── agents/
│   ├── components/
│   ├── context/
│   ├── lib/
│   └── pages/
├── server/
│   ├── db/
│   ├── middleware/
│   ├── rag/
│   ├── routes/
│   └── services/
├── PROJECT_PLAN.md
├── PROJECT_REPORT.md
└── README.md
```

---

## Verification Checklist

Use this to validate the updated infrastructure quickly:
- Documents page has no inline subject/chapter create/delete
- Planner objectives are generated and persisted
- Tutor receives planner briefing in chat requests
- Evaluator prompt includes objectives/weak-topic briefing
- Quiz result writes `topicMastery` and `agentInbox`
- Tutor shows proactive remediation when weak topics exist
- Planner chips reflect mastered/weak/objective states

---

## Team

- Pankaj Bhatta
- Ranjan Lamichhane
- Aadarsha Aryal
- Diwakar Mahato Sudi

**Course:** CSCI 4083  
**Instructor:** Dr. Dileon Saint Jean
