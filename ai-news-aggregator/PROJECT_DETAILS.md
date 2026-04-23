# 🤖 AI News Aggregator - Complete Project Documentation

## 📋 Project Overview

**AI News Aggregator** is a full-stack web application that fetches real-time news from multiple RSS feeds, generates AI-powered summaries using Ollama/Mistral, and provides bilingual support (English & Hindi).

---

## 🏗️ Project Architecture

```
AI News Aggregator
├── Frontend (React)
│   ├── src/
│   │   ├── App.js (Main component)
│   │   ├── App.css (Styling)
│   │   └── index.js
│   └── package.json
│
├── Backend (Node.js + Express)
│   ├── server.js (Main server)
│   ├── mock-news.json (Fallback data)
│   ├── .env (Configuration)
│   └── package.json
│
└── README (Documentation)
```

---

## 💻 Technology Stack

### **Frontend**
| Technology | Purpose | Version |
|---|---|---|
| **React** | UI Framework | 18.x |
| **Axios** | HTTP Requests | 1.6.0 |
| **Tailwind CSS** | Styling | Built-in |
| **Lucide React** | Icons | Latest |

**Key Features:**
- Responsive grid layout (1 col mobile, 2 col tablet, 3 col desktop)
- Dark theme with purple/pink gradient
- Modal for detailed summaries
- Language toggle (English/Hindi)
- Real-time state management with React hooks

---

### **Backend**
| Technology | Purpose | Version |
|---|---|---|
| **Node.js** | Runtime | 16+ |
| **Express.js** | Web Framework | 4.18.2 |
| **CORS** | Cross-Origin Requests | 2.8.5 |
| **Axios** | HTTP Client | 1.6.0 |
| **rss-parser** | RSS Feed Parsing | 3.13.0 |

**Key Features:**
- REST API with 3 endpoints
- RSS feed aggregation (21 feeds)
- Article randomization
- HTML content cleaning
- Error handling & logging

---

### **AI/ML - Ollama**
| Technology | Purpose |
|---|---|
| **Ollama** | Local LLM Runtime |
| **Mistral** | Language Model |

**Capabilities:**
- Text summarization (6-line summaries)
- Translation to Hindi
- Custom prompts for specific tasks
- Local execution (no cloud required)

---

## 📚 Data Flow

```
1. USER CLICKS "REFRESH"
   ↓
2. FRONTEND CALLS: GET /api/news
   ↓
3. BACKEND FETCHES: 21 RSS Feeds
   ├── The Verge (Technology)
   ├── Ars Technica (Tech + Science)
   ├── BBC (Multiple categories)
   ├── Wired (Technology)
   ├── NASA (Science)
   ├── Bloomberg (Business)
   ├── Guardian (World)
   ├── And 14 more...
   ↓
4. BACKEND PROCESSING:
   ├── Extract articles (25 per feed)
   ├── Randomize for variety
   ├── Extract images from multiple formats
   ├── Clean HTML from descriptions
   ├── Remove duplicates
   ├── Prioritize articles with images
   ↓
5. BACKEND RETURNS: Top 50 articles
   ├── Articles WITH images (first)
   ├── Articles WITHOUT images (fill remaining)
   ↓
6. FRONTEND DISPLAYS: Grid of 50 articles
   ├── Card with thumbnail/gradient
   ├── Title (2 lines max)
   ├── Description (2 lines max, 300 chars)
   ├── Source & Date
   ├── "Get Summary" & "Read" buttons
   ↓
7. USER CLICKS "GET SUMMARY" (or "View Summary")
   ↓
8. FRONTEND CALLS: POST /api/summarize
   └── Sends: Article description/text
   ↓
9. BACKEND:
   ├── Cleans HTML from text
   ├── Calls OLLAMA to summarize
   │   └── Returns 6-line summary (English)
   ├── Calls OLLAMA to translate
   │   └── Returns 6-line summary (Hindi)
   ↓
10. FRONTEND DISPLAYS: Modal with summary
    ├── English summary (if English selected)
    ├── Hindi summary (if हिंदी selected)
    ├── "Read Full Article" link
    ├── "Close" button
```

---

## 🌐 RSS Feeds Used (21 Total)

### **Technology (6 feeds)**
- https://www.theverge.com/rss/index.xml
- https://feeds.arstechnica.com/arstechnica/index
- https://feeds.bbci.co.uk/news/technology/rss.xml
- https://www.wired.com/feed/rss
- https://www.theguardian.com/technology/rss
- https://feeds.gizmodo.com/gizmodo/full

### **Science & Space (3 feeds)**
- https://www.nasa.gov/rss/dyn/breaking_news.rss
- https://feeds.arstechnica.com/arstechnica/science
- https://feeds.smithsonianmag.com/science

