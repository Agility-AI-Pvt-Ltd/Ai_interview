import { useMemo } from 'react';

/** Small lead so visible text stays in step with spoken audio */
const TEXT_LEAD = 0.06;

/**
 * Reveals text in sync with speech progress (0–1).
 */
export function useTypewriter(
  fullText: string,
  progress: number,
  active: boolean
) {
  const displayText = useMemo(() => {
    if (!active || !fullText) return fullText;
    if (progress >= 1) return fullText;

    const adjusted = Math.min(1, progress + TEXT_LEAD);
    const charCount = Math.ceil(fullText.length * adjusted);
    return fullText.slice(0, charCount);
  }, [fullText, progress, active]);

  const showCursor = active && progress < 1;
  const isComplete = !active || progress >= 1;

  return { displayText, showCursor, isComplete };
}
