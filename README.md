# LetsStudyAI — AI-Powered Personal Study Assistant

A multi-agent AI study assistant using RAG (Retrieval Augmented Generation) so students can upload their own notes and get AI-powered answers from them.

## Features

- **Planner Agent** — generates personalized study schedules from your subjects and deadlines
- **Tutor Agent** — answers questions using your uploaded notes (RAG) via Groq LLM
- **Evaluator Agent** — quizzes you on topics and tracks your performance
- **My Documents** — upload PDF, DOCX, or TXT notes to power the AI Tutor

## Quick Start

### 1. Get a free Groq API key

Sign up at [console.groq.com](https://console.groq.com) — no credit card required.

### 2. Configure the backend

```bash
cd server
cp .env.example .env
# Edit server/.env and paste your Groq API key
```

### 3. Start the backend

```bash
cd server
npm install
npm start
# Runs on http://localhost:3001
```

### 4. Start the frontend (in a new terminal)

```bash
npm install
npm run dev
# Runs on http://localhost:5173
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Framer Motion |
| Backend | Node.js, Express |
| LLM | Groq API (llama-3.1-8b-instant) |
| RAG | TF-IDF cosine similarity (in-memory) |
| Document parsing | pdf-parse, mammoth |

## Project Team

| Name | Role |
|------|------|
| Pankaj Bhatta | Tutor Agent + Backend/RAG |
| Ranjan Lamichhane | System Design + Integration |
| Aadarsha Aryal | Planner Agent |
| Diwakar Mahato Sudi | Evaluator Agent |

CSCI 4083 — Dr. Dileon Saint Jean
