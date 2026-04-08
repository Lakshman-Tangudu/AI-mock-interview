import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getRandomTip } from '@/lib/mock-data';
import { getSessions, SessionSummary } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Rocket, TrendingUp, Crosshair, Trophy, ChartSpline, Flame, Sparkles, ArrowRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useState, useEffect } from 'react';

function AnimatedCounter({ value, suffix = '' }: { value: number | string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const numVal = typeof value === 'number' ? value : parseInt(value) || 0;

  useEffect(() => {
    const duration = 1000;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * numVal));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [numVal]);

  return <>{display}{suffix}</>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSessions() {
      try {
        const data = await getSessions();
        setSessions(data);
      } catch (error) {
        console.error('Error loading sessions:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSessions();
  }, []);

  const completedSessions = sessions.filter(s => s.score > 0);
  const hasData = completedSessions.length > 0;

  const lastScore = hasData ? completedSessions[0].score : null;
  const readiness = hasData ? completedSessions[0].readinessScore : null;
  const bestScore = hasData ? Math.max(...completedSessions.map(s => s.score)) : null;
  const totalInterviews = completedSessions.length;

  const chartData = [...completedSessions].reverse().map((s, i) => ({
    name: `#${i + 1}`,
    score: s.score,
  }));

  const recent = completedSessions.slice(0, 5);
  const tip = getRandomTip();

  const stats = [
    { label: 'Last Score', value: lastScore, suffix: '/100', icon: ChartSpline, empty: '—', gradient: 'from-primary/15 to-primary/5' },
    { label: 'Readiness', value: readiness, suffix: '%', icon: Crosshair, empty: '—', gradient: 'from-success/15 to-success/5' },
    { label: 'Interviews', value: totalInterviews, suffix: '', icon: TrendingUp, empty: '0', gradient: 'from-warning/15 to-warning/5' },
    { label: 'Best Score', value: bestScore, suffix: '/100', icon: Trophy, empty: '—', gradient: 'from-accent-foreground/15 to-accent/5' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden p-6 md:p-8 animate-in-up">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-primary/4 to-accent/10 dark:from-primary/10 dark:via-primary/5 dark:to-accent/8" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-4 right-12 w-28 h-28 rounded-full bg-primary/5 blur-2xl animate-float" />
          <div className="absolute bottom-2 left-8 w-20 h-20 rounded-full bg-primary/5 blur-2xl animate-float-delayed" />
        </div>
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">AI Interview Coach</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Welcome back, {user?.name || 'User'} 👋
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Track your progress and start a new mock interview.</p>
          </div>
          <Button size="lg" className="gap-2 shadow-md shadow-primary/15 btn-glow h-11 px-6 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20" onClick={() => navigate('/setup')}>
            <Rocket className="h-4 w-4" /> Start Interview
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, idx) => (
          <Card key={s.label} className={`border-0 shadow-sm card-hover glass overflow-hidden animate-in-up stagger-${idx + 1}`}>
            <CardContent className="p-4 relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} pointer-events-none`} />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{s.label}</span>
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <s.icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight">
                  {hasData && s.value != null ? <AnimatedCounter value={s.value} suffix={s.suffix} /> : s.empty}
                </p>
                {s.label === 'Readiness' && readiness && (
                  <div className="mt-2.5 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-success to-success/70 rounded-full transition-all duration-1000 ease-out" style={{ width: `${readiness}%` }} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!hasData ? (
        <Card className="border-0 shadow-md glass animate-in-up">
          <CardContent className="p-10 text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/15 to-accent flex items-center justify-center mb-5 pulse-glow">
              <Rocket className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Interviews Yet</h3>
            <p className="text-muted-foreground mb-5 max-w-sm mx-auto text-sm">
              {loading ? 'Loading interview history...' : 'Start your first mock interview to see your performance data here.'}
            </p>
            <Button onClick={() => navigate('/setup')} className="btn-glow shadow-md shadow-primary/15 h-10 px-6 gap-2">
              Start Your First Interview <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Chart */}
          <Card className="border-0 shadow-md glass animate-in-up">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Performance Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="scoreArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="name" className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                        color: 'hsl(var(--foreground))',
                        boxShadow: '0 8px 30px -8px hsl(var(--primary) / 0.15)',
                        fontSize: '12px',
                      }}
                    />
                    <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#scoreArea)" dot={{ fill: 'hsl(var(--primary))', r: 4, strokeWidth: 2, stroke: 'hsl(var(--card))' }} activeDot={{ r: 6, strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent */}
          <Card className="border-0 shadow-md glass animate-in-up">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm">Recent Interviews</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/history')} className="text-primary hover:text-primary text-xs h-8">View All</Button>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40 hover:bg-transparent">
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Skills</TableHead>
                    <TableHead className="text-xs">Duration</TableHead>
                    <TableHead className="text-xs">Score</TableHead>
                    <TableHead className="text-xs"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map(s => (
                    <TableRow key={s.id} className="border-border/30 transition-colors duration-200 hover:bg-accent/20">
                      <TableCell className="text-sm">{new Date(s.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell><Badge variant="secondary" className="font-medium text-xs">{s.type}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{s.skills.length > 0 ? s.skills.join(', ') : '—'}</TableCell>
                      <TableCell className="text-sm">{s.duration} min</TableCell>
                      <TableCell><span className="font-bold text-primary text-sm">{s.score}</span><span className="text-muted-foreground text-xs">/100</span></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/feedback/${s.id}`)} className="text-primary hover:text-primary hover:bg-primary/10 text-xs h-7">View</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Tip */}
      <div className="flex items-start gap-3 rounded-xl p-4 bg-gradient-to-r from-accent/30 via-accent/10 to-transparent border border-border/30 animate-in-up">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Flame className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-xs font-semibold mb-0.5 text-foreground">Quick Tip</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{tip}</p>
        </div>
      </div>
    </div>
  );
}
