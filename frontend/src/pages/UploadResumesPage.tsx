import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Upload, FileText, Loader2, CheckCircle, XCircle, User, X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api, type Job, type Candidate } from '@/services/api';
import { cn, getScoreColor, getRecommendationColor } from '@/lib/utils';

const MAX_FILES = 50;
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.doc'];

function isValidResume(file: File) {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export default function UploadResumesPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<number | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<Candidate[]>([]);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getJobs().then(setJobs).catch(() => toast.error('Failed to load jobs'));
  }, []);

  const addFiles = (incoming: File[]) => {
    const valid = incoming.filter(isValidResume);
    const invalidCount = incoming.length - valid.length;

    if (invalidCount > 0) {
      toast.error(`${invalidCount} file(s) skipped — only PDF and DOCX are allowed`);
    }
    if (valid.length === 0) return;

    setFiles((prev) => {
      const existing = new Set(prev.map(fileKey));
      const unique = valid.filter((f) => !existing.has(fileKey(f)));
      const duplicateCount = valid.length - unique.length;

      if (duplicateCount > 0) {
        toast.info(`${duplicateCount} duplicate file(s) skipped`);
      }

      const combined = [...prev, ...unique];
      if (combined.length > MAX_FILES) {
        toast.error(`Maximum ${MAX_FILES} resumes at a time`);
        return combined.slice(0, MAX_FILES);
      }
      return combined;
    });
    setResults([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      addFiles(Array.from(e.target.files));
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setFiles([]);
    setResults([]);
  };

  const handleUpload = async () => {
    if (!selectedJob || files.length === 0) {
      toast.error('Select a job and add at least one resume');
      return;
    }
    setUploading(true);
    setProgress(15);
    try {
      setProgress(40);
      const res = await api.uploadResumes(selectedJob, files);
      setProgress(100);
      const valid = res.filter((r): r is Candidate => 'id' in r && !!r.id);
      const failed = res.filter((r) => 'error' in r);

      setResults(valid.sort((a, b) => b.resume_score - a.resume_score));
      if (valid.length > 0) setFiles([]);

      if (valid.length > 0) {
        toast.success(`Analyzed ${valid.length} resume${valid.length > 1 ? 's' : ''} with AI`);
      }
      if (failed.length > 0) {
        toast.error(`${failed.length} file(s) failed to process`);
      }
      if (valid.length === 0) {
        toast.error('No resumes processed. Use PDF or DOCX files only.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleShortlist = async (id: number) => {
    try {
      const res = await api.shortlistCandidate(id);
      const fullUrl = `${window.location.origin}${res.interview_url}`;
      await navigator.clipboard.writeText(fullUrl);
      toast.success('Interview link copied to clipboard!');
    } catch {
      toast.error('Failed to generate interview link');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await api.updateCandidateStatus(id, 'rejected');
      setResults((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'rejected' } : c)));
      toast.success('Candidate rejected');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Upload Resumes</h1>
          <p className="text-gray-500 mt-1">
            Upload multiple candidate resumes at once — PDF or DOCX, up to {MAX_FILES} files
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Job</CardTitle>
              </CardHeader>
              <CardContent>
                {jobs.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 mb-3">No jobs created yet</p>
                    <Button size="sm" asChild>
                      <Link to="/jobs/create">Create Job</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {jobs.map((job) => (
                      <button
                        key={job.id}
                        onClick={() => setSelectedJob(job.id)}
                        className={cn(
                          'w-full text-left p-3 rounded-lg border transition-colors',
                          selectedJob === job.id ? 'border-primary bg-primary/5' : 'hover:bg-gray-50'
                        )}
                      >
                        <p className="font-medium text-sm">{job.title}</p>
                        <p className="text-xs text-gray-500">{job.department}</p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">Upload Resumes</CardTitle>
                    <CardDescription>Select multiple files at once</CardDescription>
                  </div>
                  {files.length > 0 && (
                    <Badge variant="secondary">{files.length} selected</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                  <p className="text-sm font-medium">Drop multiple resumes here</p>
                  <p className="text-xs text-gray-400 mt-1">or click to browse — PDF, DOCX (max 10MB each)</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || files.length >= MAX_FILES}
                >
                  <Plus className="h-4 w-4" />
                  {files.length === 0 ? 'Choose Multiple Resumes' : 'Add More Resumes'}
                </Button>

                {files.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{files.length} resume{files.length > 1 ? 's' : ''} ready</span>
                      <span>{formatFileSize(totalSize)} total</span>
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-2 rounded-lg border p-2 bg-gray-50/50">
                      {files.map((file, index) => (
                        <div
                          key={fileKey(file)}
                          className="flex items-center gap-2 p-2 rounded-md bg-white border text-sm"
                        >
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-medium">{file.name}</p>
                            <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            disabled={uploading}
                            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            title="Remove file"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-gray-500"
                      onClick={clearFiles}
                      disabled={uploading}
                    >
                      <Trash2 className="h-4 w-4" /> Clear all
                    </Button>
                  </div>
                )}

                {uploading && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">
                      AI is analyzing {files.length} resume{files.length > 1 ? 's' : ''}...
                    </p>
                    <Progress value={progress} />
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={handleUpload}
                  disabled={uploading || !selectedJob || files.length === 0}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Analyze {files.length > 0 ? `${files.length} Resume${files.length > 1 ? 's' : ''}` : 'Resumes'} with AI
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">AI Screening Results</CardTitle>
                    <CardDescription>Candidates ranked by resume score (matched against full job description)</CardDescription>
                  </div>
                  {results.length > 0 && (
                    <Badge>{results.length} candidate{results.length > 1 ? 's' : ''}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {results.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No results yet</p>
                    <p className="text-sm mt-1">Add multiple resumes and click Analyze to screen all candidates at once</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {results.map((c, idx) => (
                      <div key={c.id} className="border rounded-lg p-5 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                              #{idx + 1}
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{c.name}</h3>
                              <p className={`text-sm font-medium ${getRecommendationColor(c.ai_recommendation)}`}>
                                {c.ai_recommendation}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {c.skills_matched?.length || 0} skills matched · {c.missing_skills?.length || 0} missing
                              </p>
                            </div>
                          </div>
                          <div className={`text-2xl font-bold px-3 py-1 rounded-lg border ${getScoreColor(c.resume_score)}`}>
                            {c.resume_score}%
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1.5">
                              Skills Matched ({c.skills_matched?.length || 0})
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {c.skills_matched?.length > 0 ? (
                                c.skills_matched.map((s) => (
                                  <Badge key={s} variant="success">{s}</Badge>
                                ))
                              ) : (
                                <span className="text-xs text-gray-400">None detected</span>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1.5">
                              Missing Skills ({c.missing_skills?.length || 0})
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {c.missing_skills?.length > 0 ? (
                                c.missing_skills.map((s) => (
                                  <Badge key={s} variant="destructive" title={s}>
                                    {s.length > 40 ? s.slice(0, 37) + '...' : s}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-gray-400">None</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {c.resume_path && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={`/uploads/${c.resume_path.split('/').pop()}`} target="_blank" rel="noreferrer">
                                <FileText className="h-4 w-4" /> View Resume
                              </a>
                            </Button>
                          )}
                          <Button size="sm" onClick={() => handleShortlist(c.id)} disabled={c.status === 'rejected'}>
                            <CheckCircle className="h-4 w-4" /> Shortlist & Copy Link
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleReject(c.id)}>
                            <XCircle className="h-4 w-4" /> Reject
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/candidates/${c.id}`}>View Details</Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
