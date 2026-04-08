export interface VideoSummary {
  sampledFrames: number;
  faceDetectedFrames: number;
  centeredFaceFrames: number;
  averageFaceAreaRatio: number;
  averageMotion: number;
  presenceScore: number;
  eyeContactScore: number;
  stabilityScore: number;
  faceDetectionAvailable: boolean;
  mediapipeActive: boolean;
  averageYawAbs: number;
  averagePitchAbs: number;
}

interface StartOptions {
  sampleIntervalMs?: number;
  enableFaceDetection?: boolean;
}

type FaceDetectorLike = {
  detect: (input: ImageBitmapSource) => Promise<Array<{ boundingBox?: DOMRectReadOnly | null }>>;
};

type FaceLandmarkerLike = {
  detectForVideo: (videoFrame: HTMLVideoElement, timestampMs: number) => {
    faceLandmarks?: Array<Array<{ x: number; y: number; z?: number }>>;
  };
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

class VideoAnalyzer {
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private sampleInterval: ReturnType<typeof setInterval> | null = null;
  private previousGrayFrame: Uint8ClampedArray | null = null;
  private sampleIntervalMs = 250;
  private isDetectingFace = false;
  private latestSummary: VideoSummary | null = null;

  private sampledFrames = 0;
  private faceDetectedFrames = 0;
  private centeredFaceFrames = 0;
  private totalFaceAreaRatio = 0;
  private totalMotion = 0;
  private totalYawAbs = 0;
  private totalPitchAbs = 0;

  private faceDetector: FaceDetectorLike | null = null;
  private faceLandmarker: FaceLandmarkerLike | null = null;
  private faceDetectionAvailable = false;
  private mediapipeActive = false;

  async start(videoElement: HTMLVideoElement, options?: StartOptions): Promise<void> {
    this.stop();

    this.videoElement = videoElement;
    this.sampleIntervalMs = options?.sampleIntervalMs || 250;

    this.canvas = document.createElement('canvas');
    this.canvas.width = 160;
    this.canvas.height = 90;
    this.context = this.canvas.getContext('2d', { willReadFrequently: true });

    this.sampledFrames = 0;
    this.faceDetectedFrames = 0;
    this.centeredFaceFrames = 0;
    this.totalFaceAreaRatio = 0;
    this.totalMotion = 0;
    this.totalYawAbs = 0;
    this.totalPitchAbs = 0;
    this.previousGrayFrame = null;
    this.latestSummary = null;

    this.faceDetector = null;
    this.faceLandmarker = null;
    this.faceDetectionAvailable = false;
    this.mediapipeActive = false;

    if (options?.enableFaceDetection !== false) {
      await this.initMediaPipeFaceLandmarker();
    }

    if (!this.faceLandmarker && options?.enableFaceDetection !== false && typeof window !== 'undefined' && 'FaceDetector' in window) {
      try {
        const Detector = (window as typeof window & {
          FaceDetector?: new (opts?: { fastMode?: boolean; maxDetectedFaces?: number }) => FaceDetectorLike;
        }).FaceDetector;

        if (Detector) {
          this.faceDetector = new Detector({ fastMode: true, maxDetectedFaces: 1 });
          this.faceDetectionAvailable = true;
        }
      } catch {
        this.faceDetector = null;
        this.faceDetectionAvailable = false;
      }
    }

    this.sampleInterval = setInterval(() => {
      void this.sampleFrame();
    }, this.sampleIntervalMs);
  }

  stop(): VideoSummary | null {
    if (this.sampleInterval) {
      clearInterval(this.sampleInterval);
      this.sampleInterval = null;
    }

    this.videoElement = null;
    this.canvas = null;
    this.context = null;
    this.previousGrayFrame = null;
    this.isDetectingFace = false;

    if (this.sampledFrames === 0) {
      this.latestSummary = null;
      return null;
    }

    const sampledFrames = this.sampledFrames;
    const averageMotion = this.totalMotion / sampledFrames;
    const averageFaceAreaRatio = this.totalFaceAreaRatio / sampledFrames;
    const presenceRatio = this.faceDetectedFrames / sampledFrames;
    const centeredRatio = this.centeredFaceFrames / sampledFrames;
    const averageYawAbs = this.totalYawAbs / sampledFrames;
    const averagePitchAbs = this.totalPitchAbs / sampledFrames;

    const presenceScore = clamp(Math.round(presenceRatio * 10), 0, 10);
    const eyeContactFromCenter = clamp(Math.round(centeredRatio * 10), 0, 10);
    const eyeContactFromHeadPose = clamp(Math.round(10 - Math.min(10, (averageYawAbs * 20) + (averagePitchAbs * 16))), 0, 10);
    const eyeContactScore = this.mediapipeActive
      ? clamp(Math.round((eyeContactFromCenter * 0.45) + (eyeContactFromHeadPose * 0.55)), 0, 10)
      : eyeContactFromCenter;
    const stabilityScore = clamp(Math.round((10 - Math.min(10, averageMotion * 55)) * 10) / 10, 0, 10);

    this.latestSummary = {
      sampledFrames,
      faceDetectedFrames: this.faceDetectedFrames,
      centeredFaceFrames: this.centeredFaceFrames,
      averageFaceAreaRatio: Number(averageFaceAreaRatio.toFixed(4)),
      averageMotion: Number(averageMotion.toFixed(4)),
      presenceScore,
      eyeContactScore,
      stabilityScore,
      faceDetectionAvailable: this.faceDetectionAvailable,
      mediapipeActive: this.mediapipeActive,
      averageYawAbs: Number(averageYawAbs.toFixed(4)),
      averagePitchAbs: Number(averagePitchAbs.toFixed(4)),
    };

    return this.latestSummary;
  }

  getLiveSummary(): VideoSummary | null {
    if (this.sampledFrames === 0) {
      return null;
    }

    const sampledFrames = this.sampledFrames;
    const averageMotion = this.totalMotion / sampledFrames;
    const averageFaceAreaRatio = this.totalFaceAreaRatio / sampledFrames;
    const presenceRatio = this.faceDetectedFrames / sampledFrames;
    const centeredRatio = this.centeredFaceFrames / sampledFrames;
    const averageYawAbs = this.totalYawAbs / sampledFrames;
    const averagePitchAbs = this.totalPitchAbs / sampledFrames;

    const eyeContactFromCenter = clamp(Math.round(centeredRatio * 10), 0, 10);
    const eyeContactFromHeadPose = clamp(Math.round(10 - Math.min(10, (averageYawAbs * 20) + (averagePitchAbs * 16))), 0, 10);
    const eyeContactScore = this.mediapipeActive
      ? clamp(Math.round((eyeContactFromCenter * 0.45) + (eyeContactFromHeadPose * 0.55)), 0, 10)
      : eyeContactFromCenter;

    return {
      sampledFrames,
      faceDetectedFrames: this.faceDetectedFrames,
      centeredFaceFrames: this.centeredFaceFrames,
      averageFaceAreaRatio: Number(averageFaceAreaRatio.toFixed(4)),
      averageMotion: Number(averageMotion.toFixed(4)),
      presenceScore: clamp(Math.round(presenceRatio * 10), 0, 10),
      eyeContactScore,
      stabilityScore: clamp(Math.round((10 - Math.min(10, averageMotion * 55)) * 10) / 10, 0, 10),
      faceDetectionAvailable: this.faceDetectionAvailable,
      mediapipeActive: this.mediapipeActive,
      averageYawAbs: Number(averageYawAbs.toFixed(4)),
      averagePitchAbs: Number(averagePitchAbs.toFixed(4)),
    };
  }

  private async sampleFrame(): Promise<void> {
    if (!this.videoElement || !this.context || !this.canvas || this.videoElement.readyState < 2) {
      return;
    }

    const width = this.canvas.width;
    const height = this.canvas.height;

    this.context.drawImage(this.videoElement, 0, 0, width, height);
    const imageData = this.context.getImageData(0, 0, width, height);
    const data = imageData.data;

    const grayFrame = new Uint8ClampedArray(width * height);
    for (let i = 0, px = 0; i < data.length; i += 4, px += 1) {
      grayFrame[px] = Math.round((data[i] * 0.299) + (data[i + 1] * 0.587) + (data[i + 2] * 0.114));
    }

    let motion = 0;
    if (this.previousGrayFrame) {
      let diffSum = 0;
      for (let i = 0; i < grayFrame.length; i += 1) {
        diffSum += Math.abs(grayFrame[i] - this.previousGrayFrame[i]);
      }
      motion = (diffSum / grayFrame.length) / 255;
    }

    this.previousGrayFrame = grayFrame;
    this.totalMotion += motion;
    this.sampledFrames += 1;

    if (!this.isDetectingFace && this.faceLandmarker) {
      this.isDetectingFace = true;
      try {
        const result = this.faceLandmarker.detectForVideo(this.videoElement, performance.now());
        const face = result?.faceLandmarks?.[0];

        if (face && face.length > 0) {
          this.faceDetectedFrames += 1;

          const bounds = this.getLandmarkBounds(face);
          const area = ((bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY));
          this.totalFaceAreaRatio += clamp(area, 0, 1);

          const centerX = (bounds.minX + bounds.maxX) / 2;
          const centerY = (bounds.minY + bounds.maxY) / 2;
          const dx = Math.abs(centerX - 0.5);
          const dy = Math.abs(centerY - 0.5);

          if (dx < 0.18 && dy < 0.2) {
            this.centeredFaceFrames += 1;
          }

          const leftEye = face[33];
          const rightEye = face[263];
          const nose = face[1];
          if (leftEye && rightEye && nose) {
            const eyeMidX = (leftEye.x + rightEye.x) / 2;
            const eyeMidY = (leftEye.y + rightEye.y) / 2;
            const yawAbs = Math.abs((nose.x - eyeMidX) * 2.2);
            const pitchAbs = Math.abs((nose.y - eyeMidY) * 2.4);
            this.totalYawAbs += yawAbs;
            this.totalPitchAbs += pitchAbs;
          }
        }
      } catch {
        // Ignore intermittent detector failures for robustness.
      } finally {
        this.isDetectingFace = false;
      }
      return;
    }

    if (this.faceDetector && !this.isDetectingFace) {
      this.isDetectingFace = true;
      try {
        const faces = await this.faceDetector.detect(this.canvas);
        if (faces.length > 0 && faces[0]?.boundingBox) {
          const box = faces[0].boundingBox;
          const boxWidth = box.width || 0;
          const boxHeight = box.height || 0;
          const boxX = box.x || 0;
          const boxY = box.y || 0;

          this.faceDetectedFrames += 1;

          const area = (boxWidth * boxHeight) / (width * height);
          this.totalFaceAreaRatio += clamp(area, 0, 1);

          const centerX = boxX + (boxWidth / 2);
          const centerY = boxY + (boxHeight / 2);
          const dx = Math.abs(centerX - (width / 2)) / width;
          const dy = Math.abs(centerY - (height / 2)) / height;

          if (dx < 0.18 && dy < 0.2) {
            this.centeredFaceFrames += 1;
          }
        }
      } catch {
        // Ignore intermittent detector failures for robustness.
      } finally {
        this.isDetectingFace = false;
      }
    }
  }

  private getLandmarkBounds(landmarks: Array<{ x: number; y: number }>): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } {
    let minX = 1;
    let maxX = 0;
    let minY = 1;
    let maxY = 0;

    for (const point of landmarks) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }

    return { minX, maxX, minY, maxY };
  }

  private async initMediaPipeFaceLandmarker(): Promise<void> {
    try {
      const vision = await import('@mediapipe/tasks-vision');
      const fileset = await vision.FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
      );

      this.faceLandmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
      });

      this.faceDetectionAvailable = true;
      this.mediapipeActive = true;
    } catch {
      this.faceLandmarker = null;
      this.mediapipeActive = false;
    }
  }
}

export const videoAnalyzer = new VideoAnalyzer();