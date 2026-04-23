# 🔍 AI News Aggregator - Complete Code Walkthrough

## 📐 Project Architecture

```
Frontend (React)          ↔          Backend (Express)       ↔     External APIs
http://localhost:3000              http://localhost:5000          
   - App.js                          - server.js                  - NewsAPI
   - API calls to backend            - API endpoints              - Ollama (Local AI)
   - Display articles                - News fetching              - Translation
   - UI components                   - Summarization
```

---

## 🔧 **BACKEND BREAKDOWN** (server.js - 331 lines)

### 1. **Dependencies & Setup** (Lines 1-10)
```javascript
const express = require('express');        // Web framework
const cors = require('cors');              // Cross-Origin requests
const axios = require('axios');            // HTTP requests
```
- **Express**: Creates the API server
- **CORS**: Allows frontend to communicate with backend
- **Axios**: Makes HTTP requests to NewsAPI & Ollama

### 2. **Configuration** (Lines 9-14)
```javascript
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const SUMMARIZE_MODEL = 'mistral';
const NEWS_API_KEY = '54cf15ecbd0840d0a2bcf1a2f98d3ebe';
const NEWS_API_URL = 'https://newsapi.org/v2/everything';
```
- **Ollama**: Local AI running on port 11434
- **NewsAPI**: External API to fetch news articles
- Both are configured here for easy changes

### 3. **News Categories** (Lines 17-64)
```javascript
const NEWS_QUERIES = [
  { q: 'technology news', category: 'Technology' },
  { q: 'artificial intelligence', category: 'Technology' },
  ...
  { q: 'world news', category: 'World' },
];
```
**What this does:**
- Defines what news to fetch
- Each query is mapped to a category
- 30+ queries total = 30+ API calls
- Results get combined into one news feed

**Categories:**
- Technology (6 queries)
- Sports (5 queries)
- Politics (4 queries)
- War & Conflict (3 queries)
- Health & Science (4 queries)
- Business & Finance (4 queries)
- Entertainment (3 queries)
- World News (2 queries)

### 4. **Helper Functions**

#### **cleanContent()** (Lines 67-92)
```javascript
function cleanContent(text) {
  // Decode HTML entities: &nbsp; → space, &amp; → &
  // Remove HTML tags: <p> → removed
  // Remove brackets: [...] → removed
  // Reduce spaces: "a  b" → "a b"
}
```
**Why:** Articles from RSS feeds often have messy HTML. This cleans them up.

#### **summarizeText()** (Lines 95-133)
```javascript
async function summarizeText(text, retries = 2) {
  // 1. Clean text (max 1500 chars)
  // 2. Send to Ollama with prompt: "Summarize in 6 lines"
  // 3. Get AI response
  // 4. If fails, retry up to 2 times
}
```
**Flow:**
1. Takes article text
2. Sends to Ollama (local AI)
3. Ollama returns 6-line summary
4. Has retry logic if Ollama is slow

#### **translateToHindi()** (Lines 136-154)
```javascript
async function translateToHindi(text, retries = 2) {
  // Sends text to Ollama with prompt: "Translate to Hindi"
  // Returns Hindi translation
}
```
**Note:** Not currently used in frontend, but ready for implementation!

#### **getImageFromArticle()** (Lines 157-174)
```javascript
function getImageFromArticle(item) {
  // Tries multiple sources for article image:
  // 1. Media:content tag
  // 2. Media:thumbnail tag
  // 3. Enclosure (podcast/video)
  // 4. HTML img tag from description
}
```
**Why:** Different news sources store images in different formats. This checks them all.

### 5. **Main Function: fetchAllNews()** (Lines 177-244)

**The entire news fetching pipeline:**

```
┌─────────────────────────────────────┐
│ 1. START (fetchAllNews called)      │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 2. Pick random page (1-3) for       │
│    different results each time      │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 3. Loop through each query in       │
│    NEWS_QUERIES (30+ queries)       │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 4. For each query, call NewsAPI:    │
│    - q: "technology news"           │
│    - pageSize: 10 articles          │
│    - language: "en"                 │
│    - sortBy: "publishedAt"          │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 5. Add category to each article:    │
│    {                                │
│      title, description, link,      │
│      source, category, pubDate,     │
│      image                          │
│    }                                │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 6. Combine all articles into        │
│    allArticles array                │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 7. Remove duplicates by title       │
│    (Same article from multiple      │
│     sources = keep only 1)          │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 8. Sort by newest first             │
│    (publishedAt date)               │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 9. Return top 30 articles           │
└─────────────────────────────────────┘
```

