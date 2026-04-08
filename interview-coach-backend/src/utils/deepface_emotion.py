#!/usr/bin/env python3
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path


def run_ffmpeg_extract_frames(source_path: str, output_dir: str, fps: float = 0.5) -> list[str]:
    pattern = os.path.join(output_dir, 'frame_%03d.jpg')
    cmd = [
        'ffmpeg',
        '-y',
        '-i', source_path,
        '-vf', f'fps={fps}',
        '-q:v', '2',
        pattern,
    ]

    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    frames = sorted(str(p) for p in Path(output_dir).glob('frame_*.jpg'))
    return frames


def classify_emotions(frame_paths: list[str]) -> dict:
    try:
        from deepface import DeepFace
    except Exception as exc:
        raise RuntimeError(f'DeepFace import failed: {str(exc)}') from exc

    dominant_counts: dict[str, int] = {}
    confidence_sum = 0.0
    analyzed = 0

    for frame_path in frame_paths:
        try:
            result = DeepFace.analyze(
                img_path=frame_path,
                actions=['emotion'],
                detector_backend='opencv',
                enforce_detection=False,
                silent=True,
            )

            payload = result[0] if isinstance(result, list) else result
            dominant = str(payload.get('dominant_emotion', 'neutral'))
            emotions = payload.get('emotion', {}) or {}
            confidence = float(emotions.get(dominant, 0.0))

            dominant_counts[dominant] = dominant_counts.get(dominant, 0) + 1
            confidence_sum += confidence
            analyzed += 1
        except Exception:
            continue

    if analyzed == 0:
        return {
            'status': 'empty',
            'sampledFrames': 0,
            'dominantEmotion': 'unknown',
            'dominantRatio': 0,
            'emotionConfidenceAvg': 0,
            'composureScore': 5,
            'distribution': {},
        }

    dominant_emotion = max(dominant_counts.items(), key=lambda x: x[1])[0]
    dominant_ratio = dominant_counts[dominant_emotion] / analyzed
    confidence_avg = confidence_sum / analyzed

    calm_set = {'neutral', 'happy'}
    calm_ratio = sum(count for emotion, count in dominant_counts.items() if emotion in calm_set) / analyzed
    composure_score = max(0, min(10, round(((calm_ratio * 0.7) + (dominant_ratio * 0.3)) * 10)))

    distribution = {
        emotion: round(count / analyzed, 4)
        for emotion, count in sorted(dominant_counts.items(), key=lambda kv: kv[1], reverse=True)
    }

    return {
        'status': 'completed',
        'sampledFrames': analyzed,
        'dominantEmotion': dominant_emotion,
        'dominantRatio': round(dominant_ratio, 4),
        'emotionConfidenceAvg': round(confidence_avg, 2),
        'composureScore': composure_score,
        'distribution': distribution,
    }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: deepface_emotion.py <video_or_audio_path>'}))
        sys.exit(1)

    source_path = sys.argv[1]
    if not os.path.exists(source_path):
        print(json.dumps({'error': f'File not found: {source_path}'}))
        sys.exit(1)

    try:
        with tempfile.TemporaryDirectory(prefix='deepface_frames_') as tmp_dir:
            frames = run_ffmpeg_extract_frames(source_path, tmp_dir, fps=0.5)
            if not frames:
                print(json.dumps({
                    'status': 'empty',
                    'sampledFrames': 0,
                    'dominantEmotion': 'unknown',
                    'dominantRatio': 0,
                    'emotionConfidenceAvg': 0,
                    'composureScore': 5,
                    'distribution': {},
                }))
                return

            result = classify_emotions(frames[:30])
            print(json.dumps(result))
    except RuntimeError as exc:
        print(json.dumps({'error': str(exc), 'status': 'not-configured'}))
        sys.exit(2)
    except Exception as exc:
        print(json.dumps({'error': str(exc), 'status': 'failed'}))
        sys.exit(3)


if __name__ == '__main__':
    main()
