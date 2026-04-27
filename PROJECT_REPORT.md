# PROJECT REPORT

## LetsStudyAI: Multi-Agent, Context-Synchronized Study Platform

**Course:** CSCI 4083  
**Institution:** University of Louisiana at Monroe  
**Team Members:** Diwakar Mahato Sudi, Pankaj Bhatta, Ranjan Lamichhane, Aadarsha Aryal

---

## 1. Abstract

LetsStudyAI is a multi-agent educational platform that converts static notes into a guided, measurable study workflow. The system combines three specialized agents (Planner, Tutor, Evaluator) with a shared context architecture backed by PostgreSQL. The updated infrastructure introduces a strict Subject -> Chapter -> Slides hierarchy, multi-document retrieval-augmented generation (RAG), and a baton-pass interaction model where each agent's output becomes the next agent's operating context. This report presents the architecture, data model, agent orchestration flow, implementation details, validation approach, and trade-offs.

---

## 2. Problem Statement and Motivation

Students often face three recurring issues:

- difficulty converting large unstructured notes into a realistic study roadmap,
- passive learning without measurable feedback loops,
- unreliable AI outputs when models answer without grounding in class-specific material.

LetsStudyAI addresses these by:

- grounding Tutor and Evaluator on user-uploaded content,
- separating responsibilities across agents,
- persisting cross-agent context so each interaction improves future guidance.

---

## 3. System Objectives

1. Build a secure, stateful web application with user authentication and ownership isolation.
2. Enforce a relational study-content hierarchy (`Subject -> Chapter -> Document`).
3. Implement a multi-agent workflow with explicit context handoff between Planner, Tutor, and Evaluator.
4. Provide an iterative learning loop: plan -> learn -> evaluate -> remediate -> re-plan.
5. Keep deployment low-cost with open/free model access and minimal infrastructure overhead.

---

## 4. Updated System Architecture

### 4.1 High-Level Components

- **Frontend:** React + Vite, reducer-based global app state
- **Backend:** Express API with JWT auth middleware
- **Database:** PostgreSQL (relational tables + JSONB app state)
- **AI Layer:** Groq-hosted LLMs with custom prompt orchestration
- **RAG Layer:** in-memory TF-IDF vector store scoped by selected document IDs

### 4.2 Agent Model Assignment

- **Planner:** `qwen/qwen3-32b`
- **Evaluator:** `llama-3.3-70b-versatile`
- **Tutor:** `meta-llama/llama-4-scout-17b-16e-instruct`

---

## 5. Data Model and Persistence

### 5.1 Relational Tables

- `users`: account records
- `subjects`: user-owned subjects with optional scheduling metadata
- `chapters`: chapter rows linked to a subject
- `user_documents`: uploaded files linked to `chapter_id`

This guarantees structural consistency for the professor-required hierarchy.

### 5.2 JSONB Shared Agent State

Per-user agent memory is persisted in `user_app_state.state`:

- `subjects`
- `studyPlan`
- `chatHistory`
- `quizHistory`
- `learningObjectives`
- `topicMastery`
- `agentInbox`

This enables fast UI hydration and cross-agent communication without creating dozens of additional relational tables for each evolving UI field.

---

## 6. Agent Interaction Design (Baton-Pass Pattern)

### 6.1 Planner -> Tutor

Planner roadmap and progress state are transformed into a concise Tutor system briefing:

- current focus subject,
- this-week tasks,
- weak/mastered topic signals,
- available learning objectives.

The backend injects this briefing before Tutor RAG prompt assembly.

### 6.2 Planner -> Evaluator

Planner learning objectives are injected into quiz generation instructions so the Evaluator tests promised outcomes, not generic trivia.

### 6.3 Evaluator -> Planner/Tutor

After quiz submission:

- per-topic mastery is computed (`mastered`, `tracking`, `weak`),
- matched roadmap tasks are marked complete for mastered topics,
- weak topics are queued in `agentInbox` for Tutor remediation prompts.

This forms the closed-loop remediation cycle.

---

## 7. Retrieval and Context Scoping

### 7.1 Multi-Document Context

The app now uses `documentIds[]` (instead of only a single `documentId`) in Tutor and Evaluator flows. Retrieval functions filter vector search to selected IDs only.

### 7.2 RAG Reliability Controls

- strict ownership verification before retrieval,
- strict system instruction to avoid unsupported claims,
- fallback chunk inclusion when query retrieval returns empty but a scoped context exists.

---

## 8. Frontend Workflow Enhancements

### 8.1 Documents Page

The Documents UI is now Planner-driven:

- no inline create/delete for subjects/chapters,
- users import hierarchy from Planner,
- upload requires explicit chapter selection.

### 8.2 Evaluator UX

- answers lock after submission per question,
- immediate correctness highlighting,
- explanation shown per question,
- final review preserved.

### 8.3 Tutor UX

- proactive remediation banner for weak topics,
- automatic greeting for unread remediation items,
- one-click deep-dive prompts from flagged topics.

### 8.4 Planner UX

Topic chips visualize learning state:

- green `✓` for mastered,
- red `⚠` for weak,
- objective marker for topics with generated outcomes.

---

## 9. API Surface (Updated)

### Planner

- `POST /api/planner/generate`
- `POST /api/planner/insights`
- `POST /api/planner/objectives`

### Library/Hierarchy

- `GET /api/subjects`
- `POST /api/subjects/sync-from-planner`
- `POST /api/subjects/:subjectId/chapters`

### Documents

- `POST /api/documents/upload` (requires `chapterId`)
- `GET /api/documents?group=hierarchy`
- `DELETE /api/documents/:id`

### Tutor/Evaluator

- `POST /api/chat` (supports `documentIds[]`)
- `POST /api/chat/generate-quiz` (supports `documentIds[]`)

### State/Auth

- `GET /api/user/state`
- `PUT /api/user/state`
- `POST /api/auth/register`
- `POST /api/auth/login`

---

## 10. Validation Summary

The updated implementation was verified across:

- hierarchy import/upload constraints,
- multi-document context selection,
- planner objective generation and persistence,
- Tutor/Evaluator prompt baton injection,
- remediation loop from quiz outcomes to Tutor prompting,
- roadmap progress auto-update from mastery state.

Frontend build and edited-file lint checks passed, with known pre-existing lint configuration warnings unrelated to new behavior.

---

## 11. Security and Reliability Considerations

- JWT-protected endpoints with authenticated user context
- strict user ownership checks for document operations
- JSON parse guards and fallback handling for LLM output formats
- contextual grounding to reduce hallucinations
- bounded in-memory state structures to limit client-side growth

---

## 12. Limitations

1. TF-IDF index is in-memory and rehydrates from disk after restart.
2. Keyword-based retrieval can miss semantically similar passages compared to dense vector embeddings.
3. JSONB state is flexible but less query-efficient than normalized analytics schemas.

---

## 13. Future Work

1. Move from in-memory TF-IDF to persistent vector infrastructure (e.g., `pgvector`).
2. Add topic-level analytics dashboard for trend monitoring over time.
3. Implement confidence scoring and retrieval trace details in Tutor responses.
4. Add automated regression tests for baton-pass prompt composition and remediation logic.

---

## 14. Conclusion

The updated LetsStudyAI infrastructure now goes beyond isolated agents and functions as a coordinated learning system. By combining hierarchy-aware content modeling, multi-document retrieval, and cross-agent context transfer, the platform supports a practical study loop: planning, guided learning, objective-based testing, and targeted remediation. This architecture directly addresses the project’s academic requirements while keeping deployment simple and cost-aware.
