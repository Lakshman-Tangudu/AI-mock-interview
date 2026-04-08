import { InterviewConfig, InterviewQuestion, InterviewResponse, SessionFeedback } from '@/lib/mock-data';
import type { ToneSummary } from '@/lib/toneAnalysis';
import type { VideoSummary } from '@/lib/videoAnalysis';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function parseError(response: Response): Promise<never> {
  let message = 'Request failed';
  try {
    const payload = await response.json();
    if (payload?.error) {
      message = payload.error;
    } else if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      message = payload.errors.join(', ');
    }
  } catch {
    message = response.statusText || message;
  }

  throw new Error(message);
}

export async function fetchQuestions(config: InterviewConfig): Promise<{ sessionId: string; questions: InterviewQuestion[] }> {
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
    await parseError(response);
  }

  const data = await response.json();
  return {
    sessionId: data.sessionId,
    questions: data.questions,
  };
}

export async function submitResponses(sessionId: string, responses: InterviewResponse[]) {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ responses }),
  });

  if (!response.ok) {
    await parseError(response);
  }

  return response.json();
}

export async function saveQuestionResponse(sessionId: string, questionId: string, responseText: string) {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId, response: responseText }),
  });

  if (!response.ok) {
    await parseError(response);
  }

  return response.json();
}

export async function uploadQuestionRecording(
  sessionId: string,
  questionId: string,
  recordingBlob: Blob,
  sessionSnapshot?: {
    config?: InterviewConfig;
    questions?: InterviewQuestion[];
    responses?: InterviewResponse[];
  },
  toneSummary?: ToneSummary | null,
  videoSummary?: VideoSummary | null,
) {
  const formData = new FormData();
  formData.append('recording', recordingBlob, `question-${questionId}.webm`);
  if (sessionSnapshot) {
    formData.append('sessionSnapshot', JSON.stringify(sessionSnapshot));
  }
  if (toneSummary) {
    formData.append('toneSummary', JSON.stringify(toneSummary));
  }
  if (videoSummary) {
    formData.append('videoSummary', JSON.stringify(videoSummary));
  }

  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/questions/${questionId}/recording`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    await parseError(response);
  }

  return response.json();
}

export async function finalizeSessionFeedback(sessionId: string) {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    await parseError(response);
  }

  return response.json();
}

export interface SessionSummary {
  id: string;
  createdAt: string;
  type: 'HR' | 'Technical';
  skills: string[];
  duration: number;
  score: number;
  readinessScore: number;
}

export async function getSessions(): Promise<SessionSummary[]> {
  const response = await fetch(`${API_BASE_URL}/sessions`);

  if (!response.ok) {
    await parseError(response);
  }

  const data = await response.json();
  return (data.sessions || []).map((session: any) => ({
    id: session.id,
    createdAt: session.createdAt,
    type: session.config?.type || 'HR',
    skills: session.config?.skills || [],
    duration: session.config?.timeframe || 15,
    score: session.feedback?.overallScore ?? 0,
    readinessScore: session.feedback?.readinessScore ?? 0,
  }));
}

export interface SessionDetail {
  id: string;
  createdAt: string;
  status?: 'in-progress' | 'completed';
  config: InterviewConfig;
  questions?: InterviewQuestion[];
  responses?: InterviewResponse[];
  feedback?: SessionFeedback;
}

export async function getSession(sessionId: string): Promise<SessionDetail> {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`);

  if (!response.ok) {
    await parseError(response);
  }

  return response.json();
}

// Supabase-backed interview history functions
import { supabase } from './supabase';

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

export interface InterviewSessionHistory {
  id: string;
  createdAt: string;
  interviewDate: string;
  overallScore: number;
  status: string;
  questionsCount: number;
  config?: InterviewConfig;
}

export async function getUserInterviewHistory(): Promise<InterviewSessionHistory[]> {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/user/sessions`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      await parseError(response);
    }

    const data = await response.json();
    return data.sessions || [];
  } catch (error) {
    console.error('Failed to fetch interview history:', error);
    return [];
  }
}

export interface InterviewSessionDetail {
  id: string;
  createdAt: string;
  interviewDate: string;
  overallScore: number;
  status: string;
  feedback: any;
  config?: InterviewConfig;
  questions: Array<{
    id: string;
    questionText: string;
    questionId: string;
    userResponse: string;
    score: number;
    feedback: any;
    createdAt: string;
  }>;
}

export async function getUserInterviewSession(sessionId: string): Promise<InterviewSessionDetail> {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/user/sessions/${sessionId}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      await parseError(response);
    }

    return response.json();
  } catch (error) {
    console.error('Failed to fetch session:', error);
    throw error;
  }
}

export async function saveInterviewSessionToHistory(sessionData: {
  config?: InterviewConfig;
  overallScore: number;
  feedback: any;
  responses: Array<{
    questionId: string;
    response: string;
    score: number;
    feedback: any;
    questionText: string;
  }>;
}) {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/user/sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(sessionData),
    });

    if (!response.ok) {
      await parseError(response);
    }

    return response.json();
  } catch (error) {
    console.error('Failed to save session:', error);
    throw error;
  }
}

export async function deleteUserInterviewSession(sessionId: string): Promise<void> {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/user/sessions/${sessionId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      await parseError(response);
    }
  } catch (error) {
    console.error('Failed to delete session:', error);
    throw error;
  }
}

export async function getAvailableSkills(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/questions/meta/skills`);

  if (!response.ok) {
    await parseError(response);
  }

  const data = await response.json();
  return data.skills || [];
}

export async function uploadRecording(sessionId: string, recordingBlob: Blob): Promise<{ success: boolean; message: string }> {
  const formData = new FormData();
  formData.append('recording', recordingBlob, `interview-${sessionId}.webm`);

  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/recording`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    await parseError(response);
  }

  return response.json();
}
