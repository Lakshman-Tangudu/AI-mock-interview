import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const questionBankPath = path.join(__dirname, '../../data/question_bank.json');
const altQuestionBankPath = path.join(__dirname, '../../question_bank.json');

function normalizeDifficulty(value) {
  const lowered = String(value || '').trim().toLowerCase();
  if (lowered === 'easy' || lowered === 'medium' || lowered === 'hard') {
    return lowered;
  }
  return 'medium';
}

function normalizeQuestion(rawQuestion, fallbackId) {
  if (!rawQuestion || typeof rawQuestion !== 'object') {
    return null;
  }

  return {
    id: rawQuestion.id || fallbackId,
    question: rawQuestion.question || rawQuestion.text || '',
    category: rawQuestion.category || null,
    difficulty: normalizeDifficulty(rawQuestion.difficulty),
    expectedKeywords: Array.isArray(rawQuestion.expectedKeywords)
      ? rawQuestion.expectedKeywords
      : (Array.isArray(rawQuestion.expected_keywords) ? rawQuestion.expected_keywords : []),
    tips: Array.isArray(rawQuestion.tips) ? rawQuestion.tips : [],
    referenceAnswer: rawQuestion.referenceAnswer || rawQuestion.reference_answer || null,
    skill: rawQuestion.skill || null,
    type: rawQuestion.type || null,
  };
}

function normalizeQuestionBank(raw) {
  // New schema: top-level array of question objects.
  if (Array.isArray(raw)) {
    const hrQuestions = [];
    const technicalQuestions = { default: [] };
    const skillsSet = new Set();

    raw.forEach((item, index) => {
      const type = String(item?.type || '').trim().toLowerCase();
      const normalized = normalizeQuestion(item, `qb-${index + 1}`);
      if (!normalized || !normalized.question) {
        return;
      }

      if (type === 'hr') {
        hrQuestions.push(normalized);
        return;
      }

      if (type === 'technical') {
        const skill = normalized.skill || 'default';
        if (!technicalQuestions[skill]) {
          technicalQuestions[skill] = [];
        }
        technicalQuestions[skill].push(normalized);
        if (skill !== 'default') {
          skillsSet.add(skill);
        }
      }
    });

    return {
      hrQuestions,
      technicalQuestions,
      skills: Array.from(skillsSet),
      referenceAnswers: {},
    };
  }

  // Legacy schema: structured object with hrQuestions/technicalQuestions + optional referenceAnswers map.
  const hrQuestions = Array.isArray(raw?.hrQuestions)
    ? raw.hrQuestions.map((q, idx) => normalizeQuestion(q, `hr-${idx + 1}`)).filter(Boolean)
    : [];

  const referenceAnswers = raw?.referenceAnswers || {};
  const technicalQuestions = {};
  Object.entries(raw?.technicalQuestions || {}).forEach(([bucket, questions]) => {
    const normalizedBucket = Array.isArray(questions)
      ? questions
          .map((q, idx) => {
            const normalized = normalizeQuestion(q, `${bucket}-${idx + 1}`);
            if (normalized && !normalized.referenceAnswer && referenceAnswers[normalized.id]) {
              normalized.referenceAnswer = referenceAnswers[normalized.id];
            }
            return normalized;
          })
          .filter(Boolean)
      : [];
    technicalQuestions[bucket] = normalizedBucket;
  });

  if (!technicalQuestions.default) {
    technicalQuestions.default = [];
  }

  return {
    hrQuestions: hrQuestions.map(q => {
      if (!q.referenceAnswer && referenceAnswers[q.id]) {
        return { ...q, referenceAnswer: referenceAnswers[q.id] };
      }
      return q;
    }),
    technicalQuestions,
    skills: Array.isArray(raw?.skills) ? raw.skills : Object.keys(technicalQuestions).filter(s => s !== 'default'),
    referenceAnswers,
  };
}

export function loadQuestionBank() {
  try {
    const selectedPath = fs.existsSync(altQuestionBankPath) ? altQuestionBankPath : questionBankPath;
    const data = fs.readFileSync(selectedPath, 'utf-8');
    const parsed = JSON.parse(data);
    return normalizeQuestionBank(parsed);
  } catch (error) {
    console.error('Error loading question bank:', error);
    throw new Error('Failed to load question bank');
  }
}

