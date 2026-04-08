import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterview } from '@/contexts/InterviewContext';
import { getRandomTip, InterviewSession } from '@/lib/mock-data';
import { finalizeSessionFeedback, saveInterviewSessionToHistory } from '@/lib/api';
import { CircleCheckBig, CircleDashed, Loader2, Zap, BrainCog, Sparkles } from 'lucide-react';

const STEPS = [
  'Processing responses',
  'Analyzing answer quality',
  'Evaluating clarity and confidence',
  'Measuring coverage and structure',
  'Generating feedback report',
];

const STATUS_MESSAGES = [
  'Analyzing keyword coverage…',
  'Evaluating response clarity…',
  'Measuring answer confidence…',
  'Reviewing response structure…',
  'Finalizing insights…',
];

export default function Processing() {
  const navigate = useNavigate();
  const {
    currentSession,
    questions,
    sessionId,
    config,
    pendingFinalUpload,
    setPendingFinalUpload,
    setCurrentSession,
  } = useInterview();
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);
  const [tip, setTip] = useState(getRandomTip());
  const [finalSessionId, setFinalSessionId] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (finalSessionId || processingError) {
      return;
    }

    const interval = setInterval(() => {
      setProgress(prev => {
        const capped = Math.min(prev + Math.random() * 6 + 2, 92);
        return capped;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [finalSessionId, processingError]);

  useEffect(() => {
    setCurrentStep(Math.min(Math.floor(progress / 20), STEPS.length - 1));
  }, [progress]);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIdx(prev => (prev + 1) % STATUS_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTip(getRandomTip()), 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress >= 100 && finalSessionId) {
      const t = setTimeout(() => navigate(`/feedback/${finalSessionId}`), 1200);
      return () => clearTimeout(t);
    }
  }, [progress, finalSessionId, navigate]);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;

    async function finalizeInProcessing() {
      if (!sessionId || !config) {
        setProcessingError('Session context is missing. Please start the interview again.');
        return;
      }

      try {
        if (pendingFinalUpload) {
          try {
            await pendingFinalUpload;
          } catch (uploadError) {
            console.error('Final question upload failed:', uploadError);
          }
        }

        const analyzedSession = await finalizeSessionFeedback(sessionId);

        if (analyzedSession) {
          try {
            await saveInterviewSessionToHistory({
              config,
              overallScore: analyzedSession.feedback?.overallScore ?? 0,
              feedback: analyzedSession.feedback,
              responses: (analyzedSession.feedback?.questions || []).map((question: any) => ({
                questionId: question.questionId,
                response: question.response || '',
                score: question.score ?? 0,
                feedback: question.feedback || '',
                questionText: question.question,
              })),
            });
          } catch (historyError) {
            console.error('Failed to save interview history:', historyError);
          }
        }

        const mappedSession: InterviewSession = {
          id: analyzedSession.id,
          date: analyzedSession.createdAt,
          type: analyzedSession.config.type,
          skills: analyzedSession.config.skills,
          duration: analyzedSession.config.timeframe,
          score: analyzedSession.feedback?.overallScore ?? 0,
          readinessScore: analyzedSession.feedback?.readinessScore ?? 0,
          feedback: analyzedSession.feedback,
        };

        setCurrentSession(mappedSession);
        setPendingFinalUpload(null);
        setFinalSessionId(mappedSession.id);
        setProgress(100);
      } catch (error) {
        setProcessingError(error instanceof Error ? error.message : 'Failed to generate interview report.');
      }
    }

    void finalizeInProcessing();
  }, [config, pendingFinalUpload, sessionId, setCurrentSession, setPendingFinalUpload]);

  if (processingError) {
    return (
      <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
        <h1 className="text-xl font-bold">Report Generation Failed</h1>
        <p className="text-sm text-muted-foreground">{processingError}</p>
        <button
          className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground"
          onClick={() => navigate(currentSession ? `/feedback/${currentSession.id}` : '/dashboard')}
          type="button"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center relative">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-10 w-16 h-16 rounded-full bg-primary/[0.03] blur-xl animate-float" />
        <div className="absolute top-40 right-10 w-12 h-12 rounded-full bg-primary/[0.03] blur-xl animate-float-delayed" />
        <div className="absolute bottom-20 left-20 w-20 h-20 rounded-full bg-primary/[0.03] blur-xl animate-float-slow" />
      </div>

      <div className="space-y-3 animate-in-up relative">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center pulse-glow">
          <BrainCog className="h-7 w-7 text-primary animate-pulse" />
        </div>
        <h1 className="text-xl font-bold">Analyzing your performance…</h1>
        <p className="text-sm text-muted-foreground">This may take a moment.</p>
      </div>

      {/* Progress */}
      <div className="w-full space-y-1.5 animate-in-up stagger-1">
        <div className="relative h-2.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
          <div className="absolute inset-0 shimmer" />
        </div>
        <p className="text-xs font-semibold text-primary">{Math.round(progress)}%</p>
      </div>

      {/* Steps */}
      <div className="space-y-1.5 text-left w-full animate-in-up stagger-2">
        {STEPS.map((step, i) => (
          <div key={i} className={`flex items-center gap-2.5 p-2 rounded-lg transition-all duration-500 ${
            i === currentStep ? 'bg-accent/40 dark:bg-accent/20' : ''
          }`}>
            {i < currentStep ? (
              <CircleCheckBig className="h-4 w-4 text-success shrink-0" />
            ) : i === currentStep ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
            ) : (
              <CircleDashed className="h-4 w-4 text-muted-foreground/25 shrink-0" />
            )}
            <span className={`text-xs transition-all duration-300 ${
              i < currentStep ? 'text-success font-medium' :
              i === currentStep ? 'text-foreground font-semibold' :
              'text-muted-foreground/40'
            }`}>
              {step}
            </span>
            {i === currentStep && (
              <Sparkles className="h-3 w-3 text-primary ml-auto animate-pulse" />
            )}
          </div>
        ))}
      </div>

      {/* Status */}
      <p className="text-xs text-primary font-medium animate-pulse">
        {STATUS_MESSAGES[statusIdx]}
      </p>

      {/* Session info */}
      <p className="text-xs text-muted-foreground">
        You answered {questions.length} questions in this session.
      </p>

      {/* Tip */}
      <div className="flex items-start gap-2.5 bg-gradient-to-r from-accent/30 via-accent/10 to-transparent rounded-lg p-3 w-full animate-in-up border border-border/30">
        <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <Zap className="h-3.5 w-3.5 text-primary" />
        </div>
        <p className="text-xs text-muted-foreground text-left leading-relaxed">{tip}</p>
      </div>
    </div>
  );
}
