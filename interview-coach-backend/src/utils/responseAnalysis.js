function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeText(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9+.#\s-]/gi, ' ');
}

function countWords(text = '') {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  return words.length;
}

function countSentences(text = '') {
  return String(text).split(/[.!?]+/).map(part => part.trim()).filter(Boolean).length;
}

function detectFillerWords(text = '') {
  const fillerPatterns = /\b(um+|uh+|like|you know|sort of|kind of|actually|basically|literally|i mean|you see)\b/gi;
  const matches = String(text).match(fillerPatterns) || [];
  return {
    count: matches.length,
    words: matches,
    density: countWords(text) > 0 ? (matches.length / countWords(text)) * 100 : 0,
  };
}

function calculateSpeakingRate(wordCount = 0, durationSeconds = 0) {
  if (durationSeconds <= 0) return 0;
  const wpm = (wordCount / durationSeconds) * 60;
  return Math.round(wpm);
}

function scoreFillerWords(fillerDensity) {
  if (fillerDensity === 0) return 10;
  if (fillerDensity < 1) return 10;
  if (fillerDensity < 2) return 9;
  if (fillerDensity < 3) return 8;
  if (fillerDensity < 5) return 7;
  if (fillerDensity < 7) return 6;
  if (fillerDensity < 10) return 5;
  return Math.max(1, 10 - Math.round(fillerDensity / 2));
}

function scoreToneStability(toneSummary) {
  if (!toneSummary || typeof toneSummary.stabilityScore !== 'number') {
    return 5;
  }
  return clamp(Math.round(toneSummary.stabilityScore), 0, 10);
}

function scoreVideoPresence(videoSummary) {
  if (!videoSummary || typeof videoSummary.presenceScore !== 'number') {
    return 5;
  }
  return clamp(Math.round(videoSummary.presenceScore), 0, 10);
}

function scoreVisualEyeContact(videoSummary) {
  if (!videoSummary || typeof videoSummary.eyeContactScore !== 'number') {
    return 5;
  }
  return clamp(Math.round(videoSummary.eyeContactScore), 0, 10);
}

function scoreVideoStability(videoSummary) {
  if (!videoSummary || typeof videoSummary.stabilityScore !== 'number') {
    return 5;
  }
  return clamp(Math.round(videoSummary.stabilityScore), 0, 10);
}

function scoreEmotionalComposure(emotionSummary) {
  if (!emotionSummary || typeof emotionSummary.composureScore !== 'number') {
    return 5;
  }
  return clamp(Math.round(emotionSummary.composureScore), 0, 10);
}

function scoreFromCoverage(coverage, wordCount, hasExample, hasStructure) {
  let score = coverage * 6;

  if (wordCount >= 25) score += 1.5;
  if (wordCount >= 50) score += 1;
  if (hasExample) score += 1;
  if (hasStructure) score += 0.5;

  return clamp(Math.round(score), 0, 10);
}

function matchKeywords(responseText, expectedKeywords = []) {
  const normalized = normalizeText(responseText);
  const matches = expectedKeywords.filter(keyword => normalized.includes(normalizeText(keyword)));
  const coverage = expectedKeywords.length > 0 ? matches.length / expectedKeywords.length : 0;

  return { matches, coverage };
}

