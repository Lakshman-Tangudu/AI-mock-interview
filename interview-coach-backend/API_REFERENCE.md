# API Reference

Complete technical reference for all backend API endpoints.

## Base URL

```
Local: http://localhost:5000/api
Production: https://your-api-domain.com/api
```

## Authentication

No authentication required (MVP version).

Future: Add JWT tokens to headers:
```
Authorization: Bearer <token>
```

---

## Questions API

### GET /questions

Get questions by type and optional filters.

**Query Parameters:**
| Parameter | Type | Required | Options |
|-----------|------|----------|---------|
| type | string | Yes | `HR`, `Technical` |
| difficulty | string | No | `easy`, `medium`, `hard` |
| skill | string | No | See `/questions/meta/skills` |

**Examples:**

```bash
# All HR questions
GET /questions?type=HR

# Easy HR questions
GET /questions?type=HR&difficulty=easy

# React technical questions
GET /questions?type=Technical&skill=React

# Hard Python questions
GET /questions?type=Technical&skill=Python&difficulty=hard
```

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
      "expectedKeywords": ["background", "experience"],
      "tips": ["Keep it concise", "Focus on relevant experience"]
    }
  ]
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid type or skill

---

### GET /questions/:id

Get a single question by ID.

**Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| id | string | Yes |

**Example:**
```bash
GET /questions/hr-001
```

**Response:**
```json
{
  "id": "hr-001",
  "question": "Tell me about yourself.",
  "category": "general",
  "difficulty": "easy",
  "expectedKeywords": ["background", "experience", "skills"],
  "tips": ["Keep it concise (60-90 seconds)", "Focus on relevant experience"]
}
```

**Status Codes:**
- `200` - Success
- `404` - Question not found

---

### GET /questions/meta/skills

Get list of all available skills for technical interviews.

**Example:**
```bash
GET /questions/meta/skills
```

**Response:**
```json
{
  "skills": [
    "Python", "Java", "JavaScript", "TypeScript", "React", "Angular",
    "Vue.js", "Node.js", "SQL", "MongoDB", "Docker", "Kubernetes",
    "AWS", "Azure", "System Design", "Machine Learning", ...
  ]
}
```

**Status Codes:**
- `200` - Success

---

### POST /questions/generate

Generate a complete interview with selected questions.

Creates a new interview session and returns questions matched to configuration.

**Request Body:**
```json
{
  "type": "Technical",
  "difficulty": "Medium",
  "skills": ["React", "JavaScript"],
  "timeframe": 15
}
```

**Parameters:**
| Parameter | Type | Required | Constraints |
|-----------|------|----------|-------------|
| type | string | Yes | `HR` or `Technical` |
| difficulty | string | Yes | `Easy`, `Medium`, or `Hard` |
| skills | array | Required for Technical | Array of valid skill names |
| timeframe | number | No | Minutes, default 15, min 5 |

**Request Examples:**

HR Interview:
```bash
curl -X POST http://localhost:5000/api/questions/generate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "HR",
    "difficulty": "Medium"
  }'
```

Technical Interview:
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

**Response:**
```json
{
  "sessionId": "session-1712137800000",
  "config": {
    "type": "Technical",
    "difficulty": "Medium",
    "skills": ["React", "JavaScript"],
    "timeframe": 15
  },
  "questions": [
    {
      "id": "tech-react-002",
      "question": "What are React hooks and why were they introduced?",
      "difficulty": "medium",
      "expectedKeywords": ["state", "functional components", "reusability"],
      "tips": ["Name common hooks", "Explain motivation for hooks"]
    },
    {
      "id": "tech-js-001",
      "question": "Explain closures in JavaScript.",
      "difficulty": "medium",
      "expectedKeywords": ["scope", "function", "data privacy"],
      "tips": ["Show practical examples", "Explain scope chain"]
    }
  ],
  "createdAt": "2026-04-02T10:30:00.000Z"
}
```

**Status Codes:**
- `200` - Success
- `400` - Validation error (see response for details)
- `500` - Server error

**Error Example:**
```json
{
  "errors": [
    "Invalid type: must be 'HR' or 'Technical'",
    "Invalid difficulty: must be 'Easy', 'Medium', or 'Hard'",
    "Technical interviews require at least one skill"
  ]
}
```

---

## Sessions API

### GET /sessions

List all interview sessions.

**Query Parameters:** None currently

**Example:**
```bash
GET /sessions
```

