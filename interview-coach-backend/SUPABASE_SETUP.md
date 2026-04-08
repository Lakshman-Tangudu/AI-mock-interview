# Supabase Integration Guide

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - **Project Name**: interview-coach-ai
   - **Database Password**: (create a strong password)
   - **Region**: Choose closest to your location
4. Click "Create new project" and wait for it to provision

### 2. Configure Database Schema

1. In your Supabase project, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `interview-coach-backend/data/schema.sql`
4. Paste into the SQL editor
5. Click "Run" to execute the migration

### 3. Set Environment Variables

#### Frontend (.env.local)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### Backend (.env)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-service-role-key
```

### 4. Get Your Keys

1. In Supabase, go to **Settings > API**
2. Copy:
   - **Project URL** → `VITE_SUPABASE_URL` and `SUPABASE_URL`
   - **anon (public) key** → `VITE_SUPABASE_ANON_KEY` and `SUPABASE_ANON_KEY`
   - **service_role (secret) key** → `SUPABASE_SERVICE_ROLE_KEY` and `JWT_SECRET`

### 5. Enable Email Authentication

1. In Supabase, go to **Authentication > Providers**
2. Ensure "Email" is enabled
3. Go to **Authentication > Email Templates** and verify email confirmation is enabled

### 6. Configure CORS (if needed)

If your frontend and backend are on different domains:

1. In your backend server.js, check the CORS_ORIGIN setting
2. Make sure it matches your frontend URL:
   ```javascript
   origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
   ```

## Database Schema

### interview_sessions
Stores completed interview sessions for users.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key, auto-generated |
| user_id | UUID | Foreign key to auth.users |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |
| interview_date | timestamp | When the interview was conducted |
| overall_score | numeric | Score out of 10 |
| feedback | jsonb | Structured feedback data |
| responses | jsonb | User responses data |
| status | varchar | 'completed', 'in-progress', etc. |

### interview_questions
Stores individual questions and answers from interview sessions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key, auto-generated |
| session_id | UUID | Foreign key to interview_sessions |
| question_text | text | The full question text |
| question_id | varchar | Question identifier from question bank |
| user_response | text | User's spoken/typed response |
| score | numeric | Score for this question (0-10) |
| feedback | jsonb | Feedback specific to this question |
| created_at | timestamp | When the question was answered |

## API Endpoints

### Authentication Routes

All authenticated endpoints require an `Authorization: Bearer <token>` header with the JWT token from Supabase.

### User Interview History

#### GET /api/user/sessions
Fetch user's interview history.

**Response:**
```json
{
  "count": 5,
  "sessions": [
    {
      "id": "uuid",
      "createdAt": "2025-04-03T10:00:00Z",
      "interviewDate": "2025-04-03T10:00:00Z",
      "overallScore": 7.5,
      "status": "completed",
      "questionsCount": 8
    }
  ]
}
```

#### GET /api/user/sessions/:sessionId
Fetch a specific interview session with all details.

**Response:**
```json
{
  "id": "uuid",
  "createdAt": "2025-04-03T10:00:00Z",
  "interviewDate": "2025-04-03T10:00:00Z",
  "overallScore": 7.5,
  "status": "completed",
  "feedback": { /* full feedback object */ },
  "questions": [
    {
      "id": "uuid",
      "questionText": "Tell me about yourself",
      "questionId": "q1",
      "userResponse": "...transcribed response...",
      "score": 8,
      "feedback": { /* question-specific feedback */ },
      "createdAt": "2025-04-03T10:00:00Z"
    }
  ]
}
```

#### POST /api/user/sessions
Save a completed interview session.

**Request Body:**
```json
{
  "overallScore": 7.5,
  "feedback": { /* session feedback */ },
  "responses": [
    {
      "questionId": "q1",
      "response": "...transcribed text...",
      "score": 8,
      "feedback": { /* question feedback */ },
      "questionText": "Tell me about yourself"
    }
  ]
}
```

**Response:**
```json
{
  "id": "uuid",
  "createdAt": "2025-04-03T10:00:00Z",
  "interviewDate": "2025-04-03T10:00:00Z",
  "overallScore": 7.5,
  "status": "completed"
}
```

#### DELETE /api/user/sessions/:sessionId
Delete an interview session.

**Response:**
```json
{
  "success": true,
  "message": "Session deleted"
}
```

## Frontend Integration

### Using Supabase Auth

The `AuthContext` now provides:

```typescript
const { user, loading, login, signup, logout, updateName } = useAuth();

// Login
const result = await login('user@example.com', 'password');
if (result.success) {
  // Logged in!
}

// Signup
const result = await signup('John Doe', 'user@example.com', 'password');
if (result.success) {
  // Account created!
}

// Logout
await logout();

// Update name
const result = await updateName('Jane Doe');
if (result.success) {
  // Name updated!
}
```

### Accessing Interview History

```typescript
import { getUserInterviewHistory, getUserInterviewSession, saveInterviewSessionToHistory } from '@/lib/api';

// Get all sessions
const sessions = await getUserInterviewHistory();

// Get specific session details
const session = await getUserInterviewSession(sessionId);

// Save a new session after interview
await saveInterviewSessionToHistory({
  overallScore: 7.5,
  feedback: { /* feedback data */ },
  responses: [ /* question responses */ ]
});

// Delete a session
await deleteUserInterviewSession(sessionId);
```

## Row Level Security (RLS)

The database implements RLS to ensure users can only see their own data:

- Users can only SELECT their own sessions
- Users can only INSERT/UPDATE their own sessions
- Users cannot access other users' data

This is enforced at the database level, so even token compromise won't expose other users' data.

## Troubleshooting

### "Missing Supabase environment variables"
Make sure `.env.local` (frontend) and `.env` (backend) have the correct values.

### "Invalid token" errors
1. Check JWT token is valid and not expired
2. Verify service_role_key is in backend .env, not anon key
3. Ensure Authorization header format is `Bearer <token>`

### "Session not found" on API calls
1. Verify session belongs to authenticated user
2. Check RLS policies are applied correctly
3. Ensure user_id matches in database

### Email not being sent for signup confirmation
1. In Supabase, go to **Settings > Email Templates**
2. Verify "Confirm signup" template is enabled
3. Check your email spam folder
4. For development, disable "Confirm email" under Authentication > Settings

## Next Steps

1. Test authentication flow in your app
2. Verify interview sessions are saved to Supabase
3. Check that users can view their interview history
4. Monitor database usage in Supabase dashboard
5. Consider setting up automated backups
