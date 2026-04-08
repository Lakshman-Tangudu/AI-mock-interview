import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSession, getUserInterviewSession } from '@/lib/api';
import { InterviewSession } from '@/lib/mock-data';
import { useInterview } from '@/contexts/InterviewContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileDown, Rocket, ShieldCheck, TriangleAlert, TrendingUp, Sparkles } from 'lucide-react';

export default function Feedback() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentSession } = useInterview();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      if (!id) {
        setLoading(false);
        return;
      }

      if (currentSession?.id === id) {
        setSession(currentSession);
        setLoading(false);
        return;
      }

      try {
        let detail;
        try {
          detail = await getUserInterviewSession(id);
        } catch (supabaseError) {
          console.warn('Falling back to legacy session endpoint:', supabaseError);
          detail = await getSession(id);
        }

        if (!detail.feedback) {
          setSession(null);
          return;
        }

        const mappedSession: InterviewSession = {
          id: detail.id,
          date: detail.interviewDate || detail.createdAt,
          type: detail.config?.type || 'HR',
          skills: detail.config?.skills || [],
          duration: detail.config?.timeframe || 15,
          score: detail.feedback.overallScore,
          readinessScore: detail.feedback.readinessScore,
          feedback: detail.feedback,
        };

        setSession(mappedSession);
      } catch (error) {
        console.error('Error loading session feedback:', error);
        setSession(null);
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [id, currentSession]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-muted-foreground">Loading session feedback...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-muted-foreground">Session not found.</p>
          <Button className="mt-4" onClick={() => navigate('/')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const { feedback } = session;

  const categoryData = [
    { name: 'Clarity', score: feedback.verbal.clarity.score },
    { name: 'Confidence', score: feedback.verbal.confidence.score },
    { name: 'Fluency', score: feedback.verbal.fluency.score },
    { name: 'Filler Words', score: feedback.verbal.fillerWords.score },
    { name: 'Focus', score: feedback.nonVerbal.eyeContact.score },
    { name: 'Structure', score: feedback.nonVerbal.facialExpressions.score },
    { name: 'Depth', score: feedback.nonVerbal.posture.score },
    ...(feedback.nonVerbal.vocalTone ? [{ name: 'Vocal Tone', score: feedback.nonVerbal.vocalTone.score }] : []),
  ];

  const questionData = feedback.questions.map((q, i) => ({
    name: `Q${i + 1}`,
    score: q.score,
  }));

  const handleDownload = () => {
    const lines = [
      `Interview Report — ${new Date(session.date).toLocaleDateString()}`,
      `Type: ${session.type}`,
      `Overall Score: ${feedback.overallScore}/100`,
      `Readiness: ${feedback.readinessScore}%`,
      `Vocal Tone: ${feedback.nonVerbal.vocalTone?.score ?? 'N/A'}/10`,
      `Visual Presence: ${feedback.nonVerbal.visualPresence?.score ?? 'N/A'}/10`,
      `Emotional Composure: ${feedback.nonVerbal.emotionalComposure?.score ?? 'N/A'}/10`,
      `\n${feedback.summaryMessage}`,
      `\nStrengths: ${feedback.strengths.join(', ')}`,
      `Improvements: ${feedback.improvements.join(', ')}`,
      ...feedback.questions.map((q, i) => {
        const referenceTips = (q.reference?.tips || []).join('; ') || 'N/A';
        const referenceAnswer = q.reference?.answer || 'N/A';
        const transcriptionStatus = q.transcription?.status || 'unknown';

        return `\nQ${i + 1}: ${q.question}` +
          `\nScore: ${q.score}/10 — ${q.feedback}` +
          `\nTranscription Status: ${transcriptionStatus}` +
          `\nResponse: ${q.response || 'Transcript unavailable for this recording.'}` +
          `\nMatched Keywords: ${(q.matchedKeywords || []).join(', ') || 'None'}` +
          `\nCoverage: ${Math.round((q.coverage || 0) * 100)}%` +
            `\nReference Tips: ${referenceTips}` +
            `\nReference Answer: ${referenceAnswer}`;
      }),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-report-${session.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ScoreRing = ({ score, max, label, gradient }: { score: number; max: number; label: string; gradient?: boolean }) => {
    const pct = (score / max) * 100;
    return (
      <div className="text-center space-y-2">
        <div className="relative h-28 w-28 mx-auto">
          <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--secondary))" strokeWidth="5" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke={gradient ? "url(#scoreGrad)" : "hsl(var(--primary))"}
              strokeWidth="5"
              strokeDasharray={`${pct * 2.64} ${264 - pct * 2.64}`}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
            {gradient && (
              <defs>
                <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(260 70% 65%)" />
                </linearGradient>
              </defs>
            )}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-2xl font-bold ${gradient ? 'gradient-text' : ''}`}>
              {score}<span className="text-xs text-muted-foreground font-normal">/{max}</span>
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
      </div>
    );
  };

  const MetricRow = ({ label, score, feedback: fb }: { label: string; score: number; feedback: string }) => (
    <div className="space-y-1.5 p-2.5 rounded-lg hover:bg-accent/20 dark:hover:bg-accent/10 transition-colors duration-200">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-xs font-bold text-primary">{score}/10</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-1000 ease-out"
          style={{ width: `${score * 10}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{fb}</p>
    </div>
  );

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '0.5rem',
    color: 'hsl(var(--foreground))',
    boxShadow: '0 8px 30px -8px hsl(var(--primary) / 0.15)',
    fontSize: '11px',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-2 animate-in-up">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <h1 className="text-xl font-bold">Interview Feedback</h1>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in-up stagger-1">
        <Card className="border-border/40 shadow-md glass card-hover">
          <CardContent className="p-5 flex flex-col items-center">
            <ScoreRing score={feedback.overallScore} max={100} label="Overall Score" gradient />
          </CardContent>
        </Card>
        <Card className="border-border/40 shadow-md glass card-hover">
          <CardContent className="p-5 flex flex-col items-center">
            <ScoreRing score={feedback.readinessScore} max={100} label="Readiness Score" />
          </CardContent>
        </Card>
        <Card className="border-border/40 shadow-md glass card-hover">
          <CardContent className="p-5 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold text-xs">Summary</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{feedback.summaryMessage}</p>
          </CardContent>
        </Card>
      </div>

      {/* Strengths & Improvements */}
      <div className="grid md:grid-cols-2 gap-3 animate-in-up stagger-2">
        <Card className="border-border/40 shadow-md glass card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-md bg-success/15 flex items-center justify-center">
                <ShieldCheck className="h-3 w-3 text-success" />
              </div>
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-1.5">
              {feedback.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs p-1.5 rounded-md hover:bg-success/5 transition-colors duration-200">
                  <span className="text-success mt-0.5 text-[10px]">●</span> {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="border-border/40 shadow-md glass card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-md bg-warning/15 flex items-center justify-center">
                <TriangleAlert className="h-3 w-3 text-warning" />
              </div>
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-1.5">
              {feedback.improvements.map((s, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs p-1.5 rounded-md hover:bg-warning/5 transition-colors duration-200">
                  <span className="text-warning mt-0.5 text-[10px]">●</span> {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Response Analysis */}
      <Card className="border-border/40 shadow-md glass animate-in-up stagger-3">
        <CardHeader className="pb-2"><CardTitle className="text-xs">Response Analysis</CardTitle></CardHeader>
        <CardContent className="space-y-0.5">
          <MetricRow label="Clarity" score={feedback.verbal.clarity.score} feedback={feedback.verbal.clarity.feedback} />
          <MetricRow label="Confidence" score={feedback.verbal.confidence.score} feedback={feedback.verbal.confidence.feedback} />
          <MetricRow label="Fluency" score={feedback.verbal.fluency.score} feedback={feedback.verbal.fluency.feedback} />
          <MetricRow label="Filler Words" score={feedback.verbal.fillerWords.score} feedback={feedback.verbal.fillerWords.feedback} />
        </CardContent>
      </Card>

      {/* Delivery & Depth */}
      <Card className="border-border/40 shadow-md glass animate-in-up stagger-4">
        <CardHeader className="pb-2"><CardTitle className="text-xs">Delivery & Depth</CardTitle></CardHeader>
        <CardContent className="space-y-0.5">
          <MetricRow label="Focus" score={feedback.nonVerbal.eyeContact.score} feedback={feedback.nonVerbal.eyeContact.feedback} />
          <MetricRow label="Structure" score={feedback.nonVerbal.facialExpressions.score} feedback={feedback.nonVerbal.facialExpressions.feedback} />
          <MetricRow label="Depth" score={feedback.nonVerbal.posture.score} feedback={feedback.nonVerbal.posture.feedback} />
          {feedback.nonVerbal.speakingRate && (
            <MetricRow label="Speaking Rate" score={feedback.nonVerbal.speakingRate.score} feedback={feedback.nonVerbal.speakingRate.feedback} />
          )}
          {feedback.nonVerbal.vocalTone && (
            <MetricRow label="Voice Analysis" score={feedback.nonVerbal.vocalTone.score} feedback={feedback.nonVerbal.vocalTone.feedback} />
          )}
          {feedback.nonVerbal.visualPresence && (
            <MetricRow label="Visual Presence" score={feedback.nonVerbal.visualPresence.score} feedback={feedback.nonVerbal.visualPresence.feedback} />
          )}
          {feedback.nonVerbal.emotionalComposure && (
            <MetricRow label="Emotional Composure" score={feedback.nonVerbal.emotionalComposure.score} feedback={feedback.nonVerbal.emotionalComposure.feedback} />
          )}
        </CardContent>
      </Card>

      {/* Question-wise */}
      <Card className="border-border/40 shadow-md glass animate-in-up stagger-5">
        <CardHeader className="pb-2"><CardTitle className="text-xs">Question-wise Feedback</CardTitle></CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {feedback.questions.map((q, i) => (
              <AccordionItem key={i} value={`q-${i}`} className="border-border/30">
                <AccordionTrigger className="text-xs text-left hover:no-underline py-2.5">
                  <div className="flex items-center gap-2">
                    <Badge variant={q.answered ? 'default' : 'destructive'} className="shrink-0 text-[10px] px-1.5 py-0">{q.score}/10</Badge>
                    <span className="line-clamp-1">{q.question}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-xs pb-3">
                  {q.answered ? (
                    <>
                      <p className="text-muted-foreground">{q.feedback}</p>

                      {q.reference && (
                        <div className="bg-accent/20 rounded-lg p-3 border border-border/30 space-y-1.5">
                          {q.reference.tips && q.reference.tips.length > 0 && (
                            <div>
                              <p className="text-[11px] text-muted-foreground mb-1">Reference tips:</p>
                              <ul className="space-y-1">
                                {q.reference.tips.slice(0, 2).map((tip, tipIndex) => (
                                  <li key={tipIndex} className="text-[11px] text-muted-foreground">- {tip}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {q.reference.answer && (
                            <div>
                              <p className="text-[11px] text-muted-foreground mb-1">Reference answer:</p>
                              <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{q.reference.answer}</p>
                            </div>
                          )}
                        </div>
                      )}

                      
                      <div>
                        <p className="font-medium mb-1.5">Expected Keywords:</p>
                        <div className="flex flex-wrap gap-1">
                          {q.expectedKeywords.map(k => <Badge key={k} variant="outline" className="bg-accent/20 text-[10px] px-1.5">{k}</Badge>)}
                        </div>
                      </div>
                        {q.matchedKeywords && q.matchedKeywords.length > 0 && (
                          <div>
                            <p className="font-medium mb-1.5">Matched Keywords:</p>
                            <div className="flex flex-wrap gap-1">
                              {q.matchedKeywords.map(k => <Badge key={k} variant="secondary" className="text-[10px] px-1.5">{k}</Badge>)}
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="bg-accent/20 rounded p-1.5">
                            <p className="font-medium">Keyword Coverage</p>
                            <p className="text-muted-foreground">{Math.round((q.coverage || 0) * 100)}%</p>
                          </div>
                          {q.delivery && (
                            <>
                              <div className="bg-accent/20 rounded p-1.5">
                                <p className="font-medium">Speaking Rate</p>
                                <p className="text-muted-foreground">{q.delivery.speakingRateWPM} WPM</p>
                              </div>
                              <div className="bg-accent/20 rounded p-1.5">
                                <p className="font-medium">Filler Words</p>
                                <p className="text-muted-foreground">{q.delivery.fillerWordCount} ({q.delivery.fillerWordDensity.toFixed(1)}%)</p>
                              </div>
                              <div className="bg-accent/20 rounded p-1.5">
                                <p className="font-medium">Word Count</p>
                                <p className="text-muted-foreground">{q.wordCount} words</p>
                              </div>
                            </>
                          )}
                        </div>
                    </>
                  ) : (
                    <p className="text-destructive">No response recorded.</p>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-3 animate-in-up">
        <Card className="border-border/40 shadow-md glass">
          <CardHeader className="pb-2"><CardTitle className="text-xs">Category Scores</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="name" className="text-xs fill-muted-foreground" angle={-30} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 10]} className="text-xs fill-muted-foreground" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40 shadow-md glass">
          <CardHeader className="pb-2"><CardTitle className="text-xs">Question Scores</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={questionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="name" className="text-xs fill-muted-foreground" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 10]} className="text-xs fill-muted-foreground" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2.5 animate-in-up">
        <Button size="lg" variant="outline" className="gap-2 flex-1 h-10 text-sm transition-all duration-300 hover:border-primary/30" onClick={handleDownload}>
          <FileDown className="h-4 w-4" /> Download Report
        </Button>
        <Button size="lg" className="gap-2 flex-1 h-10 text-sm btn-glow shadow-md shadow-primary/15 transition-all duration-300" onClick={() => navigate('/')}>
          <Rocket className="h-4 w-4" /> Back to Home
        </Button>
      </div>
    </div>
  );
}
