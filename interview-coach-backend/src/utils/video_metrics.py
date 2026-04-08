#!/usr/bin/env python3
import json
import math
import os
import sys

import cv2


def clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def analyze_video(file_path: str, sample_interval_sec: float = 0.25) -> dict:
    cap = cv2.VideoCapture(file_path)
    if not cap.isOpened():
        raise RuntimeError('Unable to open video file')

    fps = cap.get(cv2.CAP_PROP_FPS)
    if not fps or math.isnan(fps) or fps <= 0:
        fps = 25.0

    frame_step = max(1, int(round(fps * sample_interval_sec)))
    face_cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    face_cascade = cv2.CascadeClassifier(face_cascade_path)

    sampled_frames = 0
    face_detected_frames = 0
    centered_face_frames = 0
    total_face_area_ratio = 0.0
    total_motion = 0.0

    previous_gray_small = None
    frame_index = 0

    while True:
        success, frame = cap.read()
        if not success:
            break

        if frame_index % frame_step != 0:
            frame_index += 1
            continue

        frame_index += 1
        sampled_frames += 1

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray_small = cv2.resize(gray, (160, 90), interpolation=cv2.INTER_AREA)

        if previous_gray_small is not None:
            diff = cv2.absdiff(gray_small, previous_gray_small)
            total_motion += float(diff.mean()) / 255.0

        previous_gray_small = gray_small

        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(32, 32))
        if len(faces) > 0:
            face_detected_frames += 1
            x, y, w, h = max(faces, key=lambda f: f[2] * f[3])

            frame_h, frame_w = gray.shape
            area_ratio = (w * h) / float(frame_w * frame_h)
            total_face_area_ratio += clamp(area_ratio, 0.0, 1.0)

            center_x = (x + (w / 2.0)) / float(frame_w)
            center_y = (y + (h / 2.0)) / float(frame_h)
            dx = abs(center_x - 0.5)
            dy = abs(center_y - 0.5)

            if dx < 0.18 and dy < 0.2:
                centered_face_frames += 1

    cap.release()

    if sampled_frames == 0:
        return {
            'status': 'empty',
            'sampledFrames': 0,
            'faceDetectedFrames': 0,
            'centeredFaceFrames': 0,
            'averageFaceAreaRatio': 0,
            'averageMotion': 0,
            'presenceScore': 0,
            'eyeContactScore': 0,
            'stabilityScore': 0,
            'faceDetectionAvailable': True,
            'mediapipeActive': False,
            'averageYawAbs': 0,
            'averagePitchAbs': 0,
        }

    average_motion = total_motion / sampled_frames
    average_face_area_ratio = total_face_area_ratio / sampled_frames
    presence_ratio = face_detected_frames / sampled_frames
    centered_ratio = centered_face_frames / sampled_frames

    presence_score = int(clamp(round(presence_ratio * 10), 0, 10))
    eye_contact_score = int(clamp(round(centered_ratio * 10), 0, 10))
    stability_score = clamp(round((10 - min(10, average_motion * 55)) * 10) / 10, 0, 10)

    return {
        'status': 'completed',
        'sampledFrames': sampled_frames,
        'faceDetectedFrames': face_detected_frames,
        'centeredFaceFrames': centered_face_frames,
        'averageFaceAreaRatio': round(average_face_area_ratio, 4),
        'averageMotion': round(average_motion, 4),
        'presenceScore': presence_score,
        'eyeContactScore': eye_contact_score,
        'stabilityScore': stability_score,
        'faceDetectionAvailable': True,
        'mediapipeActive': False,
        'averageYawAbs': 0,
        'averagePitchAbs': 0,
    }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: video_metrics.py <video_path>'}))
        sys.exit(1)

    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(json.dumps({'error': f'File not found: {file_path}'}))
        sys.exit(1)

    try:
        result = analyze_video(file_path)
        print(json.dumps(result))
    except Exception as exc:
        print(json.dumps({'error': str(exc), 'status': 'failed'}))
        sys.exit(2)


if __name__ == '__main__':
    main()
