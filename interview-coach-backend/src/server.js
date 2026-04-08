import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fileUpload from 'express-fileupload';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import questionsRouter from './routes/questions.js';
import sessionsRouter from './routes/sessions.js';
import userSessionsRouter from './routes/userSessions.js';
import debugRouter from './routes/debug.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadTempDir = path.join(__dirname, '../tmp/uploads');
const venvPythonPath = path.join(__dirname, '../../.venv/Scripts/python.exe');
const winGetFfmpegPath = 'C:/Users/tssra/AppData/Local/Microsoft/WinGet/Links/ffmpeg.exe';

if (!fs.existsSync(uploadTempDir)) {
  fs.mkdirSync(uploadTempDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:8080';

// Middleware
app.use(cors({
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

app.use(express.json());
app.use(fileUpload({
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
  useTempFiles: true,
  tempFileDir: uploadTempDir,
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/questions', questionsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/user/sessions', userSessionsRouter);
app.use('/api/debug', debugRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

function runCommand(command, args = []) {
  try {
    const result = spawnSync(command, args, {
      encoding: 'utf8',
      timeout: 12000,
      env: {
        ...process.env,
        PYTHONUTF8: '1',
        PYTHONIOENCODING: 'utf-8',
      },
    });

    return {
      ok: result.status === 0,
      status: result.status,
      stdout: (result.stdout || '').trim(),
      stderr: (result.stderr || '').trim(),
      error: result.error ? String(result.error.message || result.error) : null,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      stdout: '',
      stderr: '',
      error: String(error.message || error),
    };
  }
}

app.get('/api/health/transcription', (req, res) => {
  const now = new Date().toISOString();

  const ffmpeg = runCommand('ffmpeg', ['-version']);
  const ffmpegDirect = fs.existsSync(winGetFfmpegPath)
    ? runCommand(winGetFfmpegPath, ['-version'])
    : { ok: false, status: null, stdout: '', stderr: '', error: 'WinGet ffmpeg path not found' };
  const whisperCli = runCommand('whisper', ['--help']);
  const python = runCommand('python', ['--version']);
  const venvPythonExists = fs.existsSync(venvPythonPath);
  const venvPythonVersion = venvPythonExists ? runCommand(venvPythonPath, ['--version']) : null;
  const venvWhisper = venvPythonExists
    ? runCommand(venvPythonPath, ['-m', 'whisper', '--help'])
    : null;

  const preferredRuntime = venvWhisper?.ok
    ? 'venv-python-whisper'
    : whisperCli.ok
      ? 'whisper-cli'
      : 'none';

  res.json({
    status: preferredRuntime === 'none' ? 'degraded' : 'ok',
    timestamp: now,
    preferredRuntime,
    runtime: {
      ffmpeg: {
        available: ffmpeg.ok || ffmpegDirect.ok,
        versionLine: (ffmpeg.stdout || ffmpegDirect.stdout).split('\n')[0]
          || (ffmpeg.stderr || ffmpegDirect.stderr).split('\n')[0]
          || null,
        path: ffmpeg.ok ? 'PATH:ffmpeg' : (ffmpegDirect.ok ? winGetFfmpegPath : null),
        error: (ffmpeg.ok || ffmpegDirect.ok)
          ? null
          : (ffmpeg.error || ffmpeg.stderr || ffmpegDirect.error || ffmpegDirect.stderr || 'ffmpeg command failed'),
      },
      whisperCli: {
        available: whisperCli.ok,
        error: whisperCli.error || (!whisperCli.ok ? whisperCli.stderr || 'whisper CLI unavailable' : null),
      },
      python: {
        available: python.ok,
        version: python.stdout || python.stderr || null,
      },
      venvPython: {
        exists: venvPythonExists,
        path: venvPythonPath,
        version: venvPythonVersion ? (venvPythonVersion.stdout || venvPythonVersion.stderr || null) : null,
        whisperModuleAvailable: Boolean(venvWhisper?.ok),
        whisperModuleError: venvWhisper && !venvWhisper.ok
          ? (venvWhisper.error || venvWhisper.stderr || 'python -m whisper failed')
          : null,
      },
    },
    guidance: {
      installWhisper: 'pip install openai-whisper',
      installFfmpeg: 'Install ffmpeg and add it to PATH, then restart backend server.',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`CORS enabled for: ${CORS_ORIGIN}`);
});
