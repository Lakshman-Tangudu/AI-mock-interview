# Interview Coach Backend API

A lightweight, fast RESTful API backend for the AI-Powered Interview Coach application. Built with Node.js and Express for rapid deployment.

## Project Structure

```
interview-coach-backend/
├── src/
│   ├── server.js              # Express server entry point
│   ├── routes/
│   │   ├── questions.js       # Questions API endpoints
│   │   └── sessions.js        # Sessions/feedback API endpoints
│   └── utils/
│       ├── questionService.js # Question loading and processing logic
│       ├── sessionService.js  # Session management (in-memory)
│       └── validators.js      # Input validation utilities
├── data/
│   └── question_bank.json     # Interview questions database
├── package.json               # Dependencies and scripts
├── .env                       # Environment configuration
└── README.md                  # This file
```

## Features

✅ **RESTful API Design** - Standard HTTP methods for resource operations  
✅ **Question Bank** - 50+ pre-configured interview questions across multiple skills  
✅ **Interview Sessions** - Create and manage interview sessions  
✅ **Feedback Scoring** - Store and retrieve interview feedback and scoring  
✅ **CORS Support** - Configured for development and production environments  
✅ **Input Validation** - Comprehensive validation for all endpoints  
✅ **Error Handling** - Consistent error messages and HTTP status codes  
✅ **Fast Development** - Minimal dependencies, easy to extend  

## Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn (or bun)

### Installation

1. **Navigate to backend directory:**
   ```bash
   cd interview-coach-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   The `.env` file is already configured with defaults:
   ```
   PORT=5000
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:5173
   ```

### Running the Server

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Health Check
```
GET /api/health
```
Response: `{ "status": "ok", "timestamp": "2026-04-02T10:30:00Z" }`

### Questions Endpoints

#### Get All Questions
```
GET /api/questions?type=HR|Technical&difficulty=easy|medium|hard&skill=React
```
**Query Parameters:**
- `type` (required): `HR` or `Technical`
- `difficulty` (optional): `easy`, `medium`, or `hard`
- `skill` (optional, for Technical only): Specific skill like `React`, `Python`, etc.

**Response:**
```json
{
  "type": "HR",
  "difficulty": "all",
  "count": 10,
  "questions": [
    {
      "id": "hr-001",
      "question": "Tell me about yourself.",
      "category": "general",
      "difficulty": "easy",
      "expectedKeywords": ["background", "experience", "skills"],
      "tips": ["Keep it concise", "Focus on relevant experience"]
    }
  ]
}
```

#### Get Single Question
```
GET /api/questions/:id
```
Returns a single question object by ID.

#### Get Available Skills
```
GET /api/questions/meta/skills
```
Response:
```json
{
  "skills": ["React", "Python", "JavaScript", "TypeScript", ...]
}
```

#### Generate Interview Questions
```
POST /api/questions/generate
Content-Type: application/json

{
  "type": "Technical",
  "difficulty": "Medium",
  "skills": ["React", "JavaScript"],
  "timeframe": 15
}
```

**Request Body:**
- `type` (required): `HR` or `Technical`
- `difficulty` (required): `Easy`, `Medium`, or `Hard`
- `skills` (required for Technical): Array of skill names
- `timeframe` (optional): Interview duration in minutes (default: 15)

**Response:**
```json
{
  "sessionId": "session-1234567890",
  "config": {
    "type": "Technical",
    "difficulty": "Medium",
    "skills": ["React", "JavaScript"],
    "timeframe": 15
  },
  "questions": [
    {
      "id": "tech-react-001",
      "question": "Explain the virtual DOM in React.",
      "difficulty": "medium",
      "expectedKeywords": ["virtual", "reconciliation"],
      "tips": ["Explain why virtual DOM is useful", ...]
    }
  ],
  "createdAt": "2026-04-02T10:30:00Z"
}
```

### Sessions Endpoints

#### Get All Sessions
```
GET /api/sessions
```
Returns list of all interview sessions with summary information.

**Response:**
```json
{
  "count": 5,
  "sessions": [
    {
      "id": "session-1234567890",
      "createdAt": "2026-04-02T10:30:00Z",
      "status": "completed",
      "config": { "type": "HR", "difficulty": "Easy" },
      "completedAt": "2026-04-02T10:45:00Z",
      "feedback": {
        "overallScore": 82,
        "readinessScore": 78,
        "summaryMessage": "Great performance!"
      }
    }
  ]
}
```

#### Get Specific Session
```
GET /api/sessions/:sessionId
```
Returns full session details including questions and feedback.

#### Add Feedback to Session
```
POST /api/sessions/:sessionId/feedback
Content-Type: application/json

