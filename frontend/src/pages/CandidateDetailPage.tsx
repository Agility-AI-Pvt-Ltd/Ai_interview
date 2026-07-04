import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Loader2, Copy, CheckCircle, XCircle, PauseCircle,
  FileText, Brain, MessageSquare, Award, ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api, type Candidate } from '@/services/api';
import { getScoreColor, getStatusColor, getRecommendationColor } from '@/lib/utils';

export default function CandidateDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.getCandidate(Number(id))
      .then(setCandidate)
      .catch(() => toast.error('Failed to load candidate'))
      .finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async (status: string) => {
    if (!candidate) return;
    try {
      await api.updateCandidateStatus(candidate.id, status);
      setCandidate({ ...candidate, status });
      toast.success(`Candidate marked as ${status}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const copyInterviewLink = () => {
    if (!candidate?.interview_token) {
      toast.error('No interview link. Shortlist the candidate first.');
      return;
    }
    const url = `${window.location.origin}/interview/${candidate.interview_token}`;
    navigator.clipboard.writeText(url);
    toast.success('Interview link copied!');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!candidate) {
    return (
      <DashboardLayout>
        <p className="text-center text-gray-500 py-16">Candidate not found</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{candidate.name}</h1>
              <Badge className={getStatusColor(candidate.status)}>{candidate.status}</Badge>
            </div>
            <p className="text-gray-500 mt-1">{candidate.job_title} · {candidate.job_department}</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/candidates')}>Back to List</Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <Brain className="h-8 w-8 mx-auto text-blue-500 mb-2" />
              <p className="text-sm text-gray-500">Resume Score</p>
              <p className={`text-3xl font-bold mt-1 ${getScoreColor(candidate.resume_score).split(' ')[0]}`}>
                {candidate.resume_score}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <MessageSquare className="h-8 w-8 mx-auto text-purple-500 mb-2" />
              <p className="text-sm text-gray-500">Interview Score</p>
              <p className={`text-3xl font-bold mt-1 ${candidate.interview_score != null ? getScoreColor(candidate.interview_score).split(' ')[0] : 'text-gray-400'}`}>
                {candidate.interview_score != null ? `${candidate.interview_score}%` : 'N/A'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Award className="h-8 w-8 mx-auto text-green-500 mb-2" />
              <p className="text-sm text-gray-500">Recommendation</p>
              <p className={`text-lg font-bold mt-1 ${getRecommendationColor(candidate.hiring_recommendation || candidate.ai_recommendation)}`}>
                {candidate.hiring_recommendation || candidate.ai_recommendation}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resume Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Skills Matched</p>
                <div className="flex flex-wrap gap-1.5">
                  {candidate.skills_matched?.map((s) => (
                    <Badge key={s} variant="success">{s}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Missing Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {candidate.missing_skills?.length > 0 ? (
                    candidate.missing_skills.map((s) => (
                      <Badge key={s} variant="destructive">{s}</Badge>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">None</span>
                  )}
                </div>
              </div>
              {candidate.resume_path && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`/uploads/${candidate.resume_path.split('/').pop()}`} target="_blank" rel="noreferrer">
                    <FileText className="h-4 w-4" /> View Resume
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Interview Evaluation</CardTitle>
              {candidate.interview_status === 'completed' && (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/candidates/${candidate.id}/interview-feedback`}>
                    <ClipboardList className="h-4 w-4" /> Full Feedback Report
                  </Link>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {candidate.interview_status === 'completed' ? (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Technical</span>
                        <span className="font-medium">{candidate.technical_score}%</span>
                      </div>
                      <Progress value={candidate.technical_score} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Communication</span>
                        <span className="font-medium">{candidate.communication_score}%</span>
                      </div>
                      <Progress value={candidate.communication_score} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-600 mb-1">Strengths</p>
                    <p className="text-sm text-gray-600">{candidate.strengths}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-600 mb-1">Weaknesses</p>
                    <p className="text-sm text-gray-600">{candidate.weaknesses}</p>
                  </div>
                  {candidate.questions && candidate.questions.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium text-gray-500 mb-2">
                        Interview Preview ({candidate.questions.length} questions)
                      </p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {candidate.questions.slice(0, 2).map((q, i) => (
                          <div key={i} className="text-xs bg-gray-50 rounded p-2">
                            <p className="font-medium text-gray-700">Q{i + 1}: {q}</p>
                            <p className="text-gray-500 mt-1 line-clamp-2">
                              {candidate.answers?.[i] || '—'}
                            </p>
                          </div>
                        ))}
                      </div>
                      <Button variant="link" size="sm" className="mt-2 px-0" asChild>
                        <Link to={`/candidates/${candidate.id}/interview-feedback`}>
                          View full Q&amp;A transcript →
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Interview not completed yet</p>
                  {candidate.interview_token && (
                    <Button variant="outline" size="sm" className="mt-3" onClick={copyInterviewLink}>
                      <Copy className="h-4 w-4" /> Copy Interview Link
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">HR Decision</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => updateStatus('selected')} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4" /> Select
              </Button>
              <Button variant="outline" onClick={() => updateStatus('hold')}>
                <PauseCircle className="h-4 w-4" /> Hold
              </Button>
              <Button variant="destructive" onClick={() => updateStatus('rejected')}>
                <XCircle className="h-4 w-4" /> Reject
              </Button>
              {candidate.interview_token && (
                <Button variant="secondary" onClick={copyInterviewLink}>
                  <Copy className="h-4 w-4" /> Copy Interview Link
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
