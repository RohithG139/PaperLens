# PaperLens AI — Multi-Agent Research Assistant

> Accelerate academic research with a coordinated system of AI agents that plan, retrieve, summarize, compare, and answer questions across scientific literature.

---

## Overview

PaperLens AI is a full-stack research platform powered by a LangGraph-orchestrated multi-agent system. Submit a query; a pipeline of specialized agents retrieves relevant literature from Semantic Scholar, extracts key findings, synthesizes comparisons, and answers follow-up questions — all grounded in a RAG pipeline backed by Pinecone vector search and MongoDB Atlas.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                            │
│              React 18 + Vite  (Port 5173)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP via Vite proxy → /api/*
┌──────────────────────▼──────────────────────────────────────┐
│                      API LAYER                              │
│            FastAPI + Uvicorn  (Port 8000)                   │
│      /api/auth  /api/papers  /api/agents  /api/users        │
└──────┬────────────────────────────┬───────────────────────--┘
       │                            │
┌──────▼──────────┐      ┌──────────▼──────────────────────────┐
│   DATA LAYER    │      │          AGENT LAYER                 │
│                 │      │     LangGraph StateGraph             │
│  MongoDB Atlas  │◄────►│  START → Planner → Researcher →     │
│  Pinecone       │      │  Summarizer → (Comparator | QA) →   │
│  (384-dim RAG)  │      │  END                                 │
└─────────────────┘      └────────────┬────────────────────────┘
                                      │
              ┌───────────────────────┼──────────────────────┐
              │                       │                      │
   ┌──────────▼──────┐   ┌────────────▼──────┐   ┌──────────▼──────┐
   │ Pinecone Index  │   │  Google Gemini    │   │Semantic Scholar │
   │ 384-dim cosine  │   │  gemini-2.0-flash │   │ API             │
   └─────────────────┘   └───────────────────┘   └─────────────────┘
```

### Multi-Agent Workflow

```
START
  │
  ▼
┌──────────────┐   Analyzes query, classifies intent
│   PLANNER    │   (search_only / summarize / compare / qa)
└──────┬───────┘   generates execution steps
       │
       ▼
┌──────────────┐   Calls Semantic Scholar API, ranks papers
│  RESEARCHER  │   by relevance (60% citations + 40% position)
└──────┬───────┘
       │
       ▼
┌──────────────┐   Summarizes each paper: problem, methodology,
│  SUMMARIZER  │   results, advantages, limitations (parallel, semaphore=3)
└──────┬───────┘
       │
   ┌───┴────────────────────┐
   │                        │
   ▼                        ▼
┌──────────┐          ┌──────────┐
│COMPARATOR│          │    QA    │
│  AGENT   │          │  AGENT   │
└────┬─────┘          └────┬─────┘
     │  cross-paper table  │  RAG-grounded answers
     └──────────┬──────────┘
                ▼
               END
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6, Framer Motion |
| Data Fetching | Axios, TanStack Query v5 |
| Backend | FastAPI, Uvicorn |
| Agent Orchestration | LangGraph (StateGraph) |
| LLM | Google Gemini `gemini-2.0-flash` (via `langchain-google-genai`) |
| Embeddings | `all-MiniLM-L6-v2` via sentence-transformers (384 dims) |
| Vector Database | Pinecone (384-dim, cosine, AWS Serverless) |
| Document Database | MongoDB Atlas (Motor async driver) |
| Authentication | Google OAuth 2.0 + JWT (python-jose, 7-day expiry) |
| Paper Discovery | Semantic Scholar Open Research API |
| Containerization | Docker + Docker Compose |

---

## Project Structure

```
PaperLens/
├── backend/
│   ├── agents/
│   │   ├── planner.py          # Classifies intent, generates plan
│   │   ├── researcher.py       # Semantic Scholar search + ranking
│   │   ├── summarizer.py       # Per-paper structured summaries
│   │   ├── comparator.py       # Cross-paper comparison table
│   │   └── qa.py               # RAG-grounded question answering
│   ├── database/
│   │   ├── mongodb.py          # Motor async client, indexes, connection
│   │   └── pinecone_client.py  # Pinecone init, upsert, query
│   ├── graph/
│   │   └── workflow.py         # LangGraph StateGraph definition
│   ├── models/
│   │   ├── user.py             # User Pydantic models
│   │   ├── paper.py            # Paper, PaperSummary, ComparisonResult
│   │   └── conversation.py     # Message, Conversation, AgentExecution
│   ├── rag/
│   │   ├── chunker.py          # Sentence-aware text chunking with overlap
│   │   ├── embeddings.py       # SentenceTransformer singleton service
│   │   └── retriever.py        # Pinecone query + document indexing
│   ├── routes/
│   │   ├── auth.py             # Google OAuth flow, JWT, /me endpoint
│   │   ├── papers.py           # Search, fetch, index, trending
│   │   ├── agents.py           # Run workflow, execution status, compare
│   │   └── users.py            # History, saved papers CRUD
│   ├── services/
│   │   └── paper_service.py    # Save/get papers, search history, RAG pipeline
│   ├── tools/
│   │   ├── semantic_scholar.py # LangChain @tool wrappers for SS API
│   │   ├── comparison_tool.py  # Compare papers tool
│   │   ├── citation_tool.py    # Citation network tool
│   │   └── history_tool.py     # Search history read/write tools
│   ├── config.py               # pydantic-settings Settings class
│   ├── main.py                 # FastAPI app, CORS, lifespan, router mounts
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx           # Animated login with dot-grid canvas
│   │   │   ├── Dashboard.jsx       # Home, trending topics, quick search
│   │   │   ├── PaperSearch.jsx     # Search with filters, sort, pagination
│   │   │   ├── PaperDetail.jsx     # Paper tabs: summary, chat (QA), citations
│   │   │   ├── Comparison.jsx      # Side-by-side paper comparison
│   │   │   ├── AgentExecution.jsx  # LangGraph workflow progress view
│   │   │   ├── Profile.jsx         # User profile, history, saved papers
│   │   │   └── AuthCallback.jsx    # OAuth token receiver → redirect /
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── PaperCard.jsx
│   │   │   ├── AgentTimeline.jsx
│   │   │   ├── ComparisonTable.jsx
│   │   │   ├── SearchBar.jsx
│   │   │   └── LoadingSkeleton.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # useAuth hook, token management, interceptors
│   │   ├── services/
│   │   │   └── api.js              # Axios instance, Bearer interceptor, API calls
│   │   ├── App.jsx                 # Routes + ProtectedRoute wrapper
│   │   └── main.jsx
│   ├── vite.config.js              # Proxy /api → http://backend:8000 (Docker)
│   ├── tailwind.config.js
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
│
├── docker-compose.yml
└── README.md
```

---

## Prerequisites

- Docker Desktop (recommended) **or** Python 3.11 + Node.js 20
- MongoDB Atlas account (free M0 tier)
- Pinecone account (free Starter tier)
- Google Cloud project (OAuth 2.0 + Gemini API key)

---

## Step 1 — MongoDB Atlas Setup

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → create a free **M0** cluster.
2. **Database Access** → Add database user → set username + password → role: `readWriteAnyDatabase`.
3. **Network Access** → Add IP address → `0.0.0.0/0` (allow all, for dev).
4. **Connect** → **Drivers** → copy the connection string.
   - Replace `<password>` with your database user's password.
   - Append the database name: `...mongodb.net/paperlens`
   - Example: `mongodb+srv://rohith:mypassword@cluster0.n6f6q.mongodb.net/paperlens`

---

## Step 2 — Pinecone Setup

1. Go to [pinecone.io](https://www.pinecone.io) → sign up → create index.
2. Index settings:
   - **Name**: `paperlens` (or any name — set in `PINECONE_INDEX_NAME`)
   - **Dimensions**: **`384`** (required — matches `all-MiniLM-L6-v2`)
   - **Metric**: `cosine`
   - **Cloud**: AWS → Region: `us-east-1` (or nearest)
3. Copy the **API Key** from the left sidebar.

---

## Step 3 — Google Cloud Setup

### 3a. Create OAuth 2.0 Credentials

1. Open [Google Cloud Console](https://console.cloud.google.com) → select or create a project.
2. **APIs & Services** → **OAuth consent screen**:
   - User type: **External**
   - Fill in App name, support email, developer email → Save.
   - Scopes: add `email`, `profile`, `openid`.
   - Test users: add your Gmail address.
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**:
   - Application type: **Web application**
   - Name: `PaperLens`
   - **Authorized JavaScript origins**:
     ```
     http://localhost:5173
     ```
   - **Authorized redirect URIs**:
     ```
     http://localhost:5173/api/auth/callback
     ```
   - Click **Create** → copy **Client ID** and **Client Secret**.

> **Critical:** The redirect URI must be exactly `http://localhost:5173/api/auth/callback`.
> This goes through the Vite dev server proxy to the backend — do not use port 8000 here.

### 3b. Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com) → **Get API key** → **Create API key**.
2. Copy the key → use as `GEMINI_API_KEY`.

---

## Step 4 — Configure Environment Variables

### Backend: `backend/.env`

Copy `backend/.env.example` → `backend/.env` and fill in:

```env
# MongoDB Atlas
MONGODB_URL=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/paperlens

# Pinecone (384-dim index)
PINECONE_API_KEY=pcsk_xxxxxxxxxx
PINECONE_INDEX_NAME=paperlens
PINECONE_ENVIRONMENT=us-east-1

# Google OAuth 2.0
GOOGLE_CLIENT_ID=xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:5173/api/auth/callback

# JWT (generate a random 32+ char string)
JWT_SECRET_KEY=change-this-to-a-long-random-secret-string-in-production

# Gemini AI
GEMINI_API_KEY=AIzaSy_xxxxxxxxxxxxxxxxxxxxxxxx
GEMINI_MODEL=gemini-2.0-flash

# Frontend origin (used for OAuth redirect after login)
FRONTEND_URL=http://localhost:5173

# Semantic Scholar (optional — raises rate limits)
SEMANTIC_SCHOLAR_API_KEY=
```

| Variable | Required | Default | Notes |
|---|:---:|---|---|
| `MONGODB_URL` | Yes | — | Full Atlas connection string including `/paperlens` db |
| `PINECONE_API_KEY` | Yes | — | From Pinecone dashboard |
| `PINECONE_INDEX_NAME` | No | `paperlens` | Must match index you created |
| `PINECONE_ENVIRONMENT` | No | `us-east-1` | AWS region of your Pinecone index |
| `GOOGLE_CLIENT_ID` | Yes | — | OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | — | OAuth 2.0 Client Secret |
| `GOOGLE_REDIRECT_URI` | Yes | — | Must be `http://localhost:5173/api/auth/callback` |
| `JWT_SECRET_KEY` | Yes | — | Random secret, min 32 chars |
| `JWT_ALGORITHM` | No | `HS256` | |
| `JWT_EXPIRE_MINUTES` | No | `10080` | 7 days |
| `GEMINI_API_KEY` | Yes | — | From Google AI Studio |
| `GEMINI_MODEL` | No | `gemini-2.0-flash` | |
| `FRONTEND_URL` | No | `http://localhost:5173` | OAuth post-login redirect target |
| `SEMANTIC_SCHOLAR_API_KEY` | No | `""` | Leave blank for public rate limits |

### Frontend: `frontend/.env`

Copy `frontend/.env.example` → `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
```

> The frontend communicates with the backend entirely through the Vite proxy (`/api/*` → `http://backend:8000`). `VITE_API_URL` is used for display only.

---

## Step 5 — Run with Docker (Recommended)

```bash
# From project root
docker compose up --build
```

First build downloads `python:3.11-slim-bullseye` and `node:20-alpine` — takes ~3–5 min.

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| Health Check | http://localhost:8000/health |

Stop:
```bash
docker compose down
```

Rebuild after code changes:
```bash
docker compose up --build
```

---

## Step 6 — Run Locally (Without Docker)

### Backend

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate
# Activate (macOS/Linux)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

> **Important:** When running locally (not Docker), update `vite.config.js` proxy target from `http://backend:8000` back to `http://localhost:8000`.

---

## Google OAuth Flow (How It Works)

```
1. User clicks "Continue with Google"
        ↓
2. Browser navigates to http://localhost:5173/api/auth/google
        ↓
3. Vite proxy forwards to http://backend:8000/api/auth/google
        ↓
4. Backend builds Google auth URL with redirect_uri=http://localhost:5173/api/auth/callback
        ↓ 
5. Browser redirected to accounts.google.com — user consents
        ↓
6. Google redirects browser to http://localhost:5173/api/auth/callback?code=...
        ↓
7. Vite proxy forwards to http://backend:8000/api/auth/callback?code=...
        ↓
8. Backend exchanges code → fetches user info → upserts MongoDB user → creates JWT
        ↓
9. Backend redirects to http://localhost:5173/auth/callback?token=<jwt>
        ↓
10. React AuthCallback.jsx reads ?token=, saves to localStorage → navigate to /
```

---

## API Reference

Base URL: `http://localhost:8000`  
All protected routes require header: `Authorization: Bearer <token>`

| Method | Path | Auth | Description |
|---|---|:---:|---|
| `GET` | `/health` | No | Service health check |
| `GET` | `/api/auth/google` | No | Initiate Google OAuth — redirects to Google |
| `GET` | `/api/auth/callback` | No | OAuth callback — returns redirect with JWT |
| `GET` | `/api/auth/me` | Yes | Current authenticated user profile |
| `POST` | `/api/auth/logout` | Yes | Clear session |
| `POST` | `/api/papers/search` | Yes | Search Semantic Scholar, rank results |
| `GET` | `/api/papers/trending` | Yes | Trending research topics |
| `GET` | `/api/papers/{paper_id}` | Yes | Paper details from Semantic Scholar |
| `POST` | `/api/papers/index` | Yes | Embed + upsert papers into Pinecone (background) |
| `POST` | `/api/agents/run` | Yes | Run full LangGraph multi-agent workflow |
| `GET` | `/api/agents/execution/{id}` | Yes | Poll workflow execution status |
| `POST` | `/api/agents/compare` | Yes | Compare a set of papers |
| `GET` | `/api/users/{id}/history` | Yes | User's search history |
| `GET` | `/api/users/{id}/saved-papers` | Yes | User's saved papers |
| `POST` | `/api/users/{id}/save-paper` | Yes | Save a paper to profile |
| `DELETE` | `/api/users/{id}/saved-papers/{paperId}` | Yes | Remove saved paper |

---

## MongoDB Collections

```
paperlens (database)
├── users
│   ├── userId: String       (unique — Google sub ID)
│   ├── email: String        (unique)
│   ├── name: String
│   ├── picture: String
│   ├── createdAt: DateTime
│   ├── lastLoginAt: DateTime
│   ├── savedPapers: [String]
│   └── searchHistory: [String]
│
├── search_history
│   ├── userId: String       (indexed)
│   ├── query: String
│   ├── results: [Object]
│   └── searchedAt: DateTime (indexed desc)
│
└── executions
    ├── executionId: String  (unique)
    ├── userId: String       (indexed)
    ├── query: String
    ├── intent: String
    ├── steps: [String]
    ├── papers: [Object]
    ├── summaries: [Object]
    ├── comparison: Object
    ├── answer: String
    ├── error: String
    ├── currentStep: String
    ├── agentOutputs: Object
    └── createdAt: DateTime  (indexed desc)
```

---

## LangGraph Workflow

Defined in `backend/graph/workflow.py`:

```python
# AgentState TypedDict fields
# query, userId, question, intent, steps, papers,
# summaries, comparison, answer, error, currentStep,
# executionId, agentOutputs

graph = StateGraph(AgentState)
graph.add_node("planner_node",    planner_node)
graph.add_node("researcher_node", researcher_node)
graph.add_node("summarizer_node", summarizer_node)
graph.add_node("comparator_node", comparator_node)
graph.add_node("qa_node",         qa_node)
graph.add_node("end_node",        end_node)

graph.add_edge(START, "planner_node")
graph.add_edge("planner_node", "researcher_node")
graph.add_edge("researcher_node", "summarizer_node")
graph.add_conditional_edges(
    "summarizer_node",
    route_after_summarizer,   # question? → qa : compare intent? → comparator : end
    {"qa_node": "qa_node", "comparator_node": "comparator_node", "end_node": "end_node"},
)
graph.add_edge("comparator_node", "end_node")
graph.add_edge("qa_node", "end_node")
graph.add_edge("end_node", END)
```

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `TLSV1_ALERT_INTERNAL_ERROR` on MongoDB | OpenSSL 3.x in Docker incompatible with Atlas | Use `python:3.11-slim-bullseye` in Dockerfile (OpenSSL 1.1.x) |
| `Extra inputs are not permitted` on startup | Pydantic v2 rejects unknown env vars | `extra="ignore"` in `SettingsConfigDict` |
| `ModuleNotFoundError: No module named 'backend'` | Wrong import prefix inside container | Use `from config import` not `from backend.config import` |
| `ECONNREFUSED` from Vite proxy | Proxy pointing to `localhost` inside Docker | `vite.config.js` target must be `http://backend:8000` |
| 500 on `/api/auth/google` | Backend startup failed (check `docker compose logs backend`) | Fix MongoDB connection first |
| OAuth redirect to blank page | `GOOGLE_REDIRECT_URI` mismatch | Must be `http://localhost:5173/api/auth/callback` in both `.env` and Google Console |
| Double prefix routes (`/api/auth/auth/...`) | Router declares prefix AND main.py declares prefix | Remove prefix from `APIRouter()` in route files — prefix only in `main.py` |
