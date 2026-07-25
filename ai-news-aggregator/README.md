# 📡 Signal — AI News Aggregator

**Signal** pulls live articles from 29 RSS feeds across 8 categories, scores each one for source credibility, and summarizes any article into 6 lines using a **locally-run AI model** (Ollama) — with one-click Hindi translation and text-to-speech. No paid APIs, no rate limits, no data leaving your machine.

<p align="center">
  <img src="docs/screenshots/feed.png" alt="Signal — article feed" width="100%" />
</p>
<p align="center">
  <img src="docs/screenshots/summary-modal.png" alt="Signal — AI summary modal" width="100%" />
</p>

<p align="center">
  <img alt="Node" src="https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/frontend-React%2018-61DAFB?logo=react&logoColor=white" />
  <img alt="Express" src="https://img.shields.io/badge/backend-Express-000000?logo=express&logoColor=white" />
  <img alt="Ollama" src="https://img.shields.io/badge/AI-Ollama%20(local)-1a1a1a?logo=ollama&logoColor=white" />
  <img alt="Tailwind" src="https://img.shields.io/badge/styling-Tailwind%20CSS-06B6D4?logo=tailwindcss&logoColor=white" />
</p>

---

## Why

Most news apps either paywall you, rate-limit you, or bury the story under ads. Signal fetches straight from publisher RSS feeds (free, unlimited) and runs summarization/translation on a **local LLM via Ollama** — so there's no API key to manage, no per-request cost, and nothing sent to a third-party AI provider.

## Features