function buildQuestionFeedback(question, responseText, expectedKeywords = [], metadata = {}) {
  const hasTranscript = Boolean(String(responseText || '').trim());
  const answered = hasTranscript || Boolean(metadata.hasRecording);
  const wordCount = countWords(responseText);
  const sentenceCount = countSentences(responseText);
  const { matches, coverage } = hasTranscript ? matchKeywords(responseText, expectedKeywords) : { matches: [], coverage: 0 };
  const hasExample = /for example|for instance|such as|in my experience|for example,/i.test(responseText);
  const hasStructure = /first|second|finally|initially|then|because|therefore/i.test(responseText);
  const score = hasTranscript ? scoreFromCoverage(coverage, wordCount, hasExample, hasStructure) : 0;

  // Delivery metrics
  const fillerMetrics = answered ? detectFillerWords(responseText) : { count: 0, words: [], density: 0 };
  const durationSeconds = metadata.durationSeconds || (wordCount > 0 ? Math.max(10, wordCount * 0.4) : 0);
  const speakingRateWPM = answered ? calculateSpeakingRate(wordCount, durationSeconds) : 0;

  let feedback;
  if (!answered) {
    feedback = 'No response recorded for this question.';
  } else if (!hasTranscript) {
    feedback = 'Recording captured, but transcript could not be extracted. Re-record this answer for better scoring.';
  } else if (coverage >= 0.6) {
    feedback = 'Strong answer with good keyword coverage and structure.';
  } else if (coverage >= 0.35) {
    feedback = 'Solid response, but you should add more concrete details and role-specific keywords.';
  } else {
    feedback = 'The answer was too generic. Add specific examples and technical terms next time.';
  }

  return {
    question: question.question,
    questionId: question.id,
    score,
    feedback,
    expectedKeywords,
    answered,
    response: String(responseText || '').trim(),
    matchedKeywords: matches,
    coverage: Number(coverage.toFixed(2)),
    wordCount,
    sentenceCount,
    transcription: metadata.transcription || null,
    reference: metadata.reference || null,
    delivery: {
      speakingRateWPM,
      fillerWordCount: fillerMetrics.count,
      fillerWordDensity: Number(fillerMetrics.density.toFixed(2)),
      estimatedDurationSeconds: Number(durationSeconds.toFixed(1)),
      toneStabilityScore: scoreToneStability(metadata.toneSummary),
      toneSummary: metadata.toneSummary || null,
      videoSummary: metadata.videoSummary || null,
      videoPresenceScore: scoreVideoPresence(metadata.videoSummary),
      visualEyeContactScore: scoreVisualEyeContact(metadata.videoSummary),
      videoStabilityScore: scoreVideoStability(metadata.videoSummary),
      emotionSummary: metadata.emotionSummary || null,
      emotionalComposureScore: scoreEmotionalComposure(metadata.emotionSummary),
    },
  };
}