**Response:**
```json
{
  "count": 3,
  "sessions": [
    {
      "id": "session-1712137800000",
      "createdAt": "2026-04-02T10:30:00.000Z",
      "updatedAt": "2026-04-02T10:45:00.000Z",
      "status": "completed",
      "config": {
        "type": "Technical",
        "difficulty": "Medium",
        "skills": ["React"],
        "timeframe": 15
      },
      "completedAt": "2026-04-02T10:45:00.000Z",
      "feedback": {
        "overallScore": 82,
        "readinessScore": 78,
        "summaryMessage": "Strong technical understanding"
      }
    }
  ]
}
```

**Status Codes:**
- `200` - Success

---

### GET /sessions/:sessionId

Get detailed information about a specific session.

**Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| sessionId | string | Yes |

**Example:**
```bash
GET /sessions/session-1712137800000
```

**Response:**
```json
{
  "id": "session-1712137800000",
  "createdAt": "2026-04-02T10:30:00.000Z",
  "updatedAt": "2026-04-02T10:45:00.000Z",
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
      "difficulty": "medium"
    }
  ],
  "status": "completed",
  "completedAt": "2026-04-02T10:45:00.000Z",
  "feedback": {
    "overallScore": 82,
    "readinessScore": 78,
    "summaryMessage": "Great technical understanding demonstrated.",
    "strengths": ["Clear explanations", "Good examples"],
    "improvements": ["Add more depth", "Maintain confidence"],
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
        "answered": true
      }
    ]
  }
}
```

**Status Codes:**
- `200` - Success
- `404` - Session not found

---

### POST /sessions/:sessionId/feedback

Submit interview feedback and scoring.

Marks session as completed.

**Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| sessionId | string | Yes |

**Request Body:**
```json
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
      "expectedKeywords": ["virtual", "DOM", "reconciliation"],
      "answered": true
    }
  ]
}
```

**Required Fields:**
- `overallScore` (number 0-100)
- `readinessScore` (number 0-100)
- `summaryMessage` (string)
- `strengths` (array of strings)
- `improvements` (array of strings)

**Example:**
```bash
curl -X POST http://localhost:5000/api/sessions/session-1712137800000/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "overallScore": 85,
    "readinessScore": 82,
    "summaryMessage": "Great performance!",
    "strengths": ["Clear communication"],
    "improvements": ["More examples"]
  }'
```

**Response:**
```json
{
  "id": "session-1712137800000",
  "status": "completed",
  "completedAt": "2026-04-02T10:45:00.000Z",
  "feedback": {
    "overallScore": 85,
    "readinessScore": 82,
    "summaryMessage": "Great performance!"
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - Validation error
- `404` - Session not found
- `500` - Server error

---

### DELETE /sessions/:sessionId

Delete a session permanently.

**Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| sessionId | string | Yes |

**Example:**
```bash
DELETE /sessions/session-1712137800000
```

**Response:**
```json
{
  "success": true,
  "message": "Session deleted"
}
```

**Status Codes:**
- `200` - Success
- `404` - Session not found

---

## Health Check

### GET /health

Check if backend is running.

**Example:**
```bash
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-04-02T10:30:00.000Z"
}
```

**Status Codes:**
- `200` - Server is healthy

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "errors": ["Error 1", "Error 2"]  // For validation errors
}
```

**HTTP Status Codes:**

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid input data |
| 404 | Not Found | Session/question doesn't exist |
| 500 | Server Error | Unexpected server error |

---

## Rate Limiting

Not implemented in MVP (no rate limiting).

Future: Add rate limiting (20 requests/minute per IP).

---

## Pagination

Not implemented in MVP (all results returned).

Future: Add pagination for sessions list.

---

## CORS Headers

All endpoints include CORS headers:
```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

---

## Versioning

Current API version: **v1**

No version prefix in URL (implied v1).

Future: May add `/api/v2/` for breaking changes.

---

## Response Times

Typical response times under load:

| Endpoint | Time |
|----------|------|
| /health | < 1ms |
| GET /questions | < 10ms |
| POST /questions/generate | < 50ms |
| GET /sessions | < 20ms |

---

## Data Types

### Question Object
```typescript
{
  id: string;
  question: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  expectedKeywords: string[];
  tips: string[];
}
```

### Session Object
```typescript
{
  id: string;
  createdAt: ISO8601 timestamp;
  updatedAt?: ISO8601 timestamp;
  config: InterviewConfig;
  questions: Question[];
  status: "in-progress" | "completed";
  completedAt?: ISO8601 timestamp;
  feedback?: SessionFeedback;
}
```

### InterviewConfig Object
```typescript
{
  type: "HR" | "Technical";
  difficulty: "Easy" | "Medium" | "Hard";
  skills: string[];  // For Technical only
  timeframe: number;  // Minutes
}
```

---

## Changelog

### v1.0.0 (Initial Release)
- ✅ Questions endpoints
- ✅ Sessions endpoints
- ✅ Feedback submission
- ✅ CORS support
- ✅ Input validation
