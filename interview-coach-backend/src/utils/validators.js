export function validateRequiredFields(obj, fields) {
  const errors = [];
  fields.forEach(field => {
    if (!(field in obj) || obj[field] === null || obj[field] === undefined) {
      errors.push(`Missing required field: ${field}`);
    }
  });
  return errors;
}

export function validateFeedback(feedback) {
  const errors = [];

  if (typeof feedback.overallScore !== 'number' || feedback.overallScore < 0 || feedback.overallScore > 100) {
    errors.push('overallScore must be a number between 0 and 100');
  }

  if (typeof feedback.readinessScore !== 'number' || feedback.readinessScore < 0 || feedback.readinessScore > 100) {
    errors.push('readinessScore must be a number between 0 and 100');
  }

  if (typeof feedback.summaryMessage !== 'string') {
    errors.push('summaryMessage must be a string');
  }

  if (!Array.isArray(feedback.strengths)) {
    errors.push('strengths must be an array');
  }

  if (!Array.isArray(feedback.improvements)) {
    errors.push('improvements must be an array');
  }

  return errors;
}

export function validateResponses(responses) {
  const errors = [];

  if (!Array.isArray(responses) || responses.length === 0) {
    errors.push('responses must be a non-empty array');
    return errors;
  }

  responses.forEach((response, index) => {
    if (!response || typeof response !== 'object') {
      errors.push(`Response at index ${index} must be an object`);
      return;
    }

    if (typeof response.questionId !== 'string' || !response.questionId.trim()) {
      errors.push(`Response at index ${index} is missing questionId`);
    }

    if (typeof response.response !== 'string') {
      errors.push(`Response at index ${index} must include a text response`);
    }
  });

  return errors;
}
