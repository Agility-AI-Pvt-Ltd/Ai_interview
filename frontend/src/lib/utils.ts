import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getScoreColor(score: number): string {
  if (score >= 75) return 'text-green-600 bg-green-50 border-green-200';
  if (score >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  return 'text-red-600 bg-red-50 border-red-200';
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    shortlisted: 'bg-blue-100 text-blue-700',
    rejected: 'bg-red-100 text-red-700',
    hold: 'bg-yellow-100 text-yellow-700',
    selected: 'bg-green-100 text-green-700',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
}

export function getRecommendationColor(rec: string): string {
  if (rec.includes('Strongly') || rec === 'Select') return 'text-green-600';
  if (rec.includes('Recommend') || rec === 'Hold') return 'text-blue-600';
  if (rec === 'Consider') return 'text-yellow-600';
  return 'text-red-600';
}
