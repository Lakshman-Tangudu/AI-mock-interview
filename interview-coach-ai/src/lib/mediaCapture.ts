import type { ToneSummary } from './toneAnalysis';

export interface RecordingConfig {
  video: boolean;
  audio: boolean;
}

export interface RecordingData {
  mimeType: string;
  videoBlob: Blob;
  audioBlob?: Blob;
  toneSummary?: ToneSummary | null;
}

class MediaCaptureManager {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private videoChunks: BlobPart[] = [];
  private audioChunks: BlobPart[] = [];
  private videoElement: HTMLVideoElement | null = null;
  private isRecording = false;
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private toneSamplingInterval: ReturnType<typeof setInterval> | null = null;
  private rmsSamples: number[] = [];
  private pitchSamples: number[] = [];
  private currentRms = 0;

  async requestPermissions(): Promise<{ camera: boolean; microphone: boolean }> {
    const result = { camera: false, microphone: false };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });

      result.camera = stream.getVideoTracks().length > 0;
      result.microphone = stream.getAudioTracks().length > 0;

      // Stop the stream as we're just checking permissions
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Error requesting media permissions:', error);
      throw new Error('Unable to access camera and microphone. Please check your browser permissions.');
    }

    return result;
  }

  async startRecording(videoElement?: HTMLVideoElement): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });

      this.mediaStream = stream;
      this.videoElement = videoElement || null;

      // Display in video element if provided
      if (videoElement) {
        videoElement.srcObject = stream;
      }

      // Create MediaRecorder with suitable mime type
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.startToneAnalysis(stream);

      this.videoChunks = [];
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.videoChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(1000); // Collect data every 1 second
      this.isRecording = true;
    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error('Failed to start recording. Please check your permissions.');
    }
  }

  async stopRecording(): Promise<RecordingData> {
    if (!this.mediaRecorder || !this.isRecording) {
      throw new Error('Recording is not active');
    }

    return new Promise((resolve, reject) => {
      this.mediaRecorder!.onstop = () => {
        try {
          const mimeType = this.mediaRecorder!.mimeType;
          const videoBlob = new Blob(this.videoChunks, { type: mimeType });
          const toneSummary = this.stopToneAnalysis();

          // Stop all tracks
          if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
          }

          if (this.videoElement) {
            this.videoElement.srcObject = null;
          }

          this.isRecording = false;
          this.mediaRecorder = null;
          this.mediaStream = null;

          resolve({
            mimeType,
            videoBlob,
            toneSummary,
          });
        } catch (error) {
          reject(error);
        }
      };

      this.mediaRecorder!.stop();
    });
  }

  getRecordingStatus(): boolean {
    return this.isRecording;
  }

  async pauseRecording(): Promise<void> {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.pause();
    }
  }

  async resumeRecording(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }

  private getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'video/webm';
  }

  private startToneAnalysis(stream: MediaStream): void {
    this.stopToneAnalysis();

    try {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.55;

      source.connect(analyser);

      this.audioContext = audioContext;
      this.analyserNode = analyser;
      this.rmsSamples = [];
      this.pitchSamples = [];
      this.currentRms = 0;

      const timeDomainData = new Float32Array(analyser.fftSize);
      this.toneSamplingInterval = setInterval(() => {
        if (!this.analyserNode) {
          return;
        }

        this.analyserNode.getFloatTimeDomainData(timeDomainData);
        const rms = this.calculateRms(timeDomainData);
        this.currentRms = rms;
        this.rmsSamples.push(rms);

        const pitchHz = this.detectPitchHz(timeDomainData, audioContext.sampleRate);
        if (pitchHz > 0) {
          this.pitchSamples.push(pitchHz);
        }
      }, 200);
    } catch (error) {
      console.warn('Tone analysis is not available in this browser:', error);
      this.audioContext = null;
      this.analyserNode = null;
      this.toneSamplingInterval = null;
      this.rmsSamples = [];
      this.pitchSamples = [];
      this.currentRms = 0;
    }
  }

  private stopToneAnalysis(): ToneSummary | null {
    if (this.toneSamplingInterval) {
      clearInterval(this.toneSamplingInterval);
      this.toneSamplingInterval = null;
    }

    const rmsSamples = [...this.rmsSamples];
    const pitchSamples = [...this.pitchSamples];

    this.rmsSamples = [];
    this.pitchSamples = [];
    this.currentRms = 0;

    if (this.audioContext) {
      void this.audioContext.close().catch(() => undefined);
      this.audioContext = null;
    }

    this.analyserNode = null;

    if (rmsSamples.length === 0) {
      return null;
    }

    const averageRms = this.average(rmsSamples);
    const peakRms = Math.max(...rmsSamples);
    const averagePitchHz = pitchSamples.length > 0 ? this.average(pitchSamples) : 0;
    const pitchVariabilityHz = pitchSamples.length > 1 ? this.standardDeviation(pitchSamples) : 0;
    const stabilityFromPitch = pitchSamples.length > 1
      ? 10 - Math.min(10, pitchVariabilityHz / 12)
      : 5;
    const stabilityFromVolume = 10 - Math.min(10, this.standardDeviation(rmsSamples) * 40);
    const stabilityScore = Number(((stabilityFromPitch * 0.7) + (stabilityFromVolume * 0.3)).toFixed(2));

    return {
      averageRms: Number(averageRms.toFixed(4)),
      peakRms: Number(peakRms.toFixed(4)),
      averagePitchHz: Number(averagePitchHz.toFixed(2)),
      pitchVariabilityHz: Number(pitchVariabilityHz.toFixed(2)),
      stabilityScore: Math.max(0, Math.min(10, stabilityScore)),
      sampledFrames: rmsSamples.length,
    };
  }

  private calculateRms(data: Float32Array): number {
    let sumSquares = 0;
    for (let i = 0; i < data.length; i += 1) {
      sumSquares += data[i] * data[i];
    }
    return Math.sqrt(sumSquares / data.length);
  }

  private detectPitchHz(data: Float32Array, sampleRate: number): number {
    const size = data.length;
    const minLag = Math.floor(sampleRate / 300);
    const maxLag = Math.floor(sampleRate / 70);

    let bestLag = -1;
    let bestCorrelation = 0;

    for (let lag = minLag; lag <= maxLag; lag += 1) {
      let correlation = 0;
      for (let i = 0; i < size - lag; i += 1) {
        correlation += data[i] * data[i + lag];
      }

      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestLag = lag;
      }
    }

    const signalEnergy = data.reduce((sum, value) => sum + (value * value), 0);
    if (bestLag <= 0 || signalEnergy <= 0) {
      return 0;
    }

    const normalizedCorrelation = bestCorrelation / signalEnergy;
    if (normalizedCorrelation < 0.1) {
      return 0;
    }

    return sampleRate / bestLag;
  }

  private average(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private standardDeviation(values: number[]): number {
    if (values.length <= 1) {
      return 0;
    }

    const avg = this.average(values);
    const variance = values.reduce((sum, value) => sum + ((value - avg) ** 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  getMicLevel(): number {
    return Math.max(0, Math.min(100, this.currentRms * 260));
  }
}

export const mediaCapture = new MediaCaptureManager();