export function validateInterviewConfig(config) {
  const errors = [];
  const qb = loadQuestionBank();

  if (!config.type || !['HR', 'Technical'].includes(config.type)) {
    errors.push('Invalid type: must be "HR" or "Technical"');
  }

  if (!config.difficulty || !['Easy', 'Medium', 'Hard'].includes(config.difficulty)) {
    errors.push('Invalid difficulty: must be "Easy", "Medium", or "Hard"');
  }

  if (config.timeframe && (typeof config.timeframe !== 'number' || config.timeframe < 5)) {
    errors.push('Invalid timeframe: must be a number >= 5');
  }

  if (config.type === 'Technical') {
    if (!Array.isArray(config.skills) || config.skills.length === 0) {
      errors.push('Technical interviews require at least one skill');
    }

    const fallbackSkills = Object.keys(qb.technicalQuestions || {}).filter(skill => skill !== 'default');
    const validSkills = Array.isArray(qb.skills) && qb.skills.length > 0 ? qb.skills : fallbackSkills;
    const invalidSkills = config.skills.filter(s => !validSkills.includes(s));
    if (invalidSkills.length > 0) {
      errors.push(`Invalid skills: ${invalidSkills.join(', ')}`);
    }
  }

  return errors;
}

export function getQuestionsForConfig(config) {
  const qb = loadQuestionBank();
  let questions = [];
  let preferredQuestionIds = new Set();

  if (config.type === 'HR') {
    questions = Array.isArray(qb.hrQuestions) ? qb.hrQuestions : [];
  } else {
    // Build technical pool with preference order: selected skills first, then default fallback.
    const technicalQuestions = qb.technicalQuestions || {};
    const selectedSkillPool = [];

    config.skills.forEach(skill => {
      const skillQuestions = technicalQuestions[skill];
      if (Array.isArray(skillQuestions)) {
        selectedSkillPool.push(...skillQuestions);
      }
    });

    preferredQuestionIds = new Set(selectedSkillPool.map(question => question?.id).filter(Boolean));

    const defaultQuestions = Array.isArray(technicalQuestions.default) ? technicalQuestions.default : [];
    const pool = selectedSkillPool.length > 0
      ? [...selectedSkillPool, ...defaultQuestions]
      : [...defaultQuestions];

    const dedupedById = new Map();
    pool.forEach(question => {
      if (!question) return;
      const key = question.id || `${question.question}-${question.difficulty || 'unknown'}`;
      dedupedById.set(key, question);
    });
    questions = Array.from(dedupedById.values());
  }

  // Filter by difficulty if specified
  if (config.difficulty) {
    const difficultyMap = { 'Easy': 'easy', 'Medium': 'medium', 'Hard': 'hard' };
    const targetDifficulty = difficultyMap[config.difficulty];
    questions = questions.filter(q => q.difficulty === targetDifficulty);
  }

  // Determine count based on difficulty
  const countMap = { 'Easy': 4, 'Medium': 6, 'Hard': 8 };
  const count = countMap[config.difficulty] || 6;

  // Shuffle and slice with selected-skill priority for technical interviews.
  let prioritized = [...questions];
  if (config.type === 'Technical' && preferredQuestionIds.size > 0) {
    const preferred = questions.filter(question => preferredQuestionIds.has(question.id)).sort(() => Math.random() - 0.5);
    const fallback = questions.filter(question => !preferredQuestionIds.has(question.id)).sort(() => Math.random() - 0.5);
    prioritized = [...preferred, ...fallback];
  } else {
    prioritized = [...questions].sort(() => Math.random() - 0.5);
  }

  return prioritized.slice(0, count).map(q => ({
    id: q.id,
    question: q.question,
    category: q.category,
    difficulty: q.difficulty,
    expectedKeywords: q.expectedKeywords,
    tips: q.tips,
    referenceAnswer: q.referenceAnswer || null,
  }));
}
