import express from 'express';
import { verifySupabaseToken } from '../utils/authMiddleware.js';
import {
  createSupabaseSession,
  saveInterviewQuestion,
  getSupabaseSessions,
  getSupabaseSession,
  deleteSupabaseSession,
} from '../utils/sessionService.js';

const router = express.Router();

// Get user's interview history
router.get('/', verifySupabaseToken, async (req, res) => {
  try {
    const sessions = await getSupabaseSessions(req.user.id);
    
    res.json({
      count: sessions.length,
      sessions: sessions.map(s => ({
        id: s.id,
        createdAt: s.created_at,
        interviewDate: s.interview_date,
        config: s.config || null,
        overallScore: s.overall_score,
        status: s.status,
        questionsCount: s.interview_questions?.[0]?.count || 0,
      })),
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Get a specific interview session with all details
router.get('/:sessionId', verifySupabaseToken, async (req, res) => {
  try {
    const session = await getSupabaseSession(req.params.sessionId, req.user.id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      id: session.id,
      createdAt: session.created_at,
      interviewDate: session.interview_date,
      config: session.config || null,
      overallScore: session.overall_score,
      status: session.status,
      feedback: session.feedback,
      questions: (session.interview_questions || []).map(q => ({
        id: q.id,
        questionText: q.question_text,
        questionId: q.question_id,
        userResponse: q.user_response,
        score: q.score,
        feedback: q.feedback,
        createdAt: q.created_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// Save a completed interview session
router.post('/', verifySupabaseToken, async (req, res) => {
  try {
    const { config, overallScore, feedback, responses } = req.body;

    if (overallScore === undefined || !feedback) {
      return res.status(400).json({ error: 'Missing required fields: overallScore, feedback' });
    }

    const session = await createSupabaseSession(req.user.id, {
      config,
      overallScore,
      feedback,
      responses,
    });

    // Save individual questions if provided
    if (Array.isArray(responses)) {
      for (const response of responses) {
        await saveInterviewQuestion(session.id, {
          questionText: response.questionText || '',
          questionId: response.questionId,
          userResponse: response.response || response.userResponse || '',
          score: response.score || 0,
          feedback: response.feedback || {},
        });
      }
    }

    res.status(201).json({
      id: session.id,
      createdAt: session.created_at,
      interviewDate: session.interview_date,
      config: session.config || null,
      overallScore: session.overall_score,
      status: session.status,
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Delete an interview session
router.delete('/:sessionId', verifySupabaseToken, async (req, res) => {
  try {
    await deleteSupabaseSession(req.params.sessionId, req.user.id);
    res.json({ success: true, message: 'Session deleted' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

export default router;
