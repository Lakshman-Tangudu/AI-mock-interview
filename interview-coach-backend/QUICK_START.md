## Quick Start Guide - Backend Setup

### 1. Install Dependencies (2 minutes)

```bash
cd interview-coach-backend
npm install
```

Or with yarn/bun:
```bash
yarn install
# or
bun install
```

### 2. Run the Server (1 minute)

**Development:**
```bash
npm run dev
```

Expected output:
```
Server running on http://localhost:5000
CORS enabled for: http://localhost:5173
```

**That's it! Your backend is running.**

### 3. Quick API Test (1 minute)

Open a new terminal and test:

```bash
# Test health
curl http://localhost:5000/api/health

# Get questions
curl "http://localhost:5000/api/questions?type=HR"

# Generate an interview
curl -X POST http://localhost:5000/api/questions/generate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "Technical",
    "difficulty": "Medium",
    "skills": ["React"],
    "timeframe": 15
  }'
```

### 4. Connect Frontend (5 minutes)

Update your frontend API calls from mock data to use the backend:

**Before (using mock data):**
```javascript
import { getQuestionsForConfig } from '@/lib/mock-data';
const questions = getQuestionsForConfig(config);
```

**After (using API):**
```javascript
const response = await fetch('http://localhost:5000/api/questions/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(config)
});
const data = await response.json();
const sessionId = data.sessionId;
const questions = data.questions.map(q => q.question);
```

---

## 30-Second Architecture Overview

```
┌─────────────────────────┐
│   React Frontend        │
│  (localhost:5173)       │
└────────────┬────────────┘
             │ HTTP
             ▼
┌─────────────────────────┐
│   Express Backend       │
│  (localhost:5000)       │
├─────────────────────────┤
│ Routes:                 │
│  /api/questions         │
│  /api/sessions          │
│  /api/health            │
└────────────┬────────────┘
             │ File I/O
             ▼
┌─────────────────────────┐
│  question_bank.json     │
│  (50+ questions)        │
│                         │
│  In-Memory Sessions     │
│  (fast, temp storage)   │
└─────────────────────────┘
```

---

## Available Endpoints (Copy & Paste Ready)

### Generate HR Interview Questions
```bash
curl -X POST http://localhost:5000/api/questions/generate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "HR",
    "difficulty": "Medium"
  }'
```

### Generate Technical Interview (React)
```bash
curl -X POST http://localhost:5000/api/questions/generate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "Technical",
    "difficulty": "Hard",
    "skills": ["React", "JavaScript"],
    "timeframe": 20
  }'
```

### Submit Interview Feedback
```bash
curl -X POST http://localhost:5000/api/sessions/{sessionId}/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "overallScore": 78,
    "readinessScore": 75,
    "summaryMessage": "Good performance!",
    "strengths": ["Clear communication", "Technical depth"],
    "improvements": ["More examples", "Reduce filler words"]
  }'
```

### Get Interview History
```bash
curl http://localhost:5000/api/sessions
```

---

## Estimated Timeline

- **Setup time:** ~5 minutes
- **Frontend integration:** ~30 minutes (depending on your code)
- **Total:** ~35 minutes to have fully working backend

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Port 5000 in use" | Change PORT in .env to 5001 |
| CORS errors | Ensure frontend is at http://localhost:5173 |
| Module not found | Run `npm install` again |
| "question_bank.json not found" | Verify file exists at `data/question_bank.json` |

---

## What's Included

✅ 50+ pre-configured interview questions  
✅ HR and Technical interviews  
✅ 4 difficulty levels across multiple skills  
✅ Session management  
✅ Feedback scoring system  
✅ CORS enabled for development  
✅ Input validation & error handling  
✅ Zero database setup required (perfect for MVP)  

---

## Next: Frontend Integration

See `FRONTEND_INTEGRATION.md` for detailed setup with your React app.