**Code Example:**
```javascript
for (const query of NEWS_QUERIES) {
  // Call NewsAPI with query
  const response = await axios.get(NEWS_API_URL, {
    params: {
      q: query.q,              // "technology news"
      apiKey: NEWS_API_KEY,
      sortBy: 'publishedAt',   // Newest first
      language: 'en',
      pageSize: 10,
      page: randomPage,        // Random page (1-3)
    },
  });
  
  // Map each article and add category
  const articles = response.data.articles.map(item => ({
    title: item.title,
    description: item.description,
    link: item.url,
    source: item.source.name,
    category: query.category,  // ← Category added here!
    pubDate: item.publishedAt,
    image: item.urlToImage,
  }));
  
  allArticles.push(...articles);
}
```

### 6. **API Endpoints**

#### **GET /api/news** (Lines 247-275)
```javascript
app.get('/api/news', async (req, res) => {
  // Called by: Frontend "Refresh" button
  // Returns: 30 articles with categories, no summaries yet
  
  return {
    success: true,
    count: 25,
    articles: [...],
    fetchedAt: "2:30 PM"
  }
});
```

#### **POST /api/summarize** (Lines 278-314)
```javascript
app.post('/api/summarize', async (req, res) => {
  // Called by: Frontend "Get Summary" button
  // Input: { text: "article description" }
  // Process:
  //   1. Clean HTML from text
  //   2. Send to Ollama for 6-line summary
  //   3. Return summary
  
  return {
    success: true,
    summary: "Line 1\nLine 2\n..."
  }
});
```

#### **GET /api/health** (Lines 317-319)
```javascript
app.get('/api/health', (req, res) => {
  // Checks if backend is running
  // Used for debugging
});
```

---

## 🎨 **FRONTEND BREAKDOWN** (App.js - 368 lines)

### 1. **State Variables** (Lines 6-13)
```javascript
const [articles, setArticles] = useState([]);           // All fetched articles
const [loading, setLoading] = useState(false);          // Loading spinner
const [error, setError] = useState('');                 // Error messages
const [selectedLanguage, setSelectedLanguage] = useState('en');  // en or hi
const [summaries, setSummaries] = useState({});         // Cached summaries
const [loadingSummary, setLoadingSummary] = useState({});       // Per-article loading
const [selectedArticle, setSelectedArticle] = useState(null);   // Which summary modal is open
```

### 2. **Fetch News Function** (Lines 17-32)
```javascript
const fetchNews = async () => {
  setLoading(true);          // Show spinner
  setSummaries({});          // Clear old summaries
  
  const response = await axios.get(
    `${API_URL}/api/news?t=${Date.now()}`  // ?t= busts cache
  );
  
  setArticles(response.data.articles);     // Store in state
  setLoading(false);         // Hide spinner
};
```
**Called when:**
- Page loads (useEffect, line 66-68)
- User clicks "Refresh" button

### 3. **Get Summary Function** (Lines 34-64)
```javascript
const getSummary = async (index, description, title) => {
  // Check if already summarized
  if (summaries[index]) {
    setSelectedArticle(index);  // Show modal
    return;
  }
  
  // Request summary from backend
  const response = await axios.post(`${API_URL}/api/summarize`, {
    text: description,
  });
  
  // Store summary (indexed by article index)
  setSummaries(prev => ({
    ...prev,
    [index]: {
      en: response.data.summary,  // English version
      title: title,
    },
  }));
  
  setSelectedArticle(index);  // Show modal
};
```

### 4. **Helper Functions**

#### **formatDate()** (Lines 70-83)
```javascript
// Input: "2026-04-17T10:30:00Z"
// Output: "Today", "Yesterday", or "Apr 17"
```

#### **getCategoryBgColor()** (Lines 85-95)
```javascript
// Input: "Technology"
// Output: "bg-blue-100 text-blue-800" (Tailwind classes)
// Maps categories to colors
```

#### **getPlaceholderImage()** (Lines 97-107)
```javascript
// If article has no image, show gradient placeholder
// Different gradient for each category
```

### 5. **UI Components**

