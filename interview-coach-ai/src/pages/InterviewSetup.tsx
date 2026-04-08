import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterview } from '@/contexts/InterviewContext';
import { AVAILABLE_SKILLS, InterviewConfig, getSettings } from '@/lib/mock-data';
import { fetchQuestions, getAvailableSkills } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageSquareHeart, BrainCircuit, ChevronRight, ChevronLeft, Search, CircleCheckBig, PenLine } from 'lucide-react';

export default function InterviewSetup() {
  const navigate = useNavigate();
  const { setConfig, setQuestions, setSessionId } = useInterview();
  const settings = getSettings();

  const [step, setStep] = useState(1);
  const [type, setType] = useState<'HR' | 'Technical' | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>(settings.defaultDifficulty);
  const [timeframe, setTimeframe] = useState<number>(settings.defaultTimeframe);
  const [timeOption, setTimeOption] = useState<'15' | '30' | 'custom'>(
    settings.defaultTimeframe === 15 ? '15' : settings.defaultTimeframe === 30 ? '30' : 'custom'
  );
  const [customTime, setCustomTime] = useState('20');
  const [skillSearch, setSkillSearch] = useState('');
  const [availableSkills, setAvailableSkills] = useState<string[]>(AVAILABLE_SKILLS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSkills() {
      try {
        const skillsFromApi = await getAvailableSkills();
        if (skillsFromApi.length > 0) {
          setAvailableSkills(skillsFromApi);
        }
      } catch (err) {
        console.error('Failed to load skills from API:', err);
      }
    }

    loadSkills();
  }, []);

  const filteredSkills = availableSkills.filter(s =>
    s.toLowerCase().includes(skillSearch.toLowerCase())
  );

  const toggleSkill = (s: string) => {
    setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const canNext = () => {
    if (step === 1) return !!type;
    if (step === 2) {
      if (type === 'Technical') return skills.length > 0;
      return true;
    }
    return true;
  };

  const handleContinue = async () => {
    const tf = timeOption === 'custom' ? parseInt(customTime) || 15 : parseInt(timeOption);
    const config: InterviewConfig = {
      type: type!,
      skills: type === 'Technical' ? skills : [],
      difficulty,
      timeframe: tf,
    };

    try {
      setLoading(true);
      setError(null);

      const result = await fetchQuestions(config);
      setConfig(config);
      setQuestions(result.questions);
      setSessionId(result.sessionId);
      navigate('/system-check');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start interview');
      console.error('Error starting interview:', err);
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ['Type', 'Details', 'Review'];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 animate-in-up">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-500 ${
                s < step ? 'bg-primary text-primary-foreground shadow-sm' :
                s === step ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25' :
                'bg-secondary text-muted-foreground'
              }`}>
                {s < step ? <CircleCheckBig className="h-3.5 w-3.5" /> : s}
              </div>
              <span className={`text-[10px] font-medium ${s === step ? 'text-primary' : 'text-muted-foreground'}`}>
                {stepLabels[s - 1]}
              </span>
            </div>
            {s < 3 && (
              <div className="w-10 h-0.5 rounded-full overflow-hidden bg-secondary mb-4">
                <div className={`h-full bg-primary rounded-full transition-all duration-700 ease-out ${s < step ? 'w-full' : 'w-0'}`} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-4 animate-in-up">
          <div>
            <h2 className="text-xl font-bold">Choose Interview Type</h2>
            <p className="text-muted-foreground mt-1 text-sm">Select the type of interview you want to practice.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'HR' as const, label: 'HR Interview', desc: 'Behavioral and situational questions', icon: MessageSquareHeart },
              { value: 'Technical' as const, label: 'Technical Interview', desc: 'Skill-based technical questions', icon: BrainCircuit },
            ].map(opt => (
              <Card
                key={opt.value}
                className={`cursor-pointer transition-all duration-300 card-hover ${
                  type === opt.value
                    ? 'border-primary/60 bg-accent/40 shadow-md shadow-primary/10 dark:border-primary/40 dark:bg-accent/30'
                    : 'border-border/50 hover:border-primary/30'
                }`}
                onClick={() => setType(opt.value)}
              >
                <CardContent className="p-5 text-center space-y-3">
                  <div className={`mx-auto h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    type === opt.value
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                      : 'bg-secondary dark:bg-secondary'
                  }`}>
                    <opt.icon className={`h-5 w-5 ${type === opt.value ? 'text-primary-foreground' : 'text-primary'}`} />
                  </div>
                  <h3 className="font-semibold text-sm">{opt.label}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{opt.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-5 animate-in-up">
          <div>
            <h2 className="text-xl font-bold">
              {type === 'HR' ? 'HR Interview Setup' : 'Technical Interview Setup'}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">Configure your interview settings.</p>
          </div>

          {type === 'Technical' && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Select Skills</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 h-10 bg-secondary/50 border-border/60 focus:bg-background transition-all duration-200"
                  placeholder="Search skills..."
                  value={skillSearch}
                  onChange={e => setSkillSearch(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-2.5 rounded-xl bg-secondary/30 dark:bg-secondary/20 border border-border/30">
                {filteredSkills.map(s => (
                  <Badge
                    key={s}
                    variant={skills.includes(s) ? 'default' : 'outline'}
                    className={`cursor-pointer transition-all duration-200 text-xs py-1 px-2.5 ${
                      skills.includes(s)
                        ? 'shadow-sm'
                        : 'hover:bg-accent hover:border-primary/30 bg-background/50 dark:bg-background/30'
                    }`}
                    onClick={() => toggleSkill(s)}
                  >
                    {skills.includes(s) && <CircleCheckBig className="h-2.5 w-2.5 mr-1" />}
                    {s}
                  </Badge>
                ))}
              </div>
              {skills.length > 0 && (
                <p className="text-xs text-primary font-medium">{skills.length} skill(s) selected</p>
              )}
            </div>
          )}

          <div className="space-y-2.5">
            <h3 className="font-semibold text-sm">Difficulty Level</h3>
            <div className="flex gap-2">
              {(['Easy', 'Medium', 'Hard'] as const).map(d => (
                <Button
                  key={d}
                  variant={difficulty === d ? 'default' : 'outline'}
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 h-10 text-sm transition-all duration-300 ${
                    difficulty === d ? 'shadow-sm' : 'hover:border-primary/30 bg-background/50 dark:bg-secondary/50'
                  }`}
                >
                  {d}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <h3 className="font-semibold text-sm">Timeframe</h3>
            <div className="flex gap-2">
              {[
                { value: '15', label: '15 min' },
                { value: '30', label: '30 min' },
                { value: 'custom', label: 'Custom' },
              ].map(t => (
                <Button
                  key={t.value}
                  variant={timeOption === t.value ? 'default' : 'outline'}
                  onClick={() => {
                    setTimeOption(t.value as any);
                    if (t.value !== 'custom') setTimeframe(parseInt(t.value));
                  }}
                  className={`flex-1 h-10 text-sm transition-all duration-300 ${
                    timeOption === t.value ? 'shadow-sm' : 'hover:border-primary/30 bg-background/50 dark:bg-secondary/50'
                  }`}
                >
                  {t.label}
                </Button>
              ))}
            </div>
            {timeOption === 'custom' && (
              <Input
                type="number"
                min={5}
                max={120}
                value={customTime}
                onChange={e => {
                  setCustomTime(e.target.value);
                  setTimeframe(parseInt(e.target.value) || 15);
                }}
                placeholder="Enter minutes"
                className="h-10 bg-secondary/50 border-border/60 focus:bg-background transition-all duration-200"
              />
            )}
          </div>
        </div>
      )}

      {/* Step 3 — Review */}
      {step === 3 && (
        <div className="space-y-5 animate-in-up">
          <div>
            <h2 className="text-xl font-bold">Review & Confirm</h2>
            <p className="text-muted-foreground mt-1 text-sm">Verify your selections before starting.</p>
          </div>
          <Card className="border-border/40 shadow-md glass">
            <CardContent className="p-5 space-y-0 divide-y divide-border/40">
              <div className="flex justify-between items-center py-3.5 first:pt-0">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Interview Type</p>
                  <p className="font-semibold mt-0.5">{type}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-primary hover:text-primary hover:bg-primary/10 text-xs h-7"><PenLine className="h-3 w-3 mr-1" /> Edit</Button>
              </div>
              {type === 'Technical' && (
                <div className="flex justify-between items-start py-3.5">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Skills</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {skills.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="text-primary hover:text-primary hover:bg-primary/10 text-xs h-7"><PenLine className="h-3 w-3 mr-1" /> Edit</Button>
                </div>
              )}
              <div className="flex justify-between items-center py-3.5">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Difficulty</p>
                  <p className="font-semibold mt-0.5">{difficulty}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="text-primary hover:text-primary hover:bg-primary/10 text-xs h-7"><PenLine className="h-3 w-3 mr-1" /> Edit</Button>
              </div>
              <div className="flex justify-between items-center py-3.5 last:pb-0">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Timeframe</p>
                  <p className="font-semibold mt-0.5">{timeOption === 'custom' ? customTime : timeOption} minutes</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="text-primary hover:text-primary hover:bg-primary/10 text-xs h-7"><PenLine className="h-3 w-3 mr-1" /> Edit</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <div className="flex justify-between pt-2">
        {step > 1 ? (
          <Button variant="outline" onClick={() => setStep(step - 1)} className="h-10 transition-all duration-300 hover:border-primary/30 bg-background/50 dark:bg-secondary/50">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        ) : <div />}
        {step < 3 ? (
          <Button disabled={!canNext()} onClick={() => setStep(step + 1)} className="h-10 btn-glow shadow-sm transition-all duration-300">
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleContinue} disabled={loading} className="h-10 btn-glow shadow-md shadow-primary/15 transition-all duration-300">
            {loading ? 'Starting...' : 'Continue to System Check'} <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
