import express from 'express';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { analyzeQuestionEmotion } from '../utils/emotionAnalysis.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getPythonPath() {
  const venvPython = path.join(__dirname, '../../../.venv/Scripts/python.exe');
  if (fs.existsSync(venvPython)) {
    return venvPython;
  }
  return 'python';
}

function parseJsonOutput(output) {
  const lines = String(output || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    if (line.startsWith('{') && line.endsWith('}')) {
      try {
        return JSON.parse(line);
      } catch {
        // Continue scanning.
      }
    }
  }
  return null;
}

// Debug endpoint: Analyze tone from uploaded audio/video file
router.post('/analyze-tone', (req, res) => {
  try {
    if (!req.files || !req.files.recording) {
      return res.status(400).json({ error: 'No recording file provided' });
    }

    const recordingFile = req.files.recording;
    const filePath = recordingFile.tempFilePath;

    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ error: 'File not found in temp directory' });
    }

    const toneAnalyzerScript = path.join(__dirname, '../utils/toneAnalyzer.py');
    const pythonPath = getPythonPath();

    const result = spawnSync(pythonPath, [toneAnalyzerScript, filePath], {
      encoding: 'utf8',
      timeout: 60000,
      env: {
        ...process.env,
        PYTHONUTF8: '1',
        PYTHONIOENCODING: 'utf-8',
      },
    });

    if (result.status !== 0) {
      console.error('Tone analysis stderr:', result.stderr);
      return res.status(500).json({
        error: 'Tone analysis failed',
        details: result.stderr || 'Unknown error',
      });
    }

    let toneData;
    try {
      toneData = JSON.parse(result.stdout);
    } catch (parseError) {
      console.error('Failed to parse tone analysis output:', result.stdout);
      return res.status(500).json({
        error: 'Invalid tone analysis output',
        details: result.stdout,
      });
    }

    if (toneData.error) {
      return res.status(400).json(toneData);
    }

    res.json({
      success: true,
      toneSummary: toneData,
      file: {
        name: recordingFile.name,
        size: recordingFile.size,
        mimetype: recordingFile.mimetype,
      },
    });
  } catch (error) {
    console.error('Error in debug analyze-tone endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    // Clean up temp file
    if (req.files?.recording?.tempFilePath) {
      try {
        fs.unlinkSync(req.files.recording.tempFilePath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
});

// Debug endpoint: Analyze external video for visual presence + emotion.
router.post('/analyze-video', async (req, res) => {
  try {
    if (!req.files || !req.files.recording) {
      return res.status(400).json({ error: 'No recording file provided' });
    }

    const recordingFile = req.files.recording;
    const filePath = recordingFile.tempFilePath;

    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ error: 'File not found in temp directory' });
    }

    const videoAnalyzerScript = path.join(__dirname, '../utils/video_metrics.py');
    const pythonPath = getPythonPath();

    const videoResult = spawnSync(pythonPath, [videoAnalyzerScript, filePath], {
      encoding: 'utf8',
      timeout: 90000,
      env: {
        ...process.env,
        PYTHONUTF8: '1',
        PYTHONIOENCODING: 'utf-8',
      },
    });

    if (videoResult.status !== 0) {
      console.error('Video analysis stderr:', videoResult.stderr);
      return res.status(500).json({
        error: 'Video analysis failed',
        details: videoResult.stderr || 'Unknown error',
      });
    }

    const videoSummary = parseJsonOutput(videoResult.stdout);
    if (!videoSummary) {
      return res.status(500).json({
        error: 'Invalid video analysis output',
        details: videoResult.stdout,
      });
    }

    if (videoSummary.error) {
      return res.status(400).json(videoSummary);
    }

    const emotionResult = await analyzeQuestionEmotion({
      filePath,
      questionId: 'debug-external-video',
    });

    res.json({
      success: true,
      videoSummary,
      emotion: {
        status: emotionResult.status,
        provider: emotionResult.provider,
        summary: emotionResult.summary || null,
        error: emotionResult.error || null,
      },
      file: {
        name: recordingFile.name,
        size: recordingFile.size,
        mimetype: recordingFile.mimetype,
      },
    });
  } catch (error) {
    console.error('Error in debug analyze-video endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (req.files?.recording?.tempFilePath) {
      try {
        fs.unlinkSync(req.files.recording.tempFilePath);
      } catch {
        // Ignore cleanup errors.
      }
    }
  }
});

export default router;
