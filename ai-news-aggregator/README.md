# 🤖 AI News Aggregator

A free, no-rate-limit AI News Aggregator that fetches news from RSS feeds, summarizes them using **Ollama** (local AI), and translates to **Hindi**. Built with React, Express, and Tailwind CSS.

**Perfect for college Gen AI projects!**

---

## 📋 Prerequisites

Before starting, install these once:

1. **Node.js** (v16+) - [Download](https://nodejs.org/)
2. **Ollama** (for AI) - [Download](https://ollama.ai/download/windows)

---

## ⚡ Setup (First Time Only - 10 minutes)

### Step 1: Install Ollama & Download AI Model

1. Download & install **Ollama** from https://ollama.ai/download/windows
2. Open **PowerShell** or **Command Prompt** and run:
   ```bash
   ollama pull mistral
   ```
   This downloads the AI model (~4GB). It will show: ✅ "success"

3. Keep Ollama running in the background (it stays in system tray)

### Step 2: Install Backend Dependencies

```bash
cd "C:\Users\Siddheshwar\OneDrive\Desktop\Ai news\ai-news-aggregator\backend"
npm install
copy .env.example .env
```

Put secrets/API keys only in `backend/.env` and never commit that file.

### Step 3: Install Frontend Dependencies

```bash
cd "C:\Users\Siddheshwar\OneDrive\Desktop\Ai news\ai-news-aggregator\frontend"
npm install
```

---

## 🚀 Running the App (Every Time)

### Terminal 1: Start Backend

```bash
cd "C:\Users\Siddheshwar\OneDrive\Desktop\Ai news\ai-news-aggregator\backend"
npm start
```

You'll see: ✅ `Backend running on http://localhost:5000`

### Terminal 2: Start Frontend

```bash
cd "C:\Users\Siddheshwar\OneDrive\Desktop\Ai news\ai-news-aggregator\frontend"
npm start
```

You'll see: ✅ `Compiled successfully!`
Browser opens automatically at http://localhost:3000

### Terminal 3 (Optional): Keep Ollama Running

Make sure Ollama is running in the background. You can check:
```bash
curl http://localhost:11434/api/tags
```

---

## 📱 How to Use

1. Open http://localhost:3000 in your browser
2. Click **"Refresh"** to fetch latest news
3. Wait ~30-60 seconds for AI to summarize (first time is slower)
4. Select **English** or **हिंदी** (Hindi) from language dropdown
5. Read summaries & click "Read Full Article" to view original

---

## 🎯 Features

✅ **Free & No Rate Limits** - Uses RSS feeds + local Ollama  
✅ **AI Summaries** - Mistral AI summarizes each article  
✅ **Hindi Translation** - Auto-translates summaries to Hindi  
✅ **All News Categories** - Tech, Business, Security, General  
✅ **Responsive Design** - Works on mobile, tablet, desktop  
✅ **Real-time Updates** - Refresh anytime to get latest news  
✅ **Always-on Thumbnails** - Missing images get a clean placeholder thumbnail  
✅ **Text-to-Speech** - Speak summaries with one click  

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Backend** | Node.js + Express |
| **Frontend** | React + Tailwind CSS |
| **AI** | Ollama + Mistral Model |
| **News Source** | RSS Feeds (10+ sources) |
| **Translation** | Ollama |

---

## 📂 Project Structure

```
ai-news-aggregator/
├── backend/
│   ├── server.js          # Express server with API endpoints
│   ├── package.json       # Dependencies
│   └── node_modules/      # (auto-created after npm install)
│
└── frontend/
    ├── src/
    │   ├── App.js         # Main React component
    │   ├── index.js       # React entry point
    │   └── index.css      # Styles
    ├── public/
    │   └── index.html     # HTML template
    ├── tailwind.config.js # Tailwind CSS config
    ├── package.json       # Dependencies
    └── node_modules/      # (auto-created after npm install)
```

---

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/news` | GET | Fetch latest news (cached ~60s; use `?fresh=1` to force refresh) |
| `/api/summarize` | POST | Summarize custom text (use `includeHindi=false` to skip translation) |
| `/api/translate` | POST | Translate text to Hindi (faster than re-summarizing) |
| `/api/health` | GET | Check if backend is running |

---

## ⚠️ Troubleshooting

### Backend won't start
- Check if port 5000 is free: `netstat -ano \| findstr :5000`
- Make sure `npm install` was run in backend folder

### Frontend shows "Failed to fetch"
- Make sure backend is running on port 5000
- Check if Ollama is running: http://localhost:11434

### Summarization is slow
- First run is slower (loading AI model)
- Subsequent runs are faster
- Using CPU (no GPU) = slower, consider upgrading RAM

### News won't load
- Check internet connection
- Some RSS feeds might be down
- Check backend console for errors

---

## 📝 For College Submission

This project demonstrates:
- ✅ **Generative AI** - Using Ollama for summarization
- ✅ **Natural Language Processing** - Text summarization & translation
- ✅ **Full-Stack Development** - React frontend + Node.js backend
- ✅ **API Integration** - RSS feeds + Ollama API
- ✅ **Responsive Design** - Mobile-first UI
- ✅ **Free & Scalable** - No paid APIs, can handle 1000+ articles

---

## 🚀 Future Enhancements

- Add database to store articles
- Implement user preferences (favorite categories)
- Add dark/light mode toggle
- Deploy to cloud (Vercel, Railway)
- Add more languages
- Implement search functionality

---

## 📞 Support

If something breaks:
1. Check the troubleshooting section
2. Make sure all 3 terminals are running
3. Restart Ollama and run npm install again
4. Check console for error messages

---

**Happy coding! 🎉**
