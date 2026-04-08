import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterview } from '@/contexts/InterviewContext';
import { uploadQuestionRecording } from '@/lib/api';
import { mediaCapture } from '@/lib/mediaCapture';
import type { ToneSummary } from '@/lib/toneAnalysis';
import { videoAnalyzer } from '@/lib/videoAnalysis';
import type { VideoSummary } from '@/lib/videoAnalysis';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { CircleDot, AudioLines, FastForward, CircleStop, Timer, ScanEye, ChartNoAxesCombined, ShieldCheck, AlertCircle } from 'lucide-react';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MockInterview() {
  const navigate = useNavigate();
  const { config, sessionId, questions, setPendingFinalUpload } = useInterview();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [audioToggle, setAudioToggle] = useState(true);
  const [faceToggle, setFaceToggle] = useState(true);
  const [questionTranscripts, setQuestionTranscripts] = useState<Record<string, string>>({});
  const [questionToneSummary, setQuestionToneSummary] = useState<Record<string, ToneSummary>>({});
  const [questionVideoSummary, setQuestionVideoSummary] = useState<Record<string, VideoSummary>>({});
  const [liveVideoSummary, setLiveVideoSummary] = useState<VideoSummary | null>(null);
  const [questionTranscriptionStatus, setQuestionTranscriptionStatus] = useState<Record<string, string>>({});
  const [questionTranscriptionError, setQuestionTranscriptionError] = useState<Record<string, string>>({});
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const questionTime = config && questions.length > 0 ? Math.floor((config.timeframe * 60) / questions.length) : 120;
  const [questionTimer, setQuestionTimer] = useState(questionTime);
  const [interviewTimer, setInterviewTimer] = useState((config?.timeframe || 15) * 60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startQuestionRecording = useCallback(async () => {
    try {
      await mediaCapture.startRecording(videoRef.current || undefined);

      if (videoRef.current) {
        await videoAnalyzer.start(videoRef.current, {
          sampleIntervalMs: 250,
          enableFaceDetection: faceToggle,
        });
      }

      setIsRecording(true);
      setRecordingError(null);
    } catch (error) {
      setRecordingError(error instanceof Error ? error.message : 'Failed to start recording');
      setIsRecording(false);
    }
  }, [faceToggle]);

  useEffect(() => {
    void startQuestionRecording();

    return () => {
      if (mediaCapture.getRecordingStatus()) {
        mediaCapture.stopRecording().catch(err => console.error('Error stopping recording:', err));
      }
      videoAnalyzer.stop();
    };
  }, [startQuestionRecording]);

  useEffect(() => {
    setCurrentIdx(0);
    setQuestionTranscripts({});
    setQuestionToneSummary({});
    setQuestionVideoSummary({});
    setQuestionTranscriptionStatus({});
    setQuestionTranscriptionError({});
  }, [questions]);

  // Simulate microphone level if recording is active
  useEffect(() => {
    const interval = setInterval(() => {
      setMicLevel(isRecording ? mediaCapture.getMicLevel() : 5);
      setLiveVideoSummary(isRecording ? videoAnalyzer.getLiveSummary() : null);
    }, 200);
    return () => clearInterval(interval);
  }, [isRecording]);

  const submitCurrentQuestionRecording = useCallback(async (awaitUpload = true) => {
    const activeQuestion = questions[currentIdx];
    if (!sessionId || !activeQuestion) {
      return null;
    }

    if (!mediaCapture.getRecordingStatus()) {
      return null;
    }

    setIsSubmittingQuestion(true);
    try {
      const sessionSnapshot = {
        config: config || undefined,
        questions,
        responses: Object.entries(questionTranscripts).map(([questionId, response]) => ({
          questionId,
          response,
        })),
      };

      const recordingData = await mediaCapture.stopRecording();
      const videoSummary = videoAnalyzer.stop();
      setIsRecording(false);

      if (recordingData.toneSummary) {
        setQuestionToneSummary(prev => ({ ...prev, [activeQuestion.id]: recordingData.toneSummary! }));
      }
      if (videoSummary) {
        setQuestionVideoSummary(prev => ({ ...prev, [activeQuestion.id]: videoSummary }));
      }

      const uploadPromise = uploadQuestionRecording(
        sessionId,
        activeQuestion.id,
        recordingData.videoBlob,
        sessionSnapshot,
        recordingData.toneSummary,
        videoSummary,
      )
        .then(result => {
          const transcript = result?.transcription?.transcript || '';
          const status = result?.transcription?.status || 'unknown';
          const error = result?.transcription?.error || '';

          setQuestionTranscriptionStatus(prev => ({ ...prev, [activeQuestion.id]: status }));
          if (error) {
            setQuestionTranscriptionError(prev => ({ ...prev, [activeQuestion.id]: error }));
          }

          if (transcript) {
            setQuestionTranscripts(prev => ({ ...prev, [activeQuestion.id]: transcript }));
          }

          return result;
        })
        .catch(error => {
          setQuestionTranscriptionStatus(prev => ({ ...prev, [activeQuestion.id]: 'failed' }));
          setQuestionTranscriptionError(prev => ({ ...prev, [activeQuestion.id]: error instanceof Error ? error.message : 'Transcription failed' }));
          throw error;
        });

      if (!awaitUpload) {
        return uploadPromise;
      }

      const result = await uploadPromise;

      return result;
    } finally {
      setIsSubmittingQuestion(false);
    }
  }, [config, currentIdx, questionTranscripts, questions, sessionId]);

  const goToProcessing = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      setIsUploading(true);
      const pendingUpload = await submitCurrentQuestionRecording(false);
      setPendingFinalUpload(pendingUpload);
      navigate('/processing');
    } catch (error) {
      console.error('Error moving to processing:', error);
      setRecordingError(error instanceof Error ? error.message : 'Failed to move to processing');
    } finally {
      setIsUploading(false);
    }
  }, [navigate, setPendingFinalUpload, submitCurrentQuestionRecording]);

  const handleNext = useCallback(async () => {
    try {
      if (currentIdx >= questions.length - 1) {
        await goToProcessing();
        return;
      }

      void submitCurrentQuestionRecording(false).catch(error => {
        console.error('Background question upload failed:', error);
      });
      setCurrentIdx(prev => prev + 1);
      setQuestionTimer(questionTime);
      await startQuestionRecording();
    } catch (error) {
      setRecordingError(error instanceof Error ? error.message : 'Failed to submit question recording');
    }
  }, [currentIdx, goToProcessing, questions.length, questionTime, startQuestionRecording, submitCurrentQuestionRecording]);

  // Handle interview timer and question timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setInterviewTimer(prev => {
        if (prev <= 1) {
          void goToProcessing();
          return 0;
        }
        return prev - 1;
      });
      setQuestionTimer(prev => {
        if (prev <= 1) {
          void handleNext();
          return questionTime;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [questionTime, handleNext, goToProcessing, submitCurrentQuestionRecording]);

  if (!config || questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-muted-foreground">No interview configured.</p>
          <Button className="mt-4" onClick={() => navigate('/setup')}>Go to Setup</Button>
        </div>
      </div>
    );
  }

  const timerPercent = questionTime > 0 ? (questionTimer / questionTime) * 100 : 0;
  const isTimerLow = questionTimer <= 30;

  return (
    <div className="max-w-3xl mx-auto space-y-5 relative">
      {/* Recording Error Alert */}
      {recordingError && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-3 animate-in-up">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Recording Error</p>
            <p className="text-xs text-destructive/80 mt-1">{recordingError}</p>
          </div>
        </div>
      )}
      {/* Timers */}
      <div className="flex items-center justify-between animate-in-up">
        <div className="flex items-center gap-2 text-sm rounded-lg px-3 py-2 bg-secondary/50 dark:bg-secondary/30 border border-border/40">
          <Timer className="h-3.5 w-3.5 text-primary" />
          <span className="text-muted-foreground text-xs">Interview:</span>
          <span className="font-mono font-bold">{formatTime(interviewTimer)}</span>
        </div>
        <div className="flex items-center gap-2">
          {isRecording && (
            <>
              <CircleDot className="h-2 w-2 fill-destructive text-destructive animate-pulse" />
              <span className="text-xs font-medium text-destructive">Recording Session</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Q{currentIdx + 1} of {questions.length}
        </div>
        <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 border transition-colors duration-300 ${
          isTimerLow ? 'bg-destructive/10 border-destructive/30 dark:bg-destructive/15' : 'bg-secondary/50 dark:bg-secondary/30 border-border/40'
        }`}>
          <Timer className={`h-3.5 w-3.5 ${isTimerLow ? 'text-destructive animate-pulse' : 'text-primary'}`} />
          <span className="text-muted-foreground text-xs">Question:</span>
          <span className={`font-mono font-bold ${isTimerLow ? 'text-destructive' : ''}`}>{formatTime(questionTimer)}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-secondary/50 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${isTimerLow ? 'bg-destructive' : 'bg-primary'}`}
          style={{ width: `${timerPercent}%` }}
        />
      </div>

      {/* Question */}
      <Card className="border-border/40 shadow-lg glass animate-in-up">
        <CardContent className="p-6 md:p-8">
          <p className="text-lg md:text-xl font-semibold leading-relaxed">{questions[currentIdx].question}</p>
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
            <CircleDot className="h-2.5 w-2.5 fill-primary text-primary" />
            Your response is recorded per question and uploaded when you click Next.
          </p>
          <div className="mt-5 space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Question Submission</Label>
            <div className="min-h-20 rounded-md bg-secondary/20 border border-border/40 p-3 text-xs text-muted-foreground leading-relaxed">
              {isSubmittingQuestion
                ? 'Uploading and analyzing this recording...'
                : (questionTranscripts[questions[currentIdx].id]
                  ? `Transcript captured: ${questionTranscripts[questions[currentIdx].id]}`
                  : (questionTranscriptionStatus[questions[currentIdx].id] === 'empty'
                    ? 'No speech detected in this recording. Please speak clearly and keep recording for at least 3-5 seconds.'
                    : (questionTranscriptionStatus[questions[currentIdx].id] === 'failed'
                      ? `Transcription failed: ${questionTranscriptionError[questions[currentIdx].id] || 'Please retry this question recording.'}`
                      : 'No transcript available yet. Record your response and click Next to upload this question.')) )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Phase 1 analysis runs speech-to-text (if configured) and keyword relevance scoring for each question.
            </p>
            {questionToneSummary[questions[currentIdx].id] && (
              <p className="text-[11px] text-muted-foreground">
                Tone stability: {questionToneSummary[questions[currentIdx].id].stabilityScore.toFixed(1)}/10
              </p>
            )}
            {questionVideoSummary[questions[currentIdx].id] && (
              <p className="text-[11px] text-muted-foreground">
                Visual presence: {questionVideoSummary[questions[currentIdx].id].presenceScore}/10, eye contact: {questionVideoSummary[questions[currentIdx].id].eyeContactScore}/10
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recording area */}
      <div className="grid md:grid-cols-2 gap-3 animate-in-up">
        {/* Camera preview */}
        <Card className={`border-border/40 shadow-md transition-all duration-500 ${isRecording ? 'recording-pulse' : 'glass'}`}>
          <CardContent className="p-3">
            <div className="aspect-video bg-black rounded-lg flex items-center justify-center relative overflow-hidden border border-border/30">
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-full h-full object-cover"
                style={{ display: isRecording ? 'block' : 'none' }}
              />
              {!isRecording && (
                <p className="text-xs text-muted-foreground">Camera Preview</p>
              )}
              {isRecording && (
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-destructive text-destructive-foreground px-2 py-1 rounded-full text-[10px] font-bold shadow-md">
                  <CircleDot className="h-1.5 w-1.5 fill-current animate-pulse" /> REC
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Indicators */}
        <div className="space-y-3">
          <Card className="border-border/40 shadow-sm glass">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                    <ChartNoAxesCombined className="h-3 w-3 text-primary" />
                  </div>
                  <Label className="text-xs font-medium">Audio Strength</Label>
                </div>
                <Switch checked={audioToggle} onCheckedChange={setAudioToggle} />
              </div>
              {audioToggle && (
                <div className="flex gap-0.5 h-7 items-end p-1 rounded-md bg-secondary/30 dark:bg-secondary/20">
                  {Array.from({ length: 18 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm transition-all duration-150"
                      style={{
                        height: `${Math.random() * micLevel}%`,
                        background: isRecording
                          ? `linear-gradient(to top, hsl(var(--primary)), hsl(var(--primary) / 0.4))`
                          : 'hsl(var(--muted-foreground) / 0.2)',
                      }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-sm glass">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                    <ScanEye className="h-3 w-3 text-primary" />
                  </div>
                  <Label className="text-xs font-medium">Face Detection</Label>
                </div>
                <Switch checked={faceToggle} onCheckedChange={setFaceToggle} />
              </div>
              {faceToggle && (
                <p className={`text-xs mt-2 flex items-center gap-1.5 ${isRecording ? 'text-success' : 'text-muted-foreground'}`}>
                  {isRecording
                    ? (
                      <>
                        <ShieldCheck className="h-3 w-3" />
                        {liveVideoSummary?.faceDetectionAvailable
                          ? `Face presence ${liveVideoSummary.presenceScore}/10, eye contact ${liveVideoSummary.eyeContactScore}/10`
                          : 'Face detector unavailable in this browser'}
                      </>
                    )
                    : 'Waiting for recording…'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3 animate-in-up">
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/30 px-3 py-2 rounded-lg">
          <AudioLines className="h-3.5 w-3.5 text-primary" />
          Per-question recording active
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2 h-10 text-sm transition-all duration-300 hover:border-primary/30" 
            onClick={() => void handleNext()}
            disabled={isUploading || isSubmittingQuestion}
          >
            <FastForward className="h-4 w-4" /> Next
          </Button>
          <Button 
            variant="destructive" 
            className="gap-2 h-10 text-sm shadow-sm transition-all duration-300" 
            onClick={() => setShowEndDialog(true)}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <CircleStop className="h-3.5 w-3.5 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <CircleStop className="h-3.5 w-3.5" /> End
              </>
            )}
          </Button>
        </div>
      </div>

      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle>End Interview?</DialogTitle>
            <DialogDescription>
              We will upload your current response and continue report generation on the loading page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndDialog(false)} disabled={isUploading}>Cancel</Button>
            <Button variant="destructive" onClick={() => void goToProcessing()} disabled={isUploading || isSubmittingQuestion}>
              {isUploading ? 'Processing…' : 'End Interview'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
