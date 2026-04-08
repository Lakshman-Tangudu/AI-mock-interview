import express from 'express';
import { loadQuestionBank, validateInterviewConfig, getQuestionsForConfig } from '../utils/questionService.js';
import { validateRequiredFields } from '../utils/validators.js';
import { createSession } from '../utils/sessionService.js';

const router = express.Router();

// Get available skills
router.get('/meta/skills', (req, res) => {
  try {
    const qb = loadQuestionBank();
    const technicalSkills = Object.keys(qb.technicalQuestions || {}).filter(skill => skill !== 'default');
    const skills = Array.isArray(qb.skills) && qb.skills.length > 0 ? qb.skills : technicalSkills;
    res.json({ skills });
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

// Get all available questions (by type and difficulty)
router.get('/', (req, res) => {
  try {
    const { type, difficulty, skill } = req.query;
    const qb = loadQuestionBank();
    let questions = [];

    if (type === 'HR') {
      questions = qb.hrQuestions;
      if (difficulty) {
        const diffMap = { easy: 'easy', medium: 'medium', hard: 'hard' };
        questions = questions.filter(q => q.difficulty === diffMap[difficulty.toLowerCase()]);
      }
    } else if (type === 'Technical') {
      if (skill && qb.technicalQuestions[skill]) {
        questions = qb.technicalQuestions[skill];
      } else if (!skill) {
        questions = qb.technicalQuestions.default;
      } else {
        return res.status(400).json({ error: `Skill "${skill}" not found` });
      }

      if (difficulty) {
        const diffMap = { easy: 'easy', medium: 'medium', hard: 'hard' };
        questions = questions.filter(q => q.difficulty === diffMap[difficulty.toLowerCase()]);
      }
    } else {
      return res.status(400).json({ error: 'Type must be "HR" or "Technical"' });
    }

    res.json({
      type,
      difficulty: difficulty || 'all',
      count: questions.length,
      questions,
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// Get a single question by ID
router.get('/:id', (req, res) => {
  try {
    const qb = loadQuestionBank();
    let question = null;

    // Search in HR questions
    question = qb.hrQuestions.find(q => q.id === req.params.id);

    // Search in technical questions
    if (!question) {
      for (const skill of Object.keys(qb.technicalQuestions)) {
        const found = qb.technicalQuestions[skill].find(q => q.id === req.params.id);
        if (found) {
          question = found;
          break;
        }
      }
    }

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json(question);
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({ error: 'Failed to fetch question' });
  }
});

// Get questions for a specific interview configuration
router.post('/generate', (req, res) => {
  try {
    const { type, difficulty, skills, timeframe } = req.body;

    // Validate required fields
    const required = ['type', 'difficulty'];
    const errors = validateRequiredFields(req.body, required);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    // Build config object
    const config = {
      type,
      difficulty,
      skills: type === 'Technical' ? skills || [] : [],
      timeframe: timeframe || 15,
    };

    // Validate config
    const validationErrors = validateInterviewConfig(config);
    if (validationErrors.length > 0) {
      return res.status(400).json({ errors: validationErrors });
    }

    // Get questions
    const questions = getQuestionsForConfig(config);

    // Create session
    const session = createSession(config, questions);

    res.json({
      sessionId: session.id,
      config: session.config,
      questions: session.questions,
      createdAt: session.createdAt,
    });
  } catch (error) {
    console.error('Error generating questions:', error);
    res.status(500).json({ error: 'Failed to generate questions' });
  }
});

export default router;
