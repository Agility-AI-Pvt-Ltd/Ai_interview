import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from '@/services/api';

export default function CreateJobPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    department: '',
    experience_required: '',
    skills_required: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const job = await api.createJob(form);
      toast.success(`Job "${job.title}" created successfully!`);
      navigate('/resumes/upload');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Job</h1>
          <p className="text-gray-500 mt-1">Define a new job opening for AI-powered screening</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
            <CardDescription>Fill in the job requirements for AI resume matching</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title">Job Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Senior Frontend Developer"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    placeholder="e.g. Engineering"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experience">Experience Required</Label>
                  <Input
                    id="experience"
                    placeholder="e.g. 3-5 years"
                    value={form.experience_required}
                  onChange={(e) => setForm({ ...form, experience_required: e.target.value })}
                />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="skills">Key Skills (optional — auto-extracted from description)</Label>
                <Input
                  id="skills"
                  placeholder="e.g. Python, Machine Learning, LLMs (or leave blank to auto-detect)"
                  value={form.skills_required}
                  onChange={(e) => setForm({ ...form, skills_required: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Skills are auto-extracted from your job description if left blank</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Job Description</Label>
                <Textarea
                  id="description"
                  placeholder="Paste the full job description here..."
                  rows={8}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Job'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/dashboard')}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
