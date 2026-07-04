import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Loader2, Eye, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api, type Candidate } from '@/services/api';
import { getScoreColor, getStatusColor } from '@/lib/utils';

const statusFilters = ['all', 'pending', 'shortlisted', 'selected', 'hold', 'rejected'];

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    api.getCandidates()
      .then(setCandidates)
      .catch(() => toast.error('Failed to load candidates'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = candidates.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.job_title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Candidates</h1>
          <p className="text-gray-500 mt-1">Review and manage all candidates</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search candidates..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {statusFilters.map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(s)}
                className="capitalize"
              >
                {s}
              </Button>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{filtered.length} Candidate(s)</CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-center text-gray-400 py-12">No candidates found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-gray-500">
                      <th className="pb-3 font-medium">Name</th>
                      <th className="pb-3 font-medium">Job</th>
                      <th className="pb-3 font-medium">Resume Score</th>
                      <th className="pb-3 font-medium">Interview Score</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Recommendation</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-4 font-medium">{c.name}</td>
                        <td className="py-4 text-sm text-gray-600">{c.job_title}</td>
                        <td className="py-4">
                          <span className={`text-sm font-semibold px-2 py-1 rounded border ${getScoreColor(c.resume_score)}`}>
                            {c.resume_score}%
                          </span>
                        </td>
                        <td className="py-4">
                          {c.interview_score != null ? (
                            <span className={`text-sm font-semibold px-2 py-1 rounded border ${getScoreColor(c.interview_score)}`}>
                              {c.interview_score}%
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-4">
                          <Badge className={getStatusColor(c.status)}>{c.status}</Badge>
                        </td>
                        <td className="py-4 text-sm">{c.hiring_recommendation || c.ai_recommendation || '—'}</td>
                        <td className="py-4">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/candidates/${c.id}`}>
                                <Eye className="h-4 w-4" /> Review
                              </Link>
                            </Button>
                            {c.interview_status === 'completed' && (
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={`/candidates/${c.id}/interview-feedback`}>
                                  <ClipboardList className="h-4 w-4" /> Feedback
                                </Link>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
