import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('hr@company.com');
  const [password, setPassword] = useState('hr123');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.login(email, password);
      if (res.success) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        toast.success('Welcome back!');
        navigate('/dashboard');
      }
    } catch {
      toast.error('Invalid credentials. Use hr@company.com / hr123');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">RecruitAI</CardTitle>
            <CardDescription>AI-Powered Recruitment Platform</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Demo credentials: hr@company.com / hr123
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
