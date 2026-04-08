import express from 'express';
import { createSession, getSession, getAllSessions, addFeedback, deleteSession, upsertResponse } from '../utils/sessionService.js';
import { validateRequiredFields, validateFeedback, validateResponses } from '../utils/validators.js';
import { analyzeInterviewResponses } from '../utils/responseAnalysis.js';
import { analyzeQuestionRecording } from '../utils/mediaAnalysis.js';
import { analyzeQuestionEmotion } from '../utils/emotionAnalysis.js';

const router = express.Router();

// Get all sessions
router.get('/', (req, res) => {
  try {
    const sessions = getAllSessions();
    res.json({
      count: sessions.length,
      sessions: sessions.map(s => ({
        id: s.id,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        status: s.status,
        config: s.config,
        completedAt: s.completedAt,
        feedback: s.feedback ? {
          overallScore: s.feedback.overallScore,
          readinessScore: s.feedback.readinessScore,
          summaryMessage: s.feedback.summaryMessage,
        } : null,
      })),
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Get a specific session
router.get('/:id', (req, res) => {
  try {
    const session = getSession(req.params.id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// Add feedback to a session
router.post('/:id/feedback', (req, res) => {
  try {
    const { responses, feedback: manualFeedback } = req.body;

    // Validate session exists
    const session = getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Support legacy/manual feedback payloads, but prefer scored responses.
    const sessionResponses = Array.isArray(responses) && responses.length > 0 ? responses : (session.responses || []);

    if (sessionResponses.length > 0) {
      const responseErrors = validateResponses(sessionResponses);
      if (responseErrors.length > 0) {
        return res.status(400).json({ errors: responseErrors });
      }

      const analyzedFeedback = analyzeInterviewResponses(session, sessionResponses);
      const updatedSession = addFeedback(req.params.id, analyzedFeedback);
      updatedSession.responses = sessionResponses;

      return res.json({
        id: updatedSession.id,
        createdAt: updatedSession.createdAt,
        config: updatedSession.config,
        status: updatedSession.status,
        completedAt: updatedSession.completedAt,
        feedback: updatedSession.feedback,
        responses: updatedSession.responses,
      });
    }

    // Validate feedback structure
    const requiredFields = ['overallScore', 'readinessScore', 'summaryMessage', 'strengths', 'improvements'];
    const errors = validateRequiredFields(manualFeedback || {}, requiredFields);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    // Validate feedback values
    const validationErrors = validateFeedback(manualFeedback || {});
    if (validationErrors.length > 0) {
      return res.status(400).json({ errors: validationErrors });
    }

    // Add feedback
    const feedbackPayload = {
      overallScore: manualFeedback.overallScore,
      readinessScore: manualFeedback.readinessScore,
      summaryMessage: manualFeedback.summaryMessage,
      strengths: manualFeedback.strengths,
      improvements: manualFeedback.improvements,
      verbal: manualFeedback.verbal || {},
      nonVerbal: manualFeedback.nonVerbal || {},
      questions: manualFeedback.questions || [],
    };

    const updatedSession = addFeedback(req.params.id, feedbackPayload);

    res.json({
      id: updatedSession.id,
      createdAt: updatedSession.createdAt,
      config: updatedSession.config,
      status: updatedSession.status,
      completedAt: updatedSession.completedAt,
      feedback: updatedSession.feedback,
    });
  } catch (error) {
    console.error('Error adding feedback:', error);
    res.status(500).json({ error: 'Failed to add feedback' });
  }
});

// Save a recording for a specific question, transcribe it, and store transcript as response
router.post('/:id/questions/:questionId/recording', async (req, res) => {
  try {
    const toneSummary = (() => {
      if (!req.body?.toneSummary) {
        return null;
      }

      try {
        return typeof req.body.toneSummary === 'string'
          ? JSON.parse(req.body.toneSummary)
          : req.body.toneSummary;
      } catch {
        return null;
      }
    })();

    const videoSummary = (() => {
      if (!req.body?.videoSummary) {
        return null;
      }

      try {
        return typeof req.body.videoSummary === 'string'
          ? JSON.parse(req.body.videoSummary)
          : req.body.videoSummary;
      } catch {
        return null;
      }
    })();

    let session = getSession(req.params.id);
    if (!session && req.body?.sessionSnapshot) {
      try {
        const snapshot = typeof req.body.sessionSnapshot === 'string'
          ? JSON.parse(req.body.sessionSnapshot)
          : req.body.sessionSnapshot;

        if (snapshot?.config && Array.isArray(snapshot?.questions)) {
          session = createSession(
            snapshot.config,
            snapshot.questions,
            req.params.id,
            Array.isArray(snapshot.responses) ? snapshot.responses : [],
          );
        }
      } catch (error) {
        console.error('Failed to restore missing session from snapshot:', error);
      }
    }

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const question = (session.questions || []).find(item => item.id === req.params.questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found in session' });
    }

    if (!req.files || !req.files.recording) {
      return res.status(400).json({ error: 'No question recording file provided' });
    }

    const recordingFile = req.files.recording;
    const recordingMimeType = typeof recordingFile.mimetype === 'string' ? recordingFile.mimetype : 'video/webm';
    const recordingExt = recordingMimeType.split('/')[1] || 'webm';
    const filename = `${req.params.id}-${req.params.questionId}.${recordingExt}`;

    const mediaResult = await analyzeQuestionRecording({
      filePath: recordingFile.tempFilePath,
      mimeType: recordingMimeType,
      questionId: req.params.questionId,
    });

    const emotionResult = await analyzeQuestionEmotion({
      filePath: recordingFile.tempFilePath,
      questionId: req.params.questionId,
    });

    const savedResponse = upsertResponse(req.params.id, {
      questionId: req.params.questionId,
      response: mediaResult.transcript || '',
      toneSummary,
      videoSummary,
      emotionSummary: emotionResult.summary || null,
      emotionStatus: emotionResult.status,
      emotionProvider: emotionResult.provider,
      emotionError: emotionResult.error || null,
      source: mediaResult.source,
      transcriptionStatus: mediaResult.transcriptionStatus,
      transcriptionProvider: mediaResult.transcriptionProvider,
      transcriptionModel: mediaResult.transcriptionModel || null,
      transcriptionError: mediaResult.transcriptionError || null,
      answeredAt: new Date().toISOString(),
      media: {
        filename,
        mimetype: recordingMimeType,
        size: recordingFile.size,
      },
    });

    session.questionRecordings = session.questionRecordings || [];
    session.questionRecordings.push({
      questionId: req.params.questionId,
      filename,
      uploadedAt: new Date().toISOString(),
      size: recordingFile.size,
      mimetype: recordingMimeType,
    });

    const analyzedFeedback = analyzeInterviewResponses(session, session.responses);
    const questionFeedback = analyzedFeedback.questions.find(item => item.questionId === req.params.questionId) || null;

    res.json({
      success: true,
      questionId: req.params.questionId,
      response: savedResponse,
      questionFeedback,
      transcription: {
        status: mediaResult.transcriptionStatus,
        provider: mediaResult.transcriptionProvider,
        model: mediaResult.transcriptionModel || null,
        transcript: mediaResult.transcript,
        error: mediaResult.transcriptionError || null,
      },
      emotion: {
        status: emotionResult.status,
        provider: emotionResult.provider,
        summary: emotionResult.summary || null,
        error: emotionResult.error || null,
      },
      media: {
        filename,
        mimetype: recordingMimeType,
        size: recordingFile.size,
      },
      progress: {
        answered: session.responses.length,
        total: session.questions?.length || 0,
      },
    });
  } catch (error) {
    console.error('Error uploading question recording:', error);
    res.status(500).json({ error: 'Failed to upload question recording' });
  }
});

// Save a response for a specific question in the session
router.post('/:id/responses', (req, res) => {
  try {
    const session = getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { questionId, response } = req.body;
    const errors = validateResponses([{ questionId, response }]);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const question = (session.questions || []).find(item => item.id === questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found in session' });
    }

    const savedResponse = upsertResponse(req.params.id, { questionId, response, answeredAt: new Date().toISOString() });
    const analyzedFeedback = analyzeInterviewResponses(session, session.responses);
    const questionFeedback = analyzedFeedback.questions.find(item => item.questionId === questionId) || null;

    res.json({
      success: true,
      response: savedResponse,
      questionFeedback,
      progress: {
        answered: session.responses.length,
        total: session.questions?.length || 0,
      },
    });
  } catch (error) {
    console.error('Error saving response:', error);
    res.status(500).json({ error: 'Failed to save response' });
  }
});

// Upload recording for a session
router.post('/:id/recording', (req, res) => {
  try {
    const session = getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if file was uploaded
    if (!req.files || !req.files.recording) {
      return res.status(400).json({ error: 'No recording file provided' });
    }

    const recordingFile = req.files.recording;
    const filename = `${req.params.id}-recording.${recordingFile.mimetype.split('/')[1] || 'webm'}`;

    console.log(`Recording uploaded for session ${req.params.id}: ${filename}`);

    // In a real application, you would save the file or upload to cloud storage
    // For now, we just log it and update the session metadata
    session.recordings = session.recordings || [];
    session.recordings.push({
      filename,
      uploadedAt: new Date().toISOString(),
      size: recordingFile.size,
      mimetype: recordingFile.mimetype,
    });

    res.json({
      success: true,
      message: 'Recording uploaded successfully',
      filename,
      size: recordingFile.size,
    });
  } catch (error) {
    console.error('Error uploading recording:', error);
    res.status(500).json({ error: 'Failed to upload recording' });
  }
});

// Delete a session
router.delete('/:id', (req, res) => {
  try {
    const deleted = deleteSession(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ success: true, message: 'Session deleted' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

export default router;
