const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface User {
  email: string;
  name: string;
}

export interface Job {
  id: number;
  title: string;
  department: string;
  experience_required: string;
  skills_required: string;
  description: string;
  created_at: string;
}

export interface Candidate {
  id: number;
  job_id: number;
  name: string;
  resume_path?: string;
  resume_score: number;
  skills_matched: string[];
  missing_skills: string[];
  ai_recommendation: string;
  status: string;
  interview_token?: string;
  job_title?: string;
  job_department?: string;
  interview_score?: number;
  technical_score?: number;
  communication_score?: number;
  strengths?: string;
  weaknesses?: string;
  hiring_recommendation?: string;
  interview_status?: string;
  questions?: string[];
  answers?: string[];
  created_at: string;
}

export interface InterviewFeedback {
  candidate_id: number;
  candidate_name: string;
  job_title: string;
  job_department: string;
  interview_status: string;
  completed_at: string | null;
  scores: {
    overall: number;
    technical: number;
    communication: number;
  };
  feedback: {
    strengths: string;
    weaknesses: string;
    hiring_recommendation: string;
  };
  qa_pairs: { question_number: number; question: string; answer: string }[];
  resume_score: number;
}

export interface DashboardStats {
  totalJobs: number;
  totalCandidates: number;
  shortlistedCandidates: number;
  interviewsCompleted: number;
}

export interface InterviewSession {
  candidate_name: string;
  job_title: string;
  job_department: string;
  questions: string[];
  answers: string[];
  status: string;
  interview_id: number;
}

export interface InterviewEvaluation {
  overall_score: number;
  technical_score: number;
  communication_score: number;
  strengths: string;
  weaknesses: string;
  hiring_recommendation: string;
  candidate_name: string;
  job_title: string;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ success: boolean; user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getStats: () => request<DashboardStats>('/dashboard/stats'),

  getJobs: () => request<Job[]>('/jobs'),
  getJob: (id: number) => request<Job>(`/jobs/${id}`),
  createJob: (data: Omit<Job, 'id' | 'created_at'>) =>
    request<Job>('/jobs', { method: 'POST', body: JSON.stringify(data) }),

  getCandidates: (params?: { job_id?: number; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.job_id) qs.set('job_id', String(params.job_id));
    if (params?.status) qs.set('status', params.status);
    const query = qs.toString();
    return request<Candidate[]>(`/candidates${query ? `?${query}` : ''}`);
  },

  getCandidate: (id: number) => request<Candidate>(`/candidates/${id}`),

  getInterviewFeedback: (id: number) => request<InterviewFeedback>(`/candidates/${id}/interview-feedback`),

  updateCandidateStatus: (id: number, status: string) =>
    request<Candidate>(`/candidates/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  shortlistCandidate: (id: number) =>
    request<{ candidate_id: number; interview_token: string; interview_url: string }>(
      `/candidates/${id}/shortlist`,
      { method: 'POST' }
    ),

  uploadResumes: async (jobId: number, files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('resumes', f));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300000);
    try {
      const res = await fetch(`${API_BASE}/candidates/upload/${jobId}`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({ message: 'Upload failed' }));
      if (!res.ok) {
        throw new Error(data.message || `Upload failed (HTTP ${res.status})`);
      }
      return data as Candidate[];
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Upload timed out — try fewer files at once');
      }
      if (err instanceof TypeError && err.message.includes('fetch')) {
        throw new Error('Cannot reach server — make sure the backend is running on port 3001');
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  },

  getInterview: (token: string) => request<InterviewSession>(`/interview/${token}`),

  submitInterview: (token: string, answers: string[]) =>
    request<InterviewEvaluation>(`/interview/${token}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),

  seedDemoData: () =>
    request<{ message: string; interview_url: string }>('/seed', { method: 'POST' }),
};
