import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getPythonAttempts() {
  const venvPython = path.join(__dirname, '../../../.venv/Scripts/python.exe');
  const attempts = [{ cmd: 'python', argsPrefix: [] }, { cmd: 'py', argsPrefix: [] }];

  if (fs.existsSync(venvPython)) {
    attempts.unshift({ cmd: venvPython, argsPrefix: [] });
  }

  return attempts;
}

function parseJsonOutput(output) {
  const lines = String(output || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    if (line.startsWith('{') && line.endsWith('}')) {
      try {
        return JSON.parse(line);
      } catch {
        // Ignore parse failure and continue scanning.
      }
    }
  }
  return null;
}

export async function analyzeQuestionEmotion({ filePath, questionId }) {
  const scriptPath = path.join(__dirname, './deepface_emotion.py');
  const timeoutMs = Number(process.env.DEEPFACE_TIMEOUT_MS || 30000);

  if (!fs.existsSync(scriptPath)) {
    return {
      status: 'not-configured',
      provider: null,
      questionId,
      summary: null,
      error: 'DeepFace script not found',
    };
  }

  const attempts = getPythonAttempts();
  let lastError = null;

  for (const attempt of attempts) {
    try {
      const stdout = execFileSync(attempt.cmd, [...attempt.argsPrefix, scriptPath, filePath], {
        stdio: 'pipe',
        encoding: 'utf8',
        timeout: timeoutMs,
        env: {
          ...process.env,
          PYTHONUTF8: '1',
          PYTHONIOENCODING: 'utf-8',
          TF_CPP_MIN_LOG_LEVEL: process.env.TF_CPP_MIN_LOG_LEVEL || '2',
        },
      });

      const parsed = parseJsonOutput(stdout);
      if (!parsed) {
        return {
          status: 'failed',
          provider: 'deepface',
          questionId,
          summary: null,
          error: 'Invalid DeepFace output',
        };
      }

      if (parsed.error) {
        return {
          status: parsed.status || 'failed',
          provider: 'deepface',
          questionId,
          summary: null,
          error: parsed.error,
        };
      }

      return {
        status: parsed.status || 'completed',
        provider: 'deepface',
        questionId,
        summary: parsed,
        error: null,
      };
    } catch (error) {
      const errorStdout = error?.stdout ? String(error.stdout) : '';
      const parsedFromError = parseJsonOutput(errorStdout);
      if (parsedFromError) {
        if (parsedFromError.error) {
          return {
            status: parsedFromError.status || 'failed',
            provider: 'deepface',
            questionId,
            summary: null,
            error: parsedFromError.error,
          };
        }

        return {
          status: parsedFromError.status || 'completed',
          provider: 'deepface',
          questionId,
          summary: parsedFromError,
          error: null,
        };
      }
      lastError = error;
    }
  }

  const stderr = lastError?.stderr ? String(lastError.stderr) : '';
  const message = stderr || lastError?.message || 'DeepFace analysis failed';

  return {
    status: message.includes('DeepFace not installed') ? 'not-configured' : 'failed',
    provider: 'deepface',
    questionId,
    summary: null,
    error: message,
  };
}
