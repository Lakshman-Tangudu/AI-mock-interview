import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getSettings, saveSettings, AppSettings } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Video, AudioLines, ShieldCheck, LogOut, SaveAll, RotateCw, SunMedium, MoonStar, UserRound, Laptop2, SlidersHorizontal, Paintbrush, KeyRound, Eye, EyeOff } from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const { user, updateName, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(user?.name || '');
  const [settings, setSettingsState] = useState<AppSettings>(getSettings());
  const [cameraOk, setCameraOk] = useState(true);
  const [micOk, setMicOk] = useState(true);
  const [micLevel, setMicLevel] = useState(0);
  const [saved, setSaved] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSaved, setPwSaved] = useState(false);

  const handleChangePassword = () => {
    setPwError('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError('All fields are required.');
      return;
    }
    if (newPassword.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    setPwSaved(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPwSaved(false), 2000);
  };

  useEffect(() => {
    const interval = setInterval(() => setMicLevel(Math.random() * 70 + 20), 200);
    return () => clearInterval(interval);
  }, []);

  const handleSaveProfile = () => {
    if (name.trim()) {
      updateName(name.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const updateSetting = (key: keyof AppSettings, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettingsState(updated);
    saveSettings(updated);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SectionIcon = ({ icon: Icon }: { icon: any }) => (
    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
      <Icon className="h-3.5 w-3.5 text-primary" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold tracking-tight animate-in-up">Settings</h1>

      {/* Profile */}
      <Card className="border-border/40 shadow-sm glass card-hover animate-in-up stagger-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <SectionIcon icon={UserRound} /> Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="h-9 bg-secondary/50 dark:bg-secondary/30 border-border/60 focus:bg-background transition-all duration-200" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Email</Label>
            <Input value={user?.email || ''} disabled className="bg-muted/50 h-9 text-muted-foreground" />
          </div>
          <Button size="sm" onClick={handleSaveProfile} className={`gap-1.5 h-8 text-xs transition-all duration-300 ${saved ? 'bg-success hover:bg-success' : 'btn-glow shadow-sm shadow-primary/10'}`}>
            {saved ? <ShieldCheck className="h-3.5 w-3.5" /> : <SaveAll className="h-3.5 w-3.5" />}
            {saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="border-border/40 shadow-sm glass card-hover animate-in-up stagger-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <SectionIcon icon={KeyRound} /> Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Current Password</Label>
            <div className="relative">
              <Input
                type={showCurrentPw ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="h-9 pr-9 bg-secondary/50 dark:bg-secondary/30 border-border/60 focus:bg-background transition-all duration-200"
              />
              <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showCurrentPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">New Password</Label>
            <div className="relative">
              <Input
                type={showNewPw ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="h-9 pr-9 bg-secondary/50 dark:bg-secondary/30 border-border/60 focus:bg-background transition-all duration-200"
              />
              <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showNewPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Confirm New Password</Label>
            <div className="relative">
              <Input
                type={showConfirmPw ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="h-9 pr-9 bg-secondary/50 dark:bg-secondary/30 border-border/60 focus:bg-background transition-all duration-200"
              />
              <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showConfirmPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          {pwError && <p className="text-xs text-destructive">{pwError}</p>}
          <Button size="sm" onClick={handleChangePassword} className={`gap-1.5 h-8 text-xs transition-all duration-300 ${pwSaved ? 'bg-success hover:bg-success' : 'btn-glow shadow-sm shadow-primary/10'}`}>
            {pwSaved ? <ShieldCheck className="h-3.5 w-3.5" /> : <KeyRound className="h-3.5 w-3.5" />}
            {pwSaved ? 'Password Updated!' : 'Update Password'}
          </Button>
        </CardContent>
      </Card>

      {/* Device */}
      <Card className="border-border/40 shadow-sm glass card-hover animate-in-up stagger-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <SectionIcon icon={Laptop2} /> Device Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium text-xs">Camera</span>
              </div>
              <div className="flex items-center gap-1.5">
                {cameraOk && <ShieldCheck className="h-3.5 w-3.5 text-success" />}
                <span className="text-xs text-muted-foreground">{cameraOk ? 'Ready' : 'Not detected'}</span>
                <Button variant="ghost" size="sm" onClick={() => { setCameraOk(false); setTimeout(() => setCameraOk(true), 1000); }} className="hover:bg-primary/10 h-6 w-6 p-0">
                  <RotateCw className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="aspect-video bg-gradient-to-br from-secondary to-muted rounded-lg flex items-center justify-center max-h-32 border border-border/40">
              <p className="text-xs text-muted-foreground">Camera Preview (Simulated)</p>
            </div>
          </div>
          <Separator className="bg-border/40" />
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AudioLines className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium text-xs">Microphone</span>
              </div>
              <div className="flex items-center gap-1.5">
                {micOk && <ShieldCheck className="h-3.5 w-3.5 text-success" />}
                <span className="text-xs text-muted-foreground">{micOk ? 'Ready' : 'Not detected'}</span>
                <Button variant="ghost" size="sm" onClick={() => { setMicOk(false); setTimeout(() => setMicOk(true), 1000); }} className="hover:bg-primary/10 h-6 w-6 p-0">
                  <RotateCw className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex gap-0.5 h-7 items-end p-1 rounded-lg bg-secondary/30 dark:bg-secondary/20">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm transition-all duration-150"
                  style={{
                    height: `${Math.random() * micLevel}%`,
                    background: `linear-gradient(to top, hsl(var(--primary)), hsl(var(--primary) / 0.4))`,
                    opacity: 0.65,
                  }}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card className="border-border/40 shadow-sm glass card-hover animate-in-up stagger-3">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <SectionIcon icon={SlidersHorizontal} /> Interview Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Default Difficulty</Label>
            <Select value={settings.defaultDifficulty} onValueChange={v => updateSetting('defaultDifficulty', v)}>
              <SelectTrigger className="w-28 h-8 text-xs bg-secondary/50 dark:bg-secondary/30 border-border/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Default Timeframe</Label>
            <Select value={String(settings.defaultTimeframe)} onValueChange={v => updateSetting('defaultTimeframe', parseInt(v))}>
              <SelectTrigger className="w-28 h-8 text-xs bg-secondary/50 dark:bg-secondary/30 border-border/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 min</SelectItem>
                <SelectItem value="30">30 min</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="border-border/40 shadow-sm glass card-hover animate-in-up stagger-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <SectionIcon icon={Paintbrush} /> Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {theme === 'dark' ? <MoonStar className="h-3.5 w-3.5 text-primary" /> : <SunMedium className="h-3.5 w-3.5 text-primary" />}
              <div>
                <Label className="text-xs">Dark Mode</Label>
                <p className="text-[11px] text-muted-foreground">Toggle between light and dark theme</p>
              </div>
            </div>
            <Switch checked={theme === 'dark'} onCheckedChange={c => setTheme(c ? 'dark' : 'light')} />
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card className="border-border/40 shadow-sm glass card-hover animate-in-up stagger-5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <SectionIcon icon={LogOut} /> Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" size="sm" className="gap-1.5 h-8 text-xs" onClick={handleLogout}>
            <LogOut className="h-3.5 w-3.5" /> Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
