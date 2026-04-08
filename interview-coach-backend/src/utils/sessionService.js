import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Persist active interview sessions so a backend restart does not break an in-progress interview.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sessionStorePath = path.join(__dirname, '../../data/active_sessions.json');

function loadSessionsFromDisk() {
  try {
    if (!fs.existsSync(sessionStorePath)) {
      return [];
    }

    const raw = fs.readFileSync(sessionStorePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to load session store:', error);
    return [];
  }
}

function persistSessionsToDisk(sessions) {
  try {
    fs.mkdirSync(path.dirname(sessionStorePath), { recursive: true });
    fs.writeFileSync(sessionStorePath, JSON.stringify(sessions, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to persist session store:', error);
  }
}

// In-memory cache backed by a JSON file.
let sessions = loadSessionsFromDisk();

export function createSession(config, questions, sessionId = null, initialResponses = []) {
  const session = {
    id: sessionId || `session-${Date.now()}`,
    createdAt: new Date().toISOString(),
    config,
    questions,
    responses: Array.isArray(initialResponses) ? initialResponses : [],
    questionRecordings: [],
    status: 'in-progress',
  };

  sessions.push(session);
  persistSessionsToDisk(sessions);
  return session;
}

export function getSession(id) {
  return sessions.find(s => s.id === id);
}

export function getAllSessions() {
  return sessions;
}

export function updateSession(id, updates) {
  const session = getSession(id);
  if (!session) {
    return null;
  }

  Object.assign(session, updates, { updatedAt: new Date().toISOString() });
  persistSessionsToDisk(sessions);
  return session;
}

export function addFeedback(id, feedback) {
  const session = getSession(id);
  if (!session) {
    return null;
  }

  session.feedback = feedback;
  session.status = 'completed';
  session.completedAt = new Date().toISOString();
  persistSessionsToDisk(sessions);
  return session;
}

export function upsertResponse(id, response) {
  const session = getSession(id);
  if (!session) {
    return null;
  }

  if (!Array.isArray(session.responses)) {
    session.responses = [];
  }

  const index = session.responses.findIndex(item => item.questionId === response.questionId);
  if (index === -1) {
    session.responses.push(response);
  } else {
    session.responses[index] = { ...session.responses[index], ...response };
  }

  session.updatedAt = new Date().toISOString();
  persistSessionsToDisk(sessions);
  return session.responses.find(item => item.questionId === response.questionId);
}

export function deleteSession(id) {
  const index = sessions.findIndex(s => s.id === id);
  if (index === -1) {
    return false;
  }

  sessions.splice(index, 1);
  persistSessionsToDisk(sessions);
  return true;
}

// Supabase functions for persistent storage
import { supabase } from './supabase.js';

function isUuid(value) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function createSupabaseSession(userId, sessionData) {
  const { data, error } = await supabase
    .from('interview_sessions')
    .insert({
      user_id: userId,
      config: sessionData.config || null,
      overall_score: sessionData.overallScore || 0,
      feedback: sessionData.feedback || {},
      responses: sessionData.responses || [],
      status: 'completed',
    })
    .select();

  if (error) throw new Error(`Failed to create session: ${error.message}`);
  return data?.[0];
}

export async function saveInterviewQuestion(sessionId, questionData) {
  const { data, error } = await supabase
    .from('interview_questions')
    .insert({
      session_id: sessionId,
      question_text: questionData.questionText,
      question_id: questionData.questionId,
      user_response: questionData.userResponse,
      score: questionData.score,
      feedback: questionData.feedback,
    })
    .select();

  if (error) throw new Error(`Failed to save question: ${error.message}`);
  return data?.[0];
}

export async function getSupabaseSessions(userId, limit = 50) {
  const { data, error } = await supabase
    .from('interview_sessions')
    .select(`
      id,
      created_at,
      interview_date,
      config,
      overall_score,
      status,
      feedback,
      interview_questions (
        count
      )
    `)
    .eq('user_id', userId)
    .order('interview_date', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch sessions: ${error.message}`);
  return data || [];
}

export async function getSupabaseSession(sessionId, userId) {
  if (!isUuid(sessionId)) {
    return null;
  }

  const { data, error } = await supabase
    .from('interview_sessions')
    .select(`
      *,
      interview_questions (*)
    `)
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single();

  if (error) throw new Error(`Failed to fetch session: ${error.message}`);
  return data;
}

export async function deleteSupabaseSession(sessionId, userId) {
  if (!isUuid(sessionId)) {
    return;
  }

  const { error } = await supabase
    .from('interview_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to delete session: ${error.message}`);
}
