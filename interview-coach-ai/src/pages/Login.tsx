import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AudioLines, MoveRight, Loader2 } from 'lucide-react';

export default function Login() {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill all fields.'); return; }
    if (isSignup && !name) { setError('Please enter your name.'); return; }

    setLoading(true);
    try {
      const result = isSignup ? await signup(name, email, password) : await login(email, password);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-primary/[0.04] blur-3xl animate-float" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-primary/[0.04] blur-3xl animate-float-delayed" />
      </div>

      <Card className="w-full max-w-sm shadow-xl border-0 glass-strong animate-in-up relative z-10">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
            <AudioLines className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {isSignup ? 'Create Account' : 'Welcome Back'}
            </CardTitle>
            <CardDescription className="mt-1.5">
              {isSignup ? 'Sign up to start practicing interviews' : 'Sign in to your interview coach'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isSignup && (
              <div className="space-y-1.5 animate-in-up">
                <Label htmlFor="name" className="text-xs font-medium">Full Name</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" className="h-10 bg-secondary/50 border-border/60 focus:bg-background transition-all duration-200 focus:shadow-md focus:shadow-primary/5" disabled={loading} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="h-10 bg-secondary/50 border-border/60 focus:bg-background transition-all duration-200 focus:shadow-md focus:shadow-primary/5" disabled={loading} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="h-10 bg-secondary/50 border-border/60 focus:bg-background transition-all duration-200 focus:shadow-md focus:shadow-primary/5" disabled={loading} />
            </div>
            {error && <p className="text-sm text-destructive animate-in-up">{error}</p>}
            <Button type="submit" className="w-full h-10 gap-2 btn-glow shadow-md shadow-primary/15 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isSignup ? 'Creating...' : 'Signing in...'}
                </>
              ) : (
                <>
                  {isSignup ? 'Sign Up' : 'Sign In'}
                  <MoveRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
          <div className="mt-5 text-center text-sm text-muted-foreground">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button onClick={() => { setIsSignup(!isSignup); setError(''); }} className="text-primary hover:underline font-medium transition-colors duration-200" disabled={loading}>
              {isSignup ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
