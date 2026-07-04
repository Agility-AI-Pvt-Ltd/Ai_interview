import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Loader2, ArrowLeft, MessageSquare, Award, TrendingUp,
  CheckCircle, XCircle, AlertCircle, ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api, type InterviewFeedback } from '@/services/api';
import { getScoreColor, getRecommendationColor } from '@/lib/utils';

function RecommendationBadge({ rec }: { rec: string }) {
  const variant =
    rec === 'Select' || rec.includes('Strongly') ? 'success' :
    rec === 'Hold' || rec === 'Consider' ? 'secondary' :
    'destructive';
  return <Badge variant={variant as 'success' | 'secondary' | 'destructive'}>{rec}</Badge>;
}

export default function InterviewFeedbackPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.getInterviewFeedback(Number(id))
      .then(setFeedback)
      .catch((err) => toast.error(err.message || 'Failed to load interview feedback'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!feedback) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto text-center py-16">
          <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Interview feedback not available</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/candidates')}>
            Back to Candidates
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const isCompleted = feedback.interview_status === 'completed';

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={() => navigate(`/candidates/${id}`)}>
              <ArrowLeft className="h-4 w-4" /> Back to Candidate
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Interview Feedback</h1>
            <p className="text-gray-500 mt-1">
              {feedback.candidate_name} · {feedback.job_title}
            </p>
          </div>
          <Badge className={isCompleted ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
            {isCompleted ? 'Completed' : feedback.interview_status}
          </Badge>
        </div>

        {!isCompleted ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <AlertCircle className="h-10 w-10 mx-auto mb-3 text-yellow-500" />
              <p className="font-medium">Interview not completed yet</p>
              <p className="text-sm mt-1">Feedback will appear once the candidate submits their interview.</p>
              <Button variant="outline" className="mt-4" asChild>
                <Link to={`/candidates/${id}`}>View Candidate Profile</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Score overview */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-5 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Resume Score</p>
                  <p className={`text-2xl font-bold mt-1 ${getScoreColor(feedback.resume_score).split(' ')[0]}`}>
                    {feedback.resume_score}%
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Overall</p>
                  <p className={`text-2xl font-bold mt-1 ${getScoreColor(feedback.scores.overall).split(' ')[0]}`}>
                    {feedback.scores.overall}%
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Technical</p>
                  <p className="text-2xl font-bold mt-1 text-blue-600">{feedback.scores.technical}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Communication</p>
                  <p className="text-2xl font-bold mt-1 text-purple-600">{feedback.scores.communication}%</p>
                </CardContent>
              </Card>
            </div>

            {/* AI Recommendation */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    AI Hiring Recommendation
                  </CardTitle>
                  <RecommendationBadge rec={feedback.feedback.hiring_recommendation} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Technical Score</span>
                      <span className="font-medium">{feedback.scores.technical}%</span>
                    </div>
                    <Progress value={feedback.scores.technical} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Communication Score</span>
                      <span className="font-medium">{feedback.scores.communication}%</span>
                    </div>
                    <Progress value={feedback.scores.communication} className="h-2" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="rounded-lg bg-green-50 border border-green-100 p-4">
                    <p className="text-sm font-semibold text-green-700 flex items-center gap-1.5 mb-2">
                      <CheckCircle className="h-4 w-4" /> Strengths
                    </p>
                    <p className="text-sm text-green-900">{feedback.feedback.strengths}</p>
                  </div>
                  <div className="rounded-lg bg-red-50 border border-red-100 p-4">
                    <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5 mb-2">
                      <XCircle className="h-4 w-4" /> Areas for Improvement
                    </p>
                    <p className="text-sm text-red-900">{feedback.feedback.weaknesses}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Q&A Transcript */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Interview Q&amp;A Transcript
                </CardTitle>
                <CardDescription>{feedback.qa_pairs.length} questions answered</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {feedback.qa_pairs.map(({ question_number, question, answer }) => (
                  <div key={question_number} className="border rounded-lg p-4 hover:bg-gray-50/50">
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {question_number}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm">{question}</p>
                        <div className="mt-3 rounded-md bg-gray-50 border p-3">
                          <p className="text-xs font-medium text-gray-500 mb-1">Candidate Answer</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {answer?.trim() || <span className="text-gray-400 italic">No answer provided</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* HR Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  HR Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button asChild className="bg-green-600 hover:bg-green-700">
                  <Link to={`/candidates/${id}`}>
                    <CheckCircle className="h-4 w-4" /> Make Hiring Decision
                  </Link>
                </Button>
                <Button variant="outline" onClick={() => navigate('/candidates')}>
                  Back to Candidates
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
