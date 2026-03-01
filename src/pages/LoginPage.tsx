import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/services/authApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const demoUsers = [
    { username: 'admin', label: 'admin' },
    { username: 'office', label: 'office' },
    { username: 'engine', label: 'technician' },
    { username: 'electrical', label: 'technician 2' },
    { username: 'customer', label: 'customer' },
    { username: 'login_probe', label: 'probe admin' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError('Please enter your username and password.'); return; }
    setLoading(true);
    setError('');
    try {
      await login(username, password);
    } catch {
      setError('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-2xl italic">b</span>
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Breakthru</h1>
          <p className="text-muted-foreground text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="text-sm py-2">
                {error}
              </Alert>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                className="bg-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="bg-input pr-10"
                />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Signing in...</> : 'Sign In'}
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center mb-2">
              Demo accounts (after running <code>uv run --no-sync python manage.py seed_demo_users</code>)
            </p>
            <div className="grid grid-cols-3 gap-1">
              {demoUsers.map(({ username: demoUsername, label }) => {
                return (
                <button
                  key={demoUsername}
                  onClick={() => { setUsername(demoUsername); setPassword(demoUsername); }}
                  className="text-[10px] px-2 py-1.5 rounded bg-accent hover:bg-accent/70 text-muted-foreground transition-colors capitalize"
                >
                  {label}
                </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
