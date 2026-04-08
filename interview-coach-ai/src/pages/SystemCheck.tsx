import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { mediaCapture } from '@/lib/mediaCapture';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Video, AudioLines, ShieldCheck, Loader2, Zap, WifiHigh } from 'lucide-react';

export default function SystemCheck() {
  const navigate = useNavigate();
  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [depProgress, setDepProgress] = useState(0);
  const [depReady, setDepReady] = useState(false);
  const [depMessage, setDepMessage] = useState('Loading interview engine…');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    async function requestMediaPermissions() {
      try {
        const { camera, microphone } = await mediaCapture.requestPermissions();
        setCameraReady(camera);
        setMicReady(microphone);
        if (!camera || !microphone) {
          setPermissionError('Camera and/or microphone access was denied. Please check your browser permissions.');
        }
      } catch (error) {
        setPermissionError(error instanceof Error ? error.message : 'Failed to access media devices');
        setCameraReady(false);
        setMicReady(false);
      }
    }

    requestMediaPermissions();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setMicLevel(Math.random() * 80 + 10);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const messages = ['Loading interview engine…', 'Preparing analysis tools…', 'Loading speech models…', 'Finalizing setup…'];
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (progress >= 100) {
        progress = 100;
        setDepReady(true);
        clearInterval(interval);
      }
      setDepProgress(Math.min(progress, 100));
      const idx = Math.min(Math.floor(progress / 25), messages.length - 1);
      setDepMessage(messages[idx]);
    }, 600);
    return () => clearInterval(interval);
  }, []);

  const allReady = cameraReady && micReady && depReady;

  const handleStart = useCallback(() => {
    setCountdown(3);
  }, []);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      navigate('/interview');
      return;
    }
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, navigate]);

  const StatusIcon = ({ ready }: { ready: boolean }) =>
    ready ? <ShieldCheck className="h-4 w-4 text-success" /> : <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;

  if (countdown !== null && countdown > 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="h-32 w-32 mx-auto rounded-full bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center pulse-glow">
            <span className="text-6xl font-bold gradient-text animate-count-pulse" key={countdown} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {countdown}
            </span>
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Starting interview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4 relative">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-20 -right-16 w-32 h-32 rounded-full bg-primary/[0.03] blur-2xl animate-float" />
        <div className="absolute bottom-20 -left-16 w-28 h-28 rounded-full bg-primary/[0.03] blur-2xl animate-float-delayed" />
      </div>

      <div className="animate-in-up">
        <h1 className="text-xl font-bold">System Check</h1>
        <p className="text-muted-foreground mt-1 text-sm">Preparing your interview environment.</p>
        {permissionError && (
          <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
            {permissionError}
          </div>
        )}
      </div>

      {/* Camera */}
      <Card className="border-border/40 shadow-sm glass card-hover animate-in-up stagger-1">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Video className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="font-semibold text-sm">Camera</span>
            </div>
            <StatusIcon ready={cameraReady} />
          </div>
          <div className="aspect-video bg-gradient-to-br from-secondary to-muted rounded-lg flex items-center justify-center overflow-hidden border border-border/40">
            {cameraReady ? (
              <div className="w-full h-full flex items-center justify-center bg-black">
                <p className="text-xs text-muted-foreground">Camera Ready</p>
              </div>
            ) : (
              <div className="shimmer w-full h-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <p className="text-xs mt-2 text-muted-foreground">{cameraReady ? '✓ Camera ready' : 'Detecting camera…'}</p>
        </CardContent>
      </Card>

      {/* Mic */}
      <Card className="border-border/40 shadow-sm glass card-hover animate-in-up stagger-2">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <AudioLines className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="font-semibold text-sm">Microphone</span>
            </div>
            <StatusIcon ready={micReady} />
          </div>
          <div className="flex gap-0.5 h-8 items-end p-1.5 rounded-lg bg-secondary/30 dark:bg-secondary/20">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm transition-all duration-150"
                style={{
                  height: micReady ? `${Math.random() * micLevel}%` : '10%',
                  opacity: micReady ? 0.75 : 0.15,
                  background: micReady
                    ? `linear-gradient(to top, hsl(var(--primary)), hsl(var(--primary) / 0.4))`
                    : 'hsl(var(--muted-foreground))',
                }}
              />
            ))}
          </div>
          <p className="text-xs mt-2 text-muted-foreground">{micReady ? '✓ Microphone ready' : 'Detecting microphone…'}</p>
        </CardContent>
      </Card>

      {/* Dependencies */}
      <Card className="border-border/40 shadow-sm glass card-hover animate-in-up stagger-3">
        <CardContent className="p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <WifiHigh className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="font-semibold text-sm">Dependencies</span>
            </div>
            <StatusIcon ready={depReady} />
          </div>
          <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500 ease-out"
              style={{ width: `${depProgress}%` }}
            />
            {!depReady && <div className="absolute inset-0 shimmer" />}
          </div>
          <p className="text-xs text-muted-foreground">{depMessage} ({Math.round(depProgress)}%)</p>
        </CardContent>
      </Card>

      {/* Tips */}
      <div className="flex items-start gap-3 rounded-xl p-3.5 bg-gradient-to-r from-accent/30 via-accent/10 to-transparent border border-border/30 animate-in-up stagger-4">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Zap className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="space-y-0.5">
          <p className="text-xs font-semibold">Environment Tips</p>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            <li>• Sit in a well-lit environment.</li>
            <li>• Maintain eye contact with the camera.</li>
            <li>• Ensure minimal background noise.</li>
          </ul>
        </div>
      </div>

      <Button
        size="lg"
        className={`w-full h-11 text-sm transition-all duration-300 ${
          allReady ? 'btn-glow shadow-md shadow-primary/15' : ''
        }`}
        disabled={!allReady}
        onClick={handleStart}
      >
        {allReady ? 'Start Interview' : 'Waiting for system checks…'}
      </Button>
    </div>
  );
}