function average(numbers) {
  if (!numbers.length) return 0;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function getTopItems(items, limit, predicate) {
  return items.filter(predicate).slice(0, limit);
}

export function analyzeInterviewResponses(session, responses = []) {
  const normalizedResponses = Array.isArray(responses) ? responses : [];

  const questionFeedback = (session.questions || []).map(question => {
    const responseEntry = normalizedResponses.find(entry => entry?.questionId === question.id) || {};
    const metadata = {
      hasRecording: responseEntry.source === 'media' || Boolean(responseEntry.media),
      toneSummary: responseEntry.toneSummary || null,
      videoSummary: responseEntry.videoSummary || null,
      emotionSummary: responseEntry.emotionSummary || null,
      transcription: responseEntry.transcriptionStatus || responseEntry.source ? {
        status: responseEntry.transcriptionStatus,
        provider: responseEntry.transcriptionProvider,
        model: responseEntry.transcriptionModel,
      } : null,
      reference: {
        id: question.id,
        category: question.category || null,
        difficulty: question.difficulty || null,
        tips: Array.isArray(question.tips) ? question.tips : [],
        answer: question.referenceAnswer || null,
      },
    };
    return buildQuestionFeedback(question, responseEntry.response || '', question.expectedKeywords || [], metadata);
  });

  const questionScores = questionFeedback.map(item => item.score);
  const coverages = questionFeedback.map(item => item.coverage || 0);
  const answeredCount = questionFeedback.filter(item => item.answered).length;
  const totalQuestions = questionFeedback.length || 1;
  const averageCoverage = average(coverages);
  const averageQuestionScore = average(questionScores);
  const completionRate = answeredCount / totalQuestions;

  const allResponsesText = questionFeedback.map(item => item.response).join(' ');
  const fillerWords = allResponsesText.match(/\b(um+|uh+|like|you know|sort of|kind of)\b/gi) || [];
  const fillerPenalty = Math.min(fillerWords.length * 1.25, 8);
  const wordCount = countWords(allResponsesText);
  const sentenceCount = countSentences(allResponsesText);
  const directLanguage = (allResponsesText.match(/\b(i|we|my|our|implemented|built|designed|led|improved|resolved)\b/gi) || []).length;
  const hedgingWords = (allResponsesText.match(/\b(maybe|probably|sort of|kind of|i think|i guess|perhaps)\b/gi) || []).length;

  // Calculate delivery metrics from question-level data
  const allDeliveryMetrics = questionFeedback.filter(q => q.delivery).map(q => q.delivery);
  const avgFillerDensity = allDeliveryMetrics.length > 0 
    ? allDeliveryMetrics.reduce((sum, d) => sum + d.fillerWordDensity, 0) / allDeliveryMetrics.length 
    : 0;
  const avgSpeakingRateWPM = allDeliveryMetrics.length > 0
    ? Math.round(allDeliveryMetrics.reduce((sum, d) => sum + d.speakingRateWPM, 0) / allDeliveryMetrics.length)
    : 0;
  const totalFillerWords = allDeliveryMetrics.reduce((sum, d) => sum + d.fillerWordCount, 0);
  const avgToneStabilityScore = allDeliveryMetrics.length > 0
    ? allDeliveryMetrics.reduce((sum, d) => sum + (d.toneStabilityScore || 5), 0) / allDeliveryMetrics.length
    : 5;
  const avgVideoPresenceScore = allDeliveryMetrics.length > 0
    ? allDeliveryMetrics.reduce((sum, d) => sum + (d.videoPresenceScore || 5), 0) / allDeliveryMetrics.length
    : 5;
  const avgVisualEyeContactScore = allDeliveryMetrics.length > 0
    ? allDeliveryMetrics.reduce((sum, d) => sum + (d.visualEyeContactScore || 5), 0) / allDeliveryMetrics.length
    : 5;
  const avgVideoStabilityScore = allDeliveryMetrics.length > 0
    ? allDeliveryMetrics.reduce((sum, d) => sum + (d.videoStabilityScore || 5), 0) / allDeliveryMetrics.length
    : 5;
  const avgEmotionalComposureScore = allDeliveryMetrics.length > 0
    ? allDeliveryMetrics.reduce((sum, d) => sum + (d.emotionalComposureScore || 5), 0) / allDeliveryMetrics.length
    : 5;
  const speakingRateScore = clamp(Math.round(Math.max(0, 10 - Math.abs(avgSpeakingRateWPM - 130) / 20)), 0, 10);
  const fillerScore = scoreFillerWords(avgFillerDensity);

  const clarityScore = clamp(Math.round(averageCoverage * 10 + (sentenceCount >= 2 ? 1 : 0)), 0, 10);
  const confidenceScore = clamp(Math.round(6 + directLanguage / 4 - hedgingWords / 2 + completionRate * 2 + ((avgToneStabilityScore - 5) * 0.35) + ((avgEmotionalComposureScore - 5) * 0.3)), 0, 10);
  const fluencyScore = clamp(Math.round(8 - (avgFillerDensity / 2) + Math.min(wordCount / 120, 1.5) + ((avgToneStabilityScore - 5) * 0.25)), 0, 10);
  const focusScore = clamp(Math.round((averageQuestionScore + completionRate * 2) * 0.6 + (avgVisualEyeContactScore * 0.4)), 0, 10);
  const structureScore = clamp(Math.round(((questionFeedback.filter(item => item.coverage && item.coverage >= 0.4).length / totalQuestions) * 10) * 0.7 + (avgVideoPresenceScore * 0.3)), 0, 10);
  const depthScore = clamp(Math.round((averageCoverage * 9 + (wordCount >= 40 ? 1 : 0)) * 0.7 + (avgVideoStabilityScore * 0.3)), 0, 10);

  const overallScore = clamp(Math.round(averageQuestionScore * 10 + completionRate * 15 - (totalFillerWords * 0.5)), 0, 100);
  const readinessScore = clamp(Math.round((averageCoverage * 55) + (completionRate * 35) + (fluencyScore * 1.2) + (avgToneStabilityScore * 0.8)), 0, 100);

  const strengths = [
    'Answered ' + answeredCount + ' of ' + totalQuestions + ' questions',
    averageCoverage >= 0.4 ? 'Used role-relevant keywords in multiple answers' : 'Showed clear intent in several responses',
    fluencyScore >= 7 ? 'Kept responses fairly fluid and direct' : 'Maintained a steady response pace',
    depthScore >= 7 ? 'Added strong detail in longer answers' : 'Included enough context to assess your responses',
    avgSpeakingRateWPM > 0 && speakingRateScore >= 7 ? `Good speaking pace at ~${avgSpeakingRateWPM} words per minute` : '',
  ].slice(0, 4).filter(Boolean);

  const improvements = [
    completionRate < 1 ? 'Answer every question to improve your completion rate' : 'Keep every response concise and complete',
    averageCoverage < 0.5 ? 'Include more expected keywords and concrete examples' : 'Add a few more specific details to strengthen answers',
    fillerScore < 8 ? `Reduce filler words (currently ${avgFillerDensity.toFixed(1)}% density)` : 'Continue reducing hesitation words',
    structureScore < 7 ? 'Use a clearer structure: context, action, result' : 'Keep using a structured answer format',
  ].slice(0, 4).filter(Boolean);

  const summaryMessage = overallScore >= 80
    ? 'Strong session overall. Your answers were specific, structured, and covered most expected concepts.'
    : overallScore >= 65
      ? 'Good progress. Your answers show solid understanding, but you can improve depth and keyword coverage.'
      : 'Your responses need more structure and specificity. Focus on completing answers with clear examples.';

  const responseMetrics = {
    clarity: {
      score: clarityScore,
      feedback: 'Clarity is based on keyword coverage and how well each answer stays on topic.',
    },
    confidence: {
      score: confidenceScore,
      feedback: 'Confidence is estimated from direct language, completion rate, and hedging words.',
    },
    fluency: {
      score: fluencyScore,
      feedback: `Fluency reflects response length and filler words (${totalFillerWords} detected).`,
    },
    fillerWords: {
      score: fillerScore,
      feedback: totalFillerWords > 0
        ? `Filler word density: ${avgFillerDensity.toFixed(1)}% (${totalFillerWords} total across all answers).`
        : 'No filler words detected in your answers.',
    },
  };

  const deliveryMetrics = {
    eyeContact: {
      score: focusScore,
      feedback: 'Focus is derived from whether you addressed the question directly and completed your response.',
    },
    facialExpressions: {
      score: structureScore,
      feedback: 'Structure measures how often your answers included clear progression or example-based support.',
    },
    posture: {
      score: depthScore,
      feedback: 'Depth measures the amount of specific detail and supporting context in your answers.',
    },
    speakingRate: {
      score: speakingRateScore,
      wpm: avgSpeakingRateWPM,
      feedback: `Average speaking rate: ~${avgSpeakingRateWPM} words per minute. Target: 120-150 WPM.`,
    },
    vocalTone: {
      score: clamp(Math.round(avgToneStabilityScore), 0, 10),
      feedback: `Tone stability score: ${avgToneStabilityScore.toFixed(1)}/10 based on pitch and volume consistency.`,
    },
    visualPresence: {
      score: clamp(Math.round(avgVideoPresenceScore), 0, 10),
      feedback: `Visual presence score: ${avgVideoPresenceScore.toFixed(1)}/10 based on face visibility and framing consistency.`,
    },
    emotionalComposure: {
      score: clamp(Math.round(avgEmotionalComposureScore), 0, 10),
      feedback: `Emotional composure score: ${avgEmotionalComposureScore.toFixed(1)}/10 based on dominant emotion stability across sampled frames.`,
    },
  };

  return {
    overallScore,
    readinessScore,
    summaryMessage,
    strengths: getTopItems(strengths, 4, Boolean),
    improvements: getTopItems(improvements, 4, Boolean),
    verbal: responseMetrics,
    nonVerbal: deliveryMetrics,
    questions: questionFeedback,
  };
}