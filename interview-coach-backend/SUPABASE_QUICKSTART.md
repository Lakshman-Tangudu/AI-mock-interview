# Supabase Integration - Quick Start

Your interview coach is now integrated with Supabase for user authentication and interview history storage!

## What's Been Done

✅ **Installed** Supabase packages (frontend & backend)
✅ **Created** database schema with `interview_sessions` and `interview_questions` tables
✅ **Built** Supabase client connections (frontend & backend)
✅ **Rebuilt** AuthContext with Supabase Auth (signup/login/logout)
✅ **Added** JWT verification middleware for backend
✅ **Created** protected API routes for interview history
✅ **Updated** frontend pages (Login, History) to use Supabase
✅ **Verified** frontend builds with no errors

## Remaining Setup (2 Steps)

### Step 1: Execute Database Schema
1. Open your Supabase project dashboard
2. Go to **SQL Editor** → **New Query**
3. Copy & paste the contents of: `interview-coach-backend/data/schema.sql`
4. Click **Run** to execute

### Step 2: Start Your App

**Terminal 1 - Backend:**
```bash
cd interview-coach-backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd interview-coach-ai
npm run dev
```

## Testing the Integration

### Test 1: Signup
1. Go to http://localhost:8080
2. Click "Don't have an account? Sign Up"
3. Fill in: Name, Email, Password
4. Click "Sign Up"
5. Verify account was created in Supabase **Authentication** tab

### Test 2: Interview & History
1. After login, complete an interview
2. On Feedback page, interview should auto-save
3. Go to **History** page
4. Verify your completed interview appears in the list
5. Check Supabase **interview_sessions** table to confirm data is stored

### Test 3: Login/Logout
1. Click profile → Logout
2. Try logging in with same credentials
3. Verify it works and history persists

## API Endpoints (Protected)

All endpoints require `Authorization: Bearer <token>` header:

- `GET /api/user/sessions` - Fetch interview history
- `GET /api/user/sessions/:sessionId` - Get session details
- `POST /api/user/sessions` - Save interview session
- `DELETE /api/user/sessions/:sessionId` - Delete session

## Troubleshooting

**"Missing Supabase environment variables"**
- Make sure `.env.local` (frontend) and `.env` (backend) have values
- Restart dev servers after updating env files

**"Invalid token" on API calls**
- Check that Authorization header includes "Bearer " prefix
- Verify user is authenticated before making API calls

**"Session not found" errors**
- Ensure you're logged in
- Check RLS policies in Supabase (should already be set)

**Signup emails not working**
- Go to Supabase **Authentication** → **Settings**
- Under "Email confirmations", you can disable for development

## Files Reference

**Configuration:**
- Frontend: `interview-coach-ai/.env.local`
- Backend: `interview-coach-backend/.env`

**Authentication:**
- Context: `interview-coach-ai/src/contexts/AuthContext.tsx`
- Middleware: `interview-coach-backend/src/utils/authMiddleware.js`

**Database:**
- Schema: `interview-coach-backend/data/schema.sql`
- Service: `interview-coach-backend/src/utils/sessionService.js`

**API:**
- Frontend client: `interview-coach-ai/src/lib/api.ts`
- Backend routes: `interview-coach-backend/src/routes/userSessions.js`

**Documentation:**
- Full setup guide: `interview-coach-backend/SUPABASE_SETUP.md`

## What's Changed

### For Users
- Accounts now persist across browser sessions
- Interview history is saved to cloud database
- Can view past interviews anytime
- Multiple device support (same account)

### For Backend
- Protected routes require JWT authentication
- Interview data stored in PostgreSQL (Supabase)
- Row Level Security ensures data privacy

### For Frontend
- Login/signup uses real auth (not mock)
- Requires token for protected API calls
- Auth state is persistent

## Next: Advanced Features

After confirming everything works, consider:
1. **Email notifications** - Send session summaries via email
2. **Analytics** - Track performance over time
3. **Social sharing** - Share interview results
4. **Custom questions** - Let users add their own questions
5. **Video playback** - Store and replay interviews

Questions? Check `SUPABASE_SETUP.md` for detailed documentation!
