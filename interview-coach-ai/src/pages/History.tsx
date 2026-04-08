import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserInterviewHistory, InterviewSessionHistory } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SquareArrowOutUpRight, ScrollText } from 'lucide-react';

export default function History() {
  const navigate = useNavigate();
  const [dateFilter, setDateFilter] = useState('all');
  const [sessions, setSessions] = useState<InterviewSessionHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSessions() {
      try {
        const data = await getUserInterviewHistory();
        setSessions(data);
      } catch (error) {
        console.error('Error loading sessions:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSessions();
  }, []);

  const completedSessions = sessions.filter(s => s.overallScore > 0);

  const filtered = completedSessions.filter(s => {
    if (dateFilter !== 'all') {
      const days = dateFilter === '7' ? 7 : 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      if (new Date(s.interviewDate) < cutoff) return false;
    }
    return true;
  });

  const getSessionType = (session: InterviewSessionHistory) => session.config?.type || '—';
  const getSessionSkills = (session: InterviewSessionHistory) => session.config?.skills || [];
  const getSessionDuration = (session: InterviewSessionHistory) => session.config?.timeframe || 15;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="animate-in-up">
        <h1 className="text-2xl font-bold tracking-tight">History</h1>
        <p className="text-muted-foreground mt-1 text-sm">Review your past interview sessions and performance.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 animate-in-up stagger-1">
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-36 h-9 text-sm bg-secondary/50 dark:bg-secondary/30 border-border/50"><SelectValue placeholder="Date" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="7">Last 7 Days</SelectItem>
            <SelectItem value="30">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-border/40 shadow-md glass animate-in-up stagger-2">
          <CardContent className="p-10 text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-accent to-primary/10 flex items-center justify-center mb-4 pulse-glow">
              <ScrollText className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1.5">No Interviews Found</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              {loading ? 'Loading interview history...' : completedSessions.length === 0 ? "You haven't completed any interviews yet." : 'No interviews match your filters.'}
            </p>
            <Button onClick={() => navigate('/setup')} className="gap-2 btn-glow shadow-md shadow-primary/15 text-sm">
              <SquareArrowOutUpRight className="h-4 w-4" /> Start Interview
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/40 shadow-md glass animate-in-up stagger-2 overflow-hidden">
          <CardContent className="p-0">
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
                {filtered.map(s => (
                  <TableRow key={s.id} className="border-border/25 transition-all duration-200 hover:bg-accent/15 dark:hover:bg-accent/10 group">
                    <TableCell className="text-sm">{new Date(s.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell><Badge variant="secondary" className="font-medium text-xs">{getSessionType(s)}</Badge></TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate text-sm">{getSessionSkills(s).length > 0 ? getSessionSkills(s).join(', ') : '—'}</TableCell>
                    <TableCell className="text-sm">{getSessionDuration(s)} min</TableCell>
                    <TableCell><span className="font-bold text-primary text-sm">{s.overallScore}</span><span className="text-muted-foreground text-xs">/100</span></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/feedback/${s.id}`)} className="text-primary hover:text-primary hover:bg-primary/10 opacity-60 group-hover:opacity-100 transition-opacity duration-200 text-xs h-7">View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