{
  "overallScore": 85,
  "readinessScore": 82,
  "summaryMessage": "Strong technical understanding demonstrated.",
  "strengths": ["Clear explanations", "Good examples"],
  "improvements": ["Add more depth to answers", "Maintain confidence"],
  "verbal": {
    "clarity": { "score": 9, "feedback": "Very clear" },
    "confidence": { "score": 8, "feedback": "Mostly confident" },
    "fluency": { "score": 8, "feedback": "Good flow" },
    "fillerWords": { "score": 7, "feedback": "Some filler words" }
  },
  "nonVerbal": {
    "eyeContact": { "score": 8, "feedback": "Good eye contact" },
    "facialExpressions": { "score": 8, "feedback": "Expressive" },
    "posture": { "score": 9, "feedback": "Professional posture" }
  },
  "questions": [
    {
      "question": "Explain the virtual DOM",
      "score": 9,
      "feedback": "Excellent explanation",
      "expectedKeywords": ["virtual", "DOM"],
      "answered": true
    }
  ]
}
```

**Request Body (required fields):**
- `overallScore` (number 0-100): Overall interview score
- `readinessScore` (number 0-100): Readiness/preparation score
- `summaryMessage` (string): Summary of performance
- `strengths` (array): List of strengths demonstrated
- `improvements` (array): List of areas to improve

**Response:**
```json
{
  "id": "session-1234567890",
  "status": "completed",
  "completedAt": "2026-04-02T10:45:00Z",
  "feedback": { ... }
}
```

#### Delete Session
```
DELETE /api/sessions/:sessionId
```
Response: `{ "success": true, "message": "Session deleted" }`

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "Error message",
  "errors": ["Error 1", "Error 2"]  // For validation errors
}
```

**HTTP Status Codes:**
- `200 OK` - Successful request
- `400 Bad Request` - Invalid input or missing required fields
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## Question Bank Data Structure

The `question_bank.json` file contains:

- **HR Questions** (array): Behavioral and general HR interview questions
- **Technical Questions** (object): Indexed by skill name (React, Python, JavaScript, etc.)
- **Skills** (array): List of available programming skills and technologies
- **Tips** (array): General interview preparation tips

Each question includes:
- `id`: Unique identifier
- `question`: The question text
- `category`: Question category
- `difficulty`: `easy`, `medium`, or `hard`
- `expectedKeywords`: Keywords to look for in answers
- `tips`: Tips for answering this question

## Development Tips

### Adding New Questions

Edit `data/question_bank.json` and add a new question to the appropriate array:

```json
{
  "id": "hr-011",
  "question": "Your question here?",
  "category": "category-name",
  "difficulty": "medium",
  "expectedKeywords": ["keyword1", "keyword2"],
  "tips": ["tip1", "tip2"]
}
```

### Adding New Skills

1. Add skill to `skills` array in `question_bank.json`
2. Add new skill category in `technicalQuestions` object
3. Add questions for that skill

### Extending the Backend

**To add persistent storage (database):**
1. Install a database driver (MongoDB, PostgreSQL, etc.)
2. Update `sessionService.js` to use database instead of in-memory array
3. No API changes needed - service layer abstraction handles it

**To add authentication:**
1. Install `jsonwebtoken` and `bcryptjs`
2. Create auth middleware
3. Add authentication check to protected routes

## Testing the API

### Using curl

```bash
# Health check
curl http://localhost:5000/api/health

# Get available skills
curl http://localhost:5000/api/questions/meta/skills

# Get HR questions
curl "http://localhost:5000/api/questions?type=HR&difficulty=easy"

# Generate interview
curl -X POST http://localhost:5000/api/questions/generate \
  -H "Content-Type: application/json" \
  -d '{"type":"Technical","difficulty":"Medium","skills":["React"]}'

# Get all sessions
curl http://localhost:5000/api/sessions
```

### Using VS Code REST Client

Create a `test.http` file in your project:

```http
### Health check
GET http://localhost:5000/api/health

### Get HR questions
GET http://localhost:5000/api/questions?type=HR

### Generate technical interview
POST http://localhost:5000/api/questions/generate
Content-Type: application/json

{
  "type": "Technical",
  "difficulty": "Medium",
  "skills": ["React", "JavaScript"]
}
```

## Performance Considerations

Current implementation uses **in-memory storage** for sessions. This means:

✅ **Pros:**
- Extremely fast (no I/O)
- Perfect for MVP and testing
- Zero database setup required

❌ **Cons:**
- Sessions lost on server restart
- Not suitable for production multi-instance deployments

**For production:** Replace in-memory storage with database (MongoDB, PostgreSQL, etc.)

## CORS Configuration

The backend is configured for development with:
- Origin: `http://localhost:5173` (Vite frontend default)
- Methods: `GET, POST, PUT, DELETE, OPTIONS`
- Credentials: `true`

To change for production, update `.env`:
```
CORS_ORIGIN=https://yourdomain.com
```

## Troubleshooting

**Issue: CORS errors when calling from frontend**
- Ensure frontend is running on `http://localhost:5173`
- Check `CORS_ORIGIN` in `.env` matches frontend URL
- Restart backend after changing `.env`

**Issue: "Question bank not found"**
- Verify `data/question_bank.json` exists
- Check file path and JSON syntax

**Issue: Port 5000 already in use**
- Change in `.env`: `PORT=5001`
- Or kill process: `lsof -i :5000` (macOS/Linux)

## Next Steps

1. **Frontend Integration:**
   - Update API baseURL in frontend to `http://localhost:5000`
   - Replace mock data calls with API requests

2. **Database Setup:**
   - Add MongoDB or PostgreSQL for persistent storage
   - Migrate session storage to database

3. **Authentication:**
   - Add user login/signup endpoints
   - Implement JWT token validation

4. **Deployment:**
   - Deploy to Heroku, Railway, or Vercel
   - Set appropriate environment variables

## License

MIT
