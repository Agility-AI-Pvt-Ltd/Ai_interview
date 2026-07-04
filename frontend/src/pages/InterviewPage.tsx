import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Mic, MicOff, CheckCircle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { api, type InterviewSession, type InterviewEvaluation } from '@/services/api';
import { getScoreColor, getRecommendationColor, cn } from '@/lib/utils';
import { useSpeech } from '@/hooks/useSpeech';
import { useTypewriter } from '@/hooks/useTypewriter';

const RESPONSE_LIMIT_SEC = 120;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function InterviewPage() {
  const { token } = useParams();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<InterviewEvaluation | null>(null);
  const [showTypeInput, setShowTypeInput] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const {
    speak,
    stopSpeaking,
    toggleListening,
    stopListening,
    startListening,
    isListening,
    isSpeaking,
    isSpeechLoading,
    speechProgress,
    interimTranscript,
    ttsSupported,
    sttSupported,
  } = useSpeech();

  const currentQuestion = session?.questions[currentQ] ?? '';
  const { displayText: typedQuestion, showCursor } = useTypewriter(
    currentQuestion,
    speechProgress,
    isSpeaking
  );

  const questionDisplay = isSpeaking
    ? typedQuestion
    : isSpeechLoading
      ? ''
      : currentQuestion;

  const canRecord = !isSpeaking && !isSpeechLoading;
  const currentAnswer = answers[currentQ] || '';
  const isLastQuestion = session ? currentQ >= session.questions.length - 1 : false;

  useEffect(() => {
    if (!token) return;
    api.getInterview(token)
      .then((s) => {
        setSession(s);
        setAnswers(s.answers?.length ? s.answers : new Array(s.questions.length).fill(''));
        if (s.status === 'completed') {
          toast.info('This interview has already been completed');
        }
      })
      .catch(() => toast.error('Interview link is invalid or expired'))
      .finally(() => setLoading(false));
  }, [token]);

  const updateAnswer = useCallback((text: string) => {
    setAnswers((prev) => {
      const updated = [...prev];
      updated[currentQ] = text;
      return updated;
    });
  }, [currentQ]);

  useEffect(() => {
    if (!session || evaluation || !ttsSupported) return;
    const question = session.questions[currentQ];
    if (!question) return;

    setShowTypeInput(false);
    setRecordingSeconds(0);
    speak(question);

    return () => {
      stopSpeaking({ complete: false });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQ, session?.interview_id, evaluation, ttsSupported]);

  useEffect(() => {
    stopListening();
    setRecordingSeconds(0);
  }, [currentQ, stopListening]);

  useEffect(() => {
    if (!isListening) return;
    const interval = setInterval(() => {
      setRecordingSeconds((s) => {
        if (s >= RESPONSE_LIMIT_SEC) {
          stopListening();
          return RESPONSE_LIMIT_SEC;
        }
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isListening, stopListening]);

  const handleMicClick = () => {
    if (!canRecord) return;
    if (!sttSupported) {
      setShowTypeInput(true);
      toast.info('Voice input works best in Chrome or Edge. You can type your answer below.');
      return;
    }
    if (isListening) {
      stopListening();
    } else {
      setRecordingSeconds(0);
      startListening(updateAnswer, currentAnswer);
    }
  };

  const goToNext = () => {
    if (!currentAnswer.trim()) {
      toast.error('Please record or type an answer before continuing');
      return;
    }
    stopSpeaking({ complete: false });
    stopListening();
    setShowTypeInput(false);
    setCurrentQ((q) => q + 1);
  };

  const handleSubmit = async () => {
    if (!token) return;
    if (!currentAnswer.trim()) {
      toast.error('Please answer this question before submitting');
      return;
    }
    stopSpeaking({ complete: true });
    stopListening();
    const unanswered = answers.filter((a, i) => i !== currentQ && !a.trim()).length;
    if (unanswered > 0) {
      toast.error(`Please answer all questions (${unanswered} remaining)`);
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.submitInterview(token, answers);
      setEvaluation(result);
      toast.success('Interview submitted successfully!');
    } catch {
      toast.error('Failed to submit interview');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <p className="text-gray-500 text-center">Interview not found or link has expired.</p>
      </div>
    );
  }

  if (evaluation) {
    return (
      <div className="min-h-screen bg-white py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900">Interview Complete</h1>
            <p className="text-gray-500 mt-2">Thank you, {evaluation.candidate_name}</p>
          </div>

          <Card className="shadow-sm border-gray-100">
            <CardHeader className="text-center border-b">
              <CardTitle>AI Evaluation Report</CardTitle>
              <p className="text-sm text-gray-500">{evaluation.job_title}</p>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-500">Overall</p>
                  <p className={`text-3xl font-bold ${getScoreColor(evaluation.overall_score).split(' ')[0]}`}>
                    {evaluation.overall_score}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Technical</p>
                  <p className="text-3xl font-bold text-blue-600">{evaluation.technical_score}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Communication</p>
                  <p className="text-3xl font-bold text-purple-600">{evaluation.communication_score}%</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Technical Score</span>
                    <span>{evaluation.technical_score}%</span>
                  </div>
                  <Progress value={evaluation.technical_score} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Communication Score</span>
                    <span>{evaluation.communication_score}%</span>
                  </div>
                  <Progress value={evaluation.communication_score} />
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-green-600 mb-1">Strengths</p>
                <p className="text-sm text-gray-600 bg-green-50 p-3 rounded-lg">{evaluation.strengths}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-red-600 mb-1">Areas for Improvement</p>
                <p className="text-sm text-gray-600 bg-red-50 p-3 rounded-lg">{evaluation.weaknesses}</p>
              </div>
              <div className="text-center pt-4 border-t">
                <p className="text-sm text-gray-500 mb-1">Hiring Recommendation</p>
                <p className={`text-xl font-bold ${getRecommendationColor(evaluation.hiring_recommendation)}`}>
                  {evaluation.hiring_recommendation}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Subtle progress header */}
      <div className="px-6 pt-6 flex items-center justify-between text-xs text-gray-400">
        <span>{session.candidate_name}</span>
        <span>Question {currentQ + 1} of {session.questions.length}</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-3xl mx-auto w-full">
        {/* Question */}
        <h1 className="text-center text-xl sm:text-2xl md:text-[1.65rem] font-bold text-[#1e293b] leading-snug tracking-tight">
          {isSpeechLoading && !questionDisplay ? (
            <span className="text-gray-300 font-normal">Loading question...</span>
          ) : (
            <>
              {questionDisplay}
              {showCursor && (
                <span className="inline-block w-0.5 h-[1em] bg-[#1e293b] ml-0.5 align-middle animate-pulse" />
              )}
            </>
          )}
        </h1>

        {/* Timer */}
        <p
          className={cn(
            'mt-10 sm:mt-14 text-4xl sm:text-5xl font-light tabular-nums tracking-wide',
            isListening ? 'text-gray-500' : 'text-gray-300'
          )}
        >
          {formatTime(recordingSeconds)} / {formatTime(RESPONSE_LIMIT_SEC)}
        </p>

        {/* Mic button */}
        <button
          type="button"
          onClick={handleMicClick}
          disabled={!canRecord && !isListening}
          aria-label={isListening ? 'Stop recording' : 'Start recording'}
          className={cn(
            'mt-10 sm:mt-14 h-20 w-20 sm:h-[5.5rem] sm:w-[5.5rem] rounded-full flex items-center justify-center transition-all shadow-lg',
            isListening
              ? 'bg-red-600 scale-105 ring-4 ring-red-100 animate-pulse'
              : canRecord
                ? 'bg-[#c0392b] hover:bg-[#a93226] hover:scale-105 active:scale-95'
                : 'bg-gray-200 cursor-not-allowed shadow-none'
          )}
        >
          {isListening ? (
            <MicOff className="h-8 w-8 sm:h-9 sm:w-9 text-white" strokeWidth={1.75} />
          ) : (
            <Mic className="h-8 w-8 sm:h-9 sm:w-9 text-white" strokeWidth={1.75} />
          )}
        </button>

        {isListening && interimTranscript && (
          <p className="mt-6 text-sm text-gray-400 italic text-center max-w-md line-clamp-2">
            {interimTranscript}
          </p>
        )}

        {/* Type answer link */}
        {!showTypeInput ? (
          <button
            type="button"
            onClick={() => setShowTypeInput(true)}
            className="mt-14 sm:mt-16 text-sm text-gray-400 underline underline-offset-4 hover:text-gray-600 transition-colors"
          >
            Or type your answer
          </button>
        ) : (
          <div className="mt-10 w-full max-w-lg space-y-4 animate-in fade-in duration-300">
            <Textarea
              autoFocus
              placeholder="Type your answer here..."
              rows={5}
              value={currentAnswer}
              onChange={(e) => updateAnswer(e.target.value)}
              className="resize-none border-gray-200 focus-visible:ring-gray-300 text-base"
            />
            <button
              type="button"
              onClick={() => setShowTypeInput(false)}
              className="text-sm text-gray-400 underline underline-offset-4 hover:text-gray-600"
            >
              Use voice instead
            </button>
          </div>
        )}
      </div>

      {/* Bottom navigation — appears when answer exists */}
      {(currentAnswer.trim() || isListening) && (
        <div className="px-6 pb-8 flex justify-center">
          {isLastQuestion ? (
            <Button
              onClick={handleSubmit}
              disabled={submitting || isListening}
              className="rounded-full px-8 bg-[#1e293b] hover:bg-[#0f172a]"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Submit Interview</>
              )}
            </Button>
          ) : (
            <Button
              onClick={goToNext}
              disabled={isListening}
              className="rounded-full px-8 bg-[#1e293b] hover:bg-[#0f172a]"
            >
              Next Question <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
