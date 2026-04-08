import fs from 'fs';
import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getFfmpegDir() {
  const candidates = [
    'C:/Users/tssra/AppData/Local/Microsoft/WinGet/Links/ffmpeg.exe',
    process.env.FFMPEG_PATH,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const normalized = String(candidate).replace(/\\/g, '/');
    if (fs.existsSync(normalized)) {
      return path.dirname(normalized);
    }
  }

  return null;
}

function inferExtensionFromMimeType(mimeType = '') {
  const normalized = String(mimeType).split(';')[0].trim().toLowerCase();
  if (normalized.includes('webm')) return '.webm';
  if (normalized.includes('mp4')) return '.mp4';
  if (normalized.includes('mpeg')) return '.mp3';
  if (normalized.includes('wav')) return '.wav';
  if (normalized.includes('ogg')) return '.ogg';
  return '.webm';
}

function cleanTranscript(text = '') {
  return String(text)
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getPythonAttempts() {
  const venvPython = path.join(__dirname, '../../../.venv/Scripts/python.exe');
  const attempts = [{ cmd: 'python', argsPrefix: [] }, { cmd: 'py', argsPrefix: [] }];

  if (fs.existsSync(venvPython)) {
    attempts.unshift({ cmd: venvPython, argsPrefix: [] });
  }

  return attempts;
}

function getWhisperCliAttempts(filePath, outputDir) {
  const baseArgs = [
    filePath,
    '--model', 'small',
    '--task', 'transcribe',
    '--language', 'en',
    '--output_format', 'txt',
    '--output_dir', outputDir,
    '--temperature', '0',
    '--best_of', '5',
    '--beam_size', '5',
    '--fp16', 'False',
  ];

  const pythonAttempts = getPythonAttempts().map(attempt => ({
    cmd: attempt.cmd,
    args: ['-m', 'whisper', ...baseArgs],
  }));

  return [{ cmd: 'whisper', args: baseArgs }, ...pythonAttempts];
}

function getExecEnv() {
  const ffmpegDir = getFfmpegDir();
  const mergedPath = ffmpegDir
    ? `${ffmpegDir};${process.env.PATH || ''}`
    : (process.env.PATH || '');

  return {
    ...process.env,
    PYTHONUTF8: '1',
    PYTHONIOENCODING: 'utf-8',
    PATH: mergedPath,
  };
}

function getFfmpegCommand() {
  const direct = 'C:/Users/tssra/AppData/Local/Microsoft/WinGet/Links/ffmpeg.exe';
  if (fs.existsSync(direct)) {
    return direct;
  }
  return 'ffmpeg';
}

function normalizeAudioForWhisper(sourcePath) {
  const outputWavPath = `${sourcePath}.whisper.wav`;
  const ffmpegCmd = getFfmpegCommand();

  try {
    execFileSync(ffmpegCmd, [
      '-y',
      '-i', sourcePath,
      '-ac', '1',
      '-ar', '16000',
      '-vn',
      outputWavPath,
    ], {
      stdio: 'pipe',
      env: getExecEnv(),
    });

    if (!fs.existsSync(outputWavPath)) {
      throw new Error('ffmpeg conversion did not produce output file');
    }

    return outputWavPath;
  } catch (error) {
    const stderr = error?.stderr ? String(error.stderr) : '';
    const message = stderr || error.message || 'ffmpeg audio normalization failed';
    throw new Error(`Audio normalization failed: ${message}`);
  }
}

function parseJsonFromOutput(output) {
  const lines = String(output || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    if (line.startsWith('{') && line.endsWith('}')) {
      try {
        return JSON.parse(line);
      } catch {
        // Continue scanning earlier lines.
      }
    }
  }
  return null;
}

function transcribeWithWhisperModule(sourcePath) {
  const pythonScript = [
    'import json, sys, whisper',
    'audio_path = sys.argv[1]',
    'model = whisper.load_model("small")',
    'result = model.transcribe(audio_path, language="en", task="transcribe", fp16=False, temperature=0)',
    'text = (result.get("text") or "").strip()',
    'print(json.dumps({"text": text}, ensure_ascii=False))',
  ].join('; ');

  const attempts = getPythonAttempts();
  let lastError = null;

  for (const attempt of attempts) {
    try {
      const stdout = execFileSync(attempt.cmd, [...attempt.argsPrefix, '-c', pythonScript, sourcePath], {
        stdio: 'pipe',
        env: getExecEnv(),
      });

      const parsed = parseJsonFromOutput(stdout);
      if (parsed && typeof parsed.text === 'string') {
        return cleanTranscript(parsed.text);
      }

      return cleanTranscript(String(stdout || ''));
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    const stderr = lastError?.stderr ? String(lastError.stderr) : '';
    const message = stderr || lastError.message || 'Whisper module transcription failed';
    throw new Error(message);
  }

  return '';
}

function transcribeWithWhisperCli(sourcePath) {
  const outputDir = path.dirname(sourcePath);
  const inputBaseName = path.basename(sourcePath, path.extname(sourcePath));
  const existingTxtFiles = new Set(
    fs.readdirSync(outputDir).filter(name => name.toLowerCase().endsWith('.txt'))
  );

  const attempts = getWhisperCliAttempts(sourcePath, outputDir);
  let lastError = null;

  for (const attempt of attempts) {
    try {
      execFileSync(attempt.cmd, attempt.args, {
        stdio: 'pipe',
        env: getExecEnv(),
      });
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    const stderr = lastError?.stderr ? String(lastError.stderr) : '';
    const message = stderr || lastError.message || 'Whisper CLI transcription failed';
    throw new Error(message);
  }

  const transcriptCandidates = [
    path.join(outputDir, `${inputBaseName}.txt`),
    path.join(outputDir, `${path.basename(sourcePath)}.txt`),
  ];

  const createdTxtFiles = fs.readdirSync(outputDir)
    .filter(name => name.toLowerCase().endsWith('.txt') && !existingTxtFiles.has(name))
    .map(name => path.join(outputDir, name));
  transcriptCandidates.push(...createdTxtFiles);

  const transcriptPath = transcriptCandidates.find(candidate => fs.existsSync(candidate));
  if (!transcriptPath) {
    throw new Error(`Whisper did not generate transcript output for ${path.basename(sourcePath)}`);
  }

  const transcript = cleanTranscript(fs.readFileSync(transcriptPath, 'utf-8'));
  try {
    fs.unlinkSync(transcriptPath);
  } catch {
    // Ignore cleanup failure.
  }
  return transcript;
}

async function transcribeWithWhisper(filePath, mimeType = 'audio/webm') {
  let convertedPath = null;
  let normalizedAudioPath = null;
  try {
    // Verify file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`Audio file not found: ${filePath}`);
    }

    const ext = path.extname(filePath);
    let sourcePath = filePath;
    if (!ext) {
      const inferredExt = inferExtensionFromMimeType(mimeType);
      convertedPath = `${filePath}${inferredExt}`;
      fs.copyFileSync(filePath, convertedPath);
      sourcePath = convertedPath;
    }

    normalizedAudioPath = normalizeAudioForWhisper(sourcePath);

    let transcript = '';
    try {
      transcript = transcribeWithWhisperModule(normalizedAudioPath);
    } catch (moduleError) {
      // Fallback to CLI if module mode fails unexpectedly.
      transcript = transcribeWithWhisperCli(normalizedAudioPath);
    }

    return {
      provider: 'whisper-local',
      model: 'small',
      transcript: transcript || '',
    };
  } catch (error) {
    console.error(`[Whisper] Transcription error: ${error.message}`);
    if (error.message.includes('No module named whisper') || error.message.includes('not recognized')) {
      throw new Error(
        'Whisper not found in Python environment. Please install it: pip install openai-whisper'
      );
    }
    if (String(error.message).toLowerCase().includes('ffmpeg')) {
      throw new Error('ffmpeg is required for Whisper transcription. Please install ffmpeg and add it to PATH.');
    }
    throw error;
  } finally {
    if (normalizedAudioPath && fs.existsSync(normalizedAudioPath)) {
      try {
        fs.unlinkSync(normalizedAudioPath);
      } catch {
        // Ignore cleanup failures.
      }
    }
    if (convertedPath && fs.existsSync(convertedPath)) {
      try {
        fs.unlinkSync(convertedPath);
      } catch {
        // Ignore cleanup failures.
      }
    }
  }
}

export async function analyzeQuestionRecording({ filePath, mimeType, questionId }) {
  try {
    const transcriptResult = await transcribeWithWhisper(filePath, mimeType);

    return {
      source: 'media',
      questionId,
      transcript: transcriptResult.transcript || '',
      transcriptionProvider: transcriptResult.provider,
      transcriptionModel: transcriptResult.model,
      transcriptionStatus: transcriptResult.transcript ? 'completed' : 'empty',
    };
  } catch (error) {
    console.error(`[MediaAnalysis] Question ${questionId} transcription failed:`, error.message);
    
    // Check if it's the "whisper not installed" error
    if (error.message.includes('pip install openai-whisper')) {
      return {
        source: 'media',
        questionId,
        transcript: '',
        transcriptionProvider: null,
        transcriptionStatus: 'not-configured',
        transcriptionError: 'Whisper not installed: pip install openai-whisper',
      };
    }

    return {
      source: 'media',
      questionId,
      transcript: '',
      transcriptionProvider: null,
      transcriptionStatus: 'failed',
      transcriptionError: error.message,
    };
  }
}