### **Business & Startups (2 feeds)**
- https://feeds.bloomberg.com/markets/news.rss
- https://feeds.mashable.com/feeds/rss/mashable.xml

### **Health & Medical (1 feed)**
- https://feeds.bbci.co.uk/news/health_and_science/rss.xml

### **World News (4 feeds)**
- https://feeds.bbci.co.uk/news/world/rss.xml
- https://feeds.bbci.co.uk/news/rss.xml
- https://www.theguardian.com/world/rss
- (BBC General)

### **Entertainment & Culture (1 feed)**
- https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml

### **Tech News Alternative (1 feed)**
- https://feeds.kotaku.com/kotaku/full

---

## 🔌 API Endpoints

### **1. GET /api/news**
**Purpose:** Fetch all news articles

**Request:**
```
GET http://localhost:5000/api/news
```

**Response:**
```json
{
  "success": true,
  "count": 50,
  "articles": [
    {
      "title": "Article Title",
      "description": "Clean text without HTML...",
      "link": "https://example.com/article",
      "source": "The Verge",
      "category": "Technology",
      "pubDate": "2026-04-18T10:30:00Z",
      "image": "https://example.com/image.jpg"
    }
  ],
  "fetchedAt": "10:34:07 am"
}
```

---

### **2. POST /api/summarize**
**Purpose:** Get 6-line AI summary + Hindi translation

**Request:**
```bash
curl -X POST http://localhost:5000/api/summarize \
  -H "Content-Type: application/json" \
  -d {"text": "Article description here..."}
```

**Response:**
```json
{
  "success": true,
  "en": "Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6",
  "hi": "पंक्ति 1\nपंक्ति 2\n..."
}
```

---

### **3. GET /api/health**
**Purpose:** Health check

**Response:**
```json
{
  "status": "Backend is running",
  "ollama": "http://localhost:11434"
}
```

---

## 🛠️ Backend Functions

### **cleanContent(text)**
- Removes all HTML tags
- Decodes HTML entities (&amp;, &quot;, etc.)
- Limits description to 300 characters
- Removes extra whitespace

### **summarizeText(text, retries=2)**
- Uses Ollama/Mistral model
- Generates exactly 6-line summary
- Temperature: 0.5 (balanced)
- Retry logic (2 retries on failure)
- Timeout: 120 seconds

### **translateToHindi(text, retries=2)**
- Translates English to Hindi
- Prompt in Hindi for better results
- Temperature: 0.3 (consistent)
- Retry logic (2 retries)
- Timeout: 60 seconds

### **getImageFromFeedItem(item)**
Extracts images from multiple RSS metadata formats:
1. `media:content` (most reliable)
2. `media:thumbnail`
3. `image` property
4. `itunes:image`
5. `enclosure` (image type)
6. HTML `<img>` tags
7. `<figure>` or `<picture>` tags

### **fetchAllNews()**
- Fetches from 21 RSS feeds
- Shuffles/randomizes articles for variety
- Filters duplicates (by title)
- Prioritizes articles with images
- Returns up to 50 articles

---

## 📦 Dependencies

### **Frontend (package.json)**
```json
{
  "react": "^18.x",
  "axios": "^1.6.0",
  "lucide-react": "latest"
}
```

### **Backend (package.json)**
```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "axios": "^1.6.0",
  "rss-parser": "^3.13.0"
}
```

---

## ⚙️ Configuration (.env)

```env
PORT=5000                                    # Backend port
OLLAMA_URL=http://localhost:11434/api/generate  # Ollama API
SUMMARIZE_MODEL=mistral                      # Model name
NEWS_API_KEY=your_api_key_here                 # Keep only in local .env
```

---

## 🎨 Frontend Features

### **Header**
- Logo with gradient badge
- Language selector (English/Hindi)
- Refresh button with loading spinner

### **Article Card**
- Thumbnail image (or gradient placeholder)
- Category badge
- Title (2 lines max)
- Publication date
- Clean description (300 chars, 2 lines max)
- Source attribution
- "Get Summary" button (primary action)
- "Read" button (external link)

### **Summary Modal**
- Article title header
- Language-aware summary display
- "Close" button
- "Read Full Article" button

### **Responsive Design**
- Mobile: 1 column
- Tablet: 2 columns
- Desktop: 3 columns

---

## 🚀 How It Works - Step by Step

### **On App Start:**
1. Frontend loads component
2. `useEffect` triggers `fetchNews()`
3. Axios calls `GET /api/news`
4. Backend fetches all 21 RSS feeds
5. Processes and returns 50 articles
6. React renders grid of articles

### **On Refresh Click:**
1. User clicks "Refresh" button
2. `setLoading(true)` shows spinner
3. `fetchNews()` called again
4. Backend fetches fresh articles (randomized)
5. Different selection of articles returned
6. Grid updates with new articles

