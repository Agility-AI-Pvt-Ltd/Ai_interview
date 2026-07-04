import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import CreateJobPage from '@/pages/CreateJobPage';
import UploadResumesPage from '@/pages/UploadResumesPage';
import CandidatesPage from '@/pages/CandidatesPage';
import CandidateDetailPage from '@/pages/CandidateDetailPage';
import InterviewFeedbackPage from '@/pages/InterviewFeedbackPage';
import InterviewPage from '@/pages/InterviewPage';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/interview/:token" element={<InterviewPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/jobs/create" element={<ProtectedRoute><CreateJobPage /></ProtectedRoute>} />
        <Route path="/resumes/upload" element={<ProtectedRoute><UploadResumesPage /></ProtectedRoute>} />
        <Route path="/candidates" element={<ProtectedRoute><CandidatesPage /></ProtectedRoute>} />
        <Route path="/candidates/:id" element={<ProtectedRoute><CandidateDetailPage /></ProtectedRoute>} />
        <Route path="/candidates/:id/interview-feedback" element={<ProtectedRoute><InterviewFeedbackPage /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
