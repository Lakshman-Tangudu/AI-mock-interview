# Frontend Integration Guide

This guide explains how to integrate the backend API into your existing React frontend.

## Overview

Your frontend currently uses mock data from `src/lib/mock-data.ts`. We'll update it to use the backend API while maintaining the same component structure.

## Integration Steps

### Step 1: Create API Client (src/lib/api.ts)

Create a new file to handle all backend API calls:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function fetchQuestions(config: InterviewConfig) {
  const response = await fetch(`${API_BASE_URL}/questions/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: config.type,
      difficulty: config.difficulty,
      skills: config.skills,
      timeframe: config.timeframe,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch questions');
  }

  const data = await response.json();
  return {
    sessionId: data.sessionId,
    questions: data.questions.map(q => q.question),
  };
}

export async function submitFeedback(
  sessionId: string,
  feedback: SessionFeedback
) {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(feedback),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to submit feedback');
  }

  return response.json();
}

export async function getAVAILABLE_SKILLS() {
  const response = await fetch(`${API_BASE_URL}/questions/meta/skills`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch skills');
  }

  const data = await response.json();
  return data.skills;
}

export async function getSessions() {
  const response = await fetch(`${API_BASE_URL}/sessions`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch sessions');
  }

  const data = await response.json();
  return data.sessions;
}

export async function getSession(sessionId: string) {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch session');
  }

  return response.json();
}
```

### Step 2: Update Environment Configuration

Add to `.env` file in frontend root:

```
VITE_API_URL=http://localhost:5000/api
```

For production, create `.env.production`:

```
VITE_API_URL=https://api.yourdomain.com/api
```

### Step 3: Update InterviewSetup.tsx

```typescript
// Replace the getQuestionsForConfig call with API call
import { fetchQuestions } from '@/lib/api';

export default function InterviewSetup() {
  const navigate = useNavigate();
  const { setConfig, setQuestions, setCurrentSession } = useInterview();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartInterview = async (config: InterviewConfig) => {
    try {
      setLoading(true);
      setError(null);

      // Call backend API
      const result = await fetchQuestions(config);

      // Store in context
      setConfig(config);
      setQuestions(result.questions);
      setCurrentSession({ 
        id: result.sessionId, 
        createdAt: new Date().toISOString() 
      });

      navigate('/interview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start interview');
      console.error('Error starting interview:', err);
    } finally {
      setLoading(false);
    }
  };

  // Render your form, disable submit button while loading
}
```

### Step 4: Update MockInterview.tsx (Feedback Submission)

```typescript
// In the finishInterview function, submit feedback to backend
import { submitFeedback } from '@/lib/api';

const finishInterview = useCallback(async () => {
  if (timerRef.current) clearInterval(timerRef.current);
  if (!config) return;

  const feedback = generateMockFeedback(config, questions);
  
  try {
    // Get session ID from context (you'll need to store this)
    const sessionId = currentSession?.id;
    if (sessionId) {
      await submitFeedback(sessionId, feedback);
    }
  } catch (error) {
    console.error('Error submitting feedback:', error);
  }

  const session: InterviewSession = {
    id: sessionId || `session-${Date.now()}`,
    date: new Date().toISOString(),
    type: config.type,
    skills: config.skills,
    duration: config.timeframe,
    score: feedback.overallScore,
    readinessScore: feedback.readinessScore,
    feedback,
  };

  setCurrentSession(session);
  navigate('/processing');
}, [config, questions, navigate, setCurrentSession]);
```

### Step 5: Update Dashboard.tsx (History)

```typescript
// Replace getSessions call with API call
import { getSessions } from '@/lib/api';
import { useEffect } from 'react';

export default function Dashboard() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSessions() {
      try {
        const data = await getSessions();
        setSessions(data.sessions);
      } catch (error) {
        console.error('Error loading sessions:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSessions();
  }, []);

  // Rest of component...
}
```

### Step 6: Update InterviewContext.tsx

Store the session ID in context:

```typescript
export interface InterviewContextType {
  config: InterviewConfig | null;
  setConfig: (config: InterviewConfig | null) => void;
  currentSession: { id: string; createdAt: string } | null;
  setCurrentSession: (session: { id: string; createdAt: string } | null) => void;
  questions: string[];
  setQuestions: (q: string[]) => void;
}

export function InterviewProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<InterviewConfig | null>(null);
  const [currentSession, setCurrentSession] = useState<{ id: string; createdAt: string } | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);

  return (
    <InterviewContext.Provider
      value={{ config, setConfig, currentSession, setCurrentSession, questions, setQuestions }}
    >
      {children}
    </InterviewContext.Provider>
  );
}
```

## Data Flow Comparison

### Before (Mock Data)
```
User Input → InterviewSetup → getQuestionsForConfig() → Frontend State → MockInterview
```

### After (Backend API)
```
User Input → InterviewSetup → fetch(/api/questions/generate) → Backend → Frontend State → MockInterview → fetch(/api/sessions/{id}/feedback) → Backend
```

## Error Handling Example

```typescript
try {
  const result = await fetchQuestions(config);
  // Handle success
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('Invalid skills')) {
      showErrorMessage('Please select valid skills');
    } else if (error.message.includes('Required')) {
      showErrorMessage('Please fill all required fields');
    } else {
      showErrorMessage(error.message);
    }
  }
}
```

## Testing the Integration

1. **Start both servers:**
   ```bash
   # Terminal 1: Backend
   cd interview-coach-backend
   npm run dev

   # Terminal 2: Frontend
   cd interview-coach-ai
   npm run dev
   ```

2. **Test in browser:**
   - Visit `http://localhost:5173`
   - Open DevTools → Network tab
   - Start an interview
   - Look for POST to `http://localhost:5000/api/questions/generate`

3. **Verify flow:**
   - ✅ Can start interview (backend generates questions)
   - ✅ Interview completes properly
   - ✅ Feedback can be submitted
   - ✅ History shows completed interviews

## Fallback to Mock Data

To easily switch between API and mock data for testing:

```typescript
const USE_MOCK_API = false; // Toggle for testing

export async function fetchQuestions(config: InterviewConfig) {
  if (USE_MOCK_API) {
    // Use mock data
    const questions = getQuestionsForConfig(config);
    return {
      sessionId: `mock-session-${Date.now()}`,
      questions,
    };
  }

  // Use real API
  const response = await fetch(`${API_BASE_URL}/questions/generate`, {
    // ...
  });
}
```

## Performance Notes

- Backend responses are typically < 100ms
- Questions are cached in-memory for fast response
- No database queries needed (MVP stage)

## Deployment Considerations

### Frontend (.env.production)
```
VITE_API_URL=https://api.yourapp.com/api
```

### Backend (.env on server)
```
PORT=5000
NODE_ENV=production
CORS_ORIGIN=https://yourapp.com
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS error | Check CORS_ORIGIN in backend .env matches frontend URL |
| 404 on API calls | Ensure backend is running and VITE_API_URL is correct |
| Sessions not persisting | Sessions are in-memory; will reset on server restart |
| Questions not loading | Check question_bank.json file path in backend |

## Next Steps

1. Implement user authentication (optional)
2. Add database persistence for sessions
3. Deploy backend to cloud platform
4. Add real AI feedback generation
5. Implement interview recording/playback

See README.md in backend for full API documentation.
