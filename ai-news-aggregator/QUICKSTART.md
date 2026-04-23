# 🚀 QUICK START - Step by Step

This guide shows you **exactly what to type** in terminal.

---

## ⚡ ONE-TIME SETUP (First Time Only)

### 1️⃣ Install Node.js

Download and install from: https://nodejs.org/ (LTS version)

Verify installation:
```bash
node --version
npm --version
```

### 2️⃣ Install Ollama

Download from: https://ollama.ai/download/windows

Run the installer and follow the steps.

### 3️⃣ Download Mistral Model

Open **PowerShell** (Win+X, then I) and run:
```powershell
ollama pull mistral
```

Wait until you see: ✅ `success`

This downloads the AI model (~4GB). You only need to do this once.

---

## 🎬 RUNNING THE APP (Every Time)

### 📍 From Windows Start Menu

1. Open **File Explorer**
2. Go to: `C:\Users\Siddheshwar\OneDrive\Desktop\Ai news\ai-news-aggregator`
3. Right-click on `start.bat` → Click **Open** ✅

**Done!** Both backend and frontend will start automatically.

---

## 📝 OR Run Manually in Terminals

### Terminal 1: Backend

```bash
cd "C:\Users\Siddheshwar\OneDrive\Desktop\Ai news\ai-news-aggregator\backend"
npm install
npm start
```

**Expected output:**
```
✅ Backend running on http://localhost:5000
🤖 Ollama should be running at http://localhost:11434
```

---

### Terminal 2: Frontend

Open **new terminal** (Ctrl+Shift+Esc → File → Run new task → cmd)

```bash
cd "C:\Users\Siddheshwar\OneDrive\Desktop\Ai news\ai-news-aggregator\frontend"
npm install
npm start
```

**Expected output:**
```
✅ Compiled successfully!
Webpack dev server is listening on: http://localhost:3000
```

Browser opens automatically at: http://localhost:3000

---

## ✅ You're Done!

Your app is now running:
- **Frontend**: http://localhost:3000 (Open in browser)
- **Backend**: http://localhost:5000 (API)
- **Ollama**: http://localhost:11434 (AI)

---

## 📸 What to Expect

1. **Load page** (http://localhost:3000)
2. **Click "Refresh"** button
3. **Wait 30-60 seconds** (AI is thinking)
4. **See news with summaries!**
5. **Switch between English 🇬🇧 and हिंदी 🇮🇳**

---

## 🛑 Troubleshooting

### "Backend won't start"
- Make sure npm install ran: `npm install` in backend folder
- Check port 5000 is free
- Restart command prompt

### "Frontend won't load"
- Check backend is running on port 5000
- Run `npm install` in frontend folder
- Clear browser cache (Ctrl+Shift+Delete)

### "Can't fetch news"
- Check Ollama is running (should be in system tray)
- Check internet connection
- Wait 1 minute and try again

### "Summary is slow"
- First time is slow (loading AI model)
- Next times are faster
- Use decent internet

---

## 🎓 For Your College Project

**Show your professor:**
1. Open http://localhost:3000
2. Click "Refresh"
3. Show the AI summaries working
4. Show Hindi translation
5. Mention: "Uses Ollama locally, no API charges"

---

**Questions? Check the main README.md in the project folder!**