- **6-line AI summaries** — any article, condensed on demand by a local Ollama model
- **Hindi translation** — one click, cached so repeat requests are instant
- **Text-to-speech** — listen to summaries in English or Hindi (browser voices)
- **Source credibility scoring** — each article gets a 0–100 score from source reputation, cross-outlet corroboration, and recency
- **Compare sources** — find similar coverage of the same story from other outlets (title/description similarity, not just keyword match)
- **Category filters + search** — Technology, Science, Business, Health, India, World, Entertainment, Sports
- **Trending tab** — built from your own read/watch history (stored locally, never sent anywhere)
- **Thumbnail pipeline** — pulls images from RSS media tags, falls back to Open Graph scraping, then a generated placeholder — never a broken image
- **60-second article cache + in-flight request dedup** — a burst of page loads doesn't refetch 29 feeds 29 times
- **Resilient by design** — per-feed failures don't take down the whole fetch; if every feed fails, the app serves bundled mock data instead of a blank screen

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Tailwind CSS, Axios, lucide-react |
| Backend | Node.js, Express, `rss-parser`, `axios-retry` |
| AI | [Ollama](https://ollama.ai) running locally (any model you pull — no API key) |
| News source | 29 public RSS feeds (BBC, The Guardian, Ars Technica, NASA, The Verge, Wired, The Hindu, ESPNcricinfo, and more) |

## How it fits together

```
 29 RSS feeds  ──▶  Express backend  ──▶  React frontend
 (8 categories)     • dedupes by title       (search, filter, compare,
                     • scores credibility      speak, read)
                     • fetches OG images
                     • 60s article cache
                            │
                            │  POST /api/summarize, /api/translate
                            ▼
                     Ollama (localhost:11434)
                     any model you've pulled
```

---

## Getting Started

### Prerequisites

- **Node.js 18+** — [Download](https://nodejs.org/)
- **Ollama** — [Download](https://ollama.ai/download)

### 1. Install an Ollama model

```bash
ollama pull qwen2.5:1.5b
```

Keep Ollama running in the background (`ollama serve`, or it auto-starts as a tray app on Windows/macOS).

> **Which model should I pick?** See [Choosing a model](#choosing-a-model) below — it depends on how much free RAM your machine has, and picking a model that's too large is the #1 reason summaries fail.

### 2. Backend

```bash
cd backend
npm install
copy .env.example .env      # macOS/Linux: cp .env.example .env
npm start
```

You should see `✅ Backend running on http://localhost:5000`. Sanity-check Ollama connectivity anytime with:

```bash
curl http://localhost:5000/api/health
# {"status":"Backend is running","ollama":"running","ollamaUrl":"http://localhost:11434/api/generate"}
```

### 3. Frontend

```bash
cd frontend
npm install
npm start
```

Opens automatically at **http://localhost:3000**.

### 4. Use it

Click a category, hit **Get Summary** on any article, and switch the language dropdown between **English** and **हिंदी**. First summary of a session is slower (the model has to load into memory); after that, repeats of the same article are served from cache instantly.

---

## Configuration

### Backend (`backend/.env`)

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `5000` | Backend port |
| `OLLAMA_URL` | `http://localhost:11434/api/generate` | Change if Ollama runs elsewhere |
| `SUMMARIZE_MODEL` | `mistral` | Model used for summaries — see below |
| `TRANSLATE_MODEL` | same as `SUMMARIZE_MODEL` | Model used for Hindi translation |
| `SUMMARY_INPUT_LIMIT` | `240` | Characters of article text sent to the model per summary |

### Frontend (`frontend/.env`, optional)

| Variable | Default | Notes |
|---|---|---|
| `REACT_APP_API_URL` | `http://localhost:5000` | Point at a non-local backend (e.g. deployed) |

### Choosing a model

`mistral` (7B) is the highest-quality default, but it needs **~4–5GB of free RAM** to load. If summaries fail with a 500 and the backend log shows `model requires more system memory than is available`, your machine doesn't have that headroom — switch to something lighter:

```bash
ollama pull qwen2.5:1.5b
```

```dotenv
# backend/.env
SUMMARIZE_MODEL=qwen2.5:1.5b
TRANSLATE_MODEL=qwen2.5:1.5b
```

`qwen2.5:1.5b` needs well under 1.5GB and comfortably handles 6-line summaries and Hindi translation in a few seconds — this is the right default for laptops without a lot of spare RAM. `/api/health` reports live whether Ollama is reachable at all, but a model-too-large failure only shows up on an actual summarize call, so if summaries are the thing that's broken, that's the first thing to check.

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/news` | GET | Latest articles (60s cache; `?fresh=1` forces a refetch) |
| `/api/summarize` | POST | `{ text, includeHindi? }` → `{ en, hi? }` 6-line summary |
| `/api/translate` | POST | `{ text }` → `{ hi }` Hindi translation only (skips summarization) |
| `/api/health` | GET | Backend status + live Ollama reachability |

## Project Structure

```
ai-news-aggregator/
├── backend/
│   ├── server.js          # Express app: RSS fetch, scoring, Ollama calls, caching
│   ├── mock-news.json     # Fallback data if every RSS feed fails
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.js          # All UI + client-side logic (search, compare, TTS, watch history)
    │   ├── App.css / index.css
    │   └── index.js
    ├── public/index.html
    ├── tailwind.config.js
    └── package.json
```

---

## Troubleshooting

**Backend won't start**
Check port 5000 is free (`netstat -ano | findstr :5000` on Windows) and that `npm install` ran in `backend/`.

**"Failed to fetch" in the browser**
Backend isn't running, or `REACT_APP_API_URL` points somewhere unreachable. Confirm with `curl http://localhost:5000/api/health`.

**Summary/translate requests fail or time out**
1. Confirm Ollama is actually running: `curl http://localhost:11434/api/tags`
2. Check the backend console — it now surfaces the real Ollama error (not enough RAM, model not pulled, etc.) instead of a bare "status code 500"
3. If it's a memory error, see [Choosing a model](#choosing-a-model)

**Some news categories look thin or a feed is missing**
Individual RSS feeds occasionally go down; the backend logs failed feeds but keeps serving the rest. Check the backend console for `❌ Failed feeds`.

---

## Roadmap

- [ ] Persist articles/summaries in a database (currently in-memory, resets on restart)
- [ ] Parallelize summarization instead of one Ollama call at a time
- [ ] Sentiment analysis and topic clustering across the full article pool
- [ ] User accounts + server-side personalization (today, "Trending" is local-only)
- [ ] Deploy guide (Vercel/Railway for frontend+backend, plus a hosted Ollama alternative)

## License

No license file is included yet — until one is added, all rights are reserved by default. If you intend to share or accept contributions on GitHub, add a `LICENSE` file (MIT is a common choice for a project like this).