### **On Get Summary Click:**
1. User clicks "Get Summary" on article
2. Frontend checks if summary cached (it is, show)
3. If not cached: `axios.post(/api/summarize, {text})`
4. Backend cleans text and sends to Ollama
5. Ollama generates 6-line summary
6. Ollama translates to Hindi
7. Frontend stores in state
8. Modal opens showing selected language

### **On Language Toggle:**
1. User clicks language selector
2. `setSelectedLanguage()` updates state
3. Modal re-renders with different summary
4. English or Hindi displays based on selection

---

## 🐛 Error Handling

| Error | Handling |
|-------|----------|
| RSS feed timeout | Logged, continues with other feeds |
| XML parsing error | Caught, feed skipped |
| Summary generation fails | Retries 2 times, then error to user |
| Translation fails | Returns original English text |
| No articles fetched | Falls back to mock-news.json |
| Ollama not running | Returns error: "Make sure Ollama is running" |

---

## 📊 Performance Metrics

| Metric | Value |
|--------|-------|
| Articles fetched | 50 (max) |
| Feeds queried | 21 |
| Summary generation time | 20-30 seconds |
| Translation time | 5-10 seconds |
| Total fetch time | 10-15 seconds |
| Image extraction success | ~20-30% of articles |

---

## 🔐 Security Features

- ✅ HTML content sanitization (removes scripts)
- ✅ Input validation (text required for summarization)
- ✅ CORS enabled for frontend access
- ✅ API key stored in .env (not in code)
- ✅ Error messages don't expose sensitive info

---

## 🎯 Key Decisions & Design

### **Why RSS instead of NewsAPI?**
- NewsAPI has rate limits (100 requests/day on free)
- RSS feeds are unlimited and free
- 21 diverse sources provide better coverage

### **Why Ollama/Mistral instead of OpenAI?**
- Local execution (privacy)
- No API keys needed
- Completely free
- Works offline

### **Why randomization instead of pagination?**
- Users prefer fresh content on refresh
- Simulates continuous news feed
- Better UX than page numbers

### **Why 6-line summaries?**
- Long enough to capture key info
- Short enough to read quickly
- Fits nicely in modal

### **Why prioritize images?**
- Better visual appeal
- Gradient backgrounds as fallback
- Modern UI expectation

---

## 📱 User Experience Flow

```
1. User opens app
   ↓
2. 50 news articles display immediately
   ↓
3. Can read article titles and descriptions
   ↓
4. Click "Get Summary" → Wait 20-30 sec
   ↓
5. See 6-line AI summary in English
   ↓
6. Toggle to Hindi → See translation
   ↓
7. Click "Read Full Article" → Open in new tab
   ↓
8. Back to articles grid
   ↓
9. Click "Refresh" → Different 50 articles
   ↓
10. Repeat cycle
```

---

## 🚀 How to Run

### **Terminal 1 - Backend:**
```bash
cd backend
npm install
npm start
```
**Expects:** Backend on `http://localhost:5000`

### **Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm start
```
**Expects:** Frontend on `http://localhost:3000`

### **Terminal 3 - Ollama (Optional):**
```bash
ollama serve
```
**Expects:** Ollama on `http://localhost:11434`

---

## 📝 Files Structure

```
backend/
  ├── server.js (Main file - ~410 lines)
  ├── .env (Config)
  ├── mock-news.json (Fallback data)
  └── package.json

frontend/
  ├── src/
  │   ├── App.js (Main component - ~370 lines)
  │   ├── App.css (Tailwind styles)
  │   └── index.js
  └── package.json
```

---

## ✨ Features Summary

| Feature | Status | Details |
|---------|--------|---------|
| Fetch News | ✅ Working | 21 RSS feeds, 50 articles |
| Display Articles | ✅ Working | Grid layout, responsive |
| Article Images | ✅ Working | From RSS or gradients |
| AI Summarization | ✅ Working | 6-line summaries via Ollama |
| Hindi Translation | ✅ Working | Pure Hindi, no English mix |
| Language Toggle | ✅ Working | English/हिंदी switch |
| Randomization | ✅ Working | Different articles each refresh |
| Mock Fallback | ✅ Working | 10 sample articles if feeds fail |
| Error Handling | ✅ Working | Graceful failures, user feedback |
| Responsive Design | ✅ Working | Mobile/Tablet/Desktop |

---

## 🎓 Learning Outcomes

By building this project, you learned:
- **Frontend:** React hooks, Axios, Tailwind CSS, responsive design
- **Backend:** Express API, RSS parsing, data processing, error handling
- **AI/ML:** Ollama integration, prompt engineering, translation
- **Full Stack:** API design, client-server communication, state management
- **DevOps:** Environment variables, port management, process coordination

---

**Last Updated:** April 18, 2026
**Status:** Production Ready ✅