#### **Header** (Lines 112-155)
- Logo + Title
- Language selector (English / हिंदी)
- Refresh button
- Sticky at top

#### **Article Cards Grid** (Lines 189-287)
Each card has:
```
┌─────────────────────────┐
│ [Image or Placeholder]  │
│ [Category Badge]        │
├─────────────────────────┤
│ Date: Today             │
│ Title: "AI Breakthrough"│
│ Description preview...  │
│ Source: TechCrunch      │
│                         │
│ [Get Summary] [Read]    │
└─────────────────────────┘
```

#### **Summary Modal** (Lines 302-355)
- Shows when user clicks "View Summary"
- Displays 6-line summary
- Can switch between English & Hindi
- "Read Full Article" button links to source

---

## 🔄 **DATA FLOW - Step by Step**

### **Scenario: User clicks "Refresh"**

```
Frontend              Backend              NewsAPI            Ollama
────────              ───────              ───────            ──────

1. Click "Refresh"
   setLoading(true)

2. GET /api/news ─────────────────→
                     fetchAllNews()
                     
3.                  Loop 30 queries
                     GET /everything ────→
                                          Returns 10 articles
                     GET /everything ────→
                                          Returns 10 articles
                     ... (30 times)
                     
4.                  Combine + dedupe
                    Sort by date
                    
5.                  ←───────────────  { articles: [...] }
   
6. setArticles([...])
   setLoading(false)
   
7. Display 30 article cards
```

### **Scenario: User clicks "Get Summary"**

```
Frontend              Backend              Ollama
────────              ───────              ──────

1. Click "Get Summary"
   setLoadingSummary[3] = true
   
2. POST /api/summarize
   { text: "Article description..." } ───→
   
3.                  cleanContent(text)
                    Send prompt to Ollama ──→
                                             AI processes
                                             Returns 6 lines
                    ←────────────────
4.                  ←────────────────  { summary: "..." }
   
5. setSummaries[3] = { en: "..." }
   Show modal
```

---

## 📊 **Category System**

**How Categories Work:**

1. **Backend Defines:** NEWS_QUERIES has category field
2. **API Adds:** When fetching, category is attached to each article
3. **Frontend Shows:** Displays category badge with color

**Color Mapping (App.js, lines 85-95):**
```javascript
Technology   → Blue
Sports       → Green  (implied)
Politics     → Purple (implied)
Health       → Red
Business     → Green
...etc
```

---

## 🛠️ **Technologies Used**

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 | UI components, state management |
| | Tailwind CSS | Styling |
| | Lucide React | Icons |
| | Axios | HTTP requests |
| **Backend** | Node.js + Express | API server |
| | Axios | HTTP requests to APIs |
| | CORS | Allow frontend to connect |
| **External** | NewsAPI | News source |
| | Ollama | Local AI (summarization) |

---

## 🔌 **API Endpoints Summary**

| Endpoint | Method | Input | Output |
|----------|--------|-------|--------|
| `/api/news` | GET | - | `{ articles: [...], count: N }` |
| `/api/summarize` | POST | `{ text: "..." }` | `{ summary: "..." }` |
| `/api/health` | GET | - | `{ status: "ok" }` |

---

## 🚀 **Execution Order (User Perspective)**

1. **Load App** → `useEffect` calls `fetchNews()`
2. **Backend fetches** → 30 queries to NewsAPI
3. **Articles appear** → Grid of cards shows
4. **User clicks "Get Summary"** → Backend calls Ollama
5. **Summary appears** → Modal pops up
6. **User switches language** → State updates (but summary stays English for now)
7. **User clicks "Refresh"** → Whole process repeats

---

## ⚡ **Performance Notes**

- **First load:** 10-20 seconds (NewsAPI + Ollama)
- **Subsequent summaries:** 5-10 seconds per article
- **Articles cached:** Until page refresh
- **Summaries cached:** In frontend state (lost on page refresh)

---

## 🐛 **Key Design Patterns**

1. **Caching:** Frontend stores summaries to avoid re-summarizing
2. **Retry Logic:** If Ollama fails, retries 2 times automatically
3. **Deduplication:** Same article from multiple sources = shown once
4. **Random Pagination:** Different results each time user refreshes
5. **Category Pre-assignment:** Backend assigns category before sending to frontend

---

**That's the complete architecture! Want me to explain any specific part in more detail?**
