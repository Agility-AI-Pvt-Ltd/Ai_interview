import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Users, UserCheck, ClipboardCheck, Plus, Upload, Eye, Loader2, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api, type DashboardStats, type Candidate } from '@/services/api';
import { getScoreColor, getStatusColor } from '@/lib/utils';

const statCards = [
  { key: 'totalJobs', label: 'Total Jobs', icon: Briefcase, color: 'text-blue-600 bg-blue-50' },
  { key: 'totalCandidates', label: 'Total Candidates', icon: Users, color: 'text-purple-600 bg-purple-50' },
  { key: 'shortlistedCandidates', label: 'Shortlisted', icon: UserCheck, color: 'text-green-600 bg-green-50' },
  { key: 'interviewsCompleted', label: 'Interviews Done', icon: ClipboardCheck, color: 'text-orange-600 bg-orange-50' },
] as const;

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#f97316', '#ef4444'];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const loadDashboard = () => {
    Promise.all([api.getStats(), api.getCandidates()])
      .then(([s, c]) => {
        setStats(s);
        setCandidates(c.slice(0, 5));
      })
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadDashboard(); }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await api.seedDemoData();
      toast.success('Demo data loaded! Interview link ready.');
      loadDashboard();
      if (res.interview_url) {
        const url = `${window.location.origin}${res.interview_url}`;
        await navigator.clipboard.writeText(url);
        toast.info('Interview link copied to clipboard');
      }
    } catch {
      toast.error('Failed to load demo data');
    } finally {
      setSeeding(false);
    }
  };

  const statusData = [
    { name: 'Pending', value: candidates.filter((c) => c.status === 'pending').length || 1 },
    { name: 'Shortlisted', value: candidates.filter((c) => c.status === 'shortlisted').length || 0 },
    { name: 'Selected', value: candidates.filter((c) => c.status === 'selected').length || 0 },
    { name: 'Rejected', value: candidates.filter((c) => c.status === 'rejected').length || 0 },
  ].filter((d) => d.value > 0);

  const scoreData = candidates.slice(0, 5).map((c) => ({
    name: c.name.split(' ')[0],
    score: c.resume_score,
  }));

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1">Overview of your recruitment pipeline</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button variant="secondary" onClick={handleSeed} disabled={seeding}>
              {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Load Demo Data
            </Button>
            <Button asChild>
              <Link to="/jobs/create"><Plus className="h-4 w-4" /> Create Job</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/resumes/upload"><Upload className="h-4 w-4" /> Upload Resumes</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/candidates"><Eye className="h-4 w-4" /> View Candidates</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ key, label, icon: Icon, color }) => (
            <Card key={key}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{label}</p>
                    <p className="text-3xl font-bold mt-1">{stats?.[key] ?? 0}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resume Scores</CardTitle>
            </CardHeader>
            <CardContent>
              {scoreData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={scoreData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-400 py-16">No candidate data yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Candidate Status</CardTitle>
            </CardHeader>
            <CardContent>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label>
                      {statusData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-400 py-16">No status data yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Candidates</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/candidates">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {candidates.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No candidates yet. Upload resumes to get started.</p>
            ) : (
              <div className="space-y-3">
                {candidates.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-sm text-gray-500">{c.job_title}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-semibold px-2 py-1 rounded border ${getScoreColor(c.resume_score)}`}>
                        {c.resume_score}%
                      </span>
                      <Badge className={getStatusColor(c.status)}>{c.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
