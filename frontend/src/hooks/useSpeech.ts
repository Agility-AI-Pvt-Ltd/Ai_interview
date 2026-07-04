import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: { transcript: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultLike[];
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const SPEECH_LANG = 'en-IN';

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

async function fetchNeuralSpeech(text: string, signal?: AbortSignal): Promise<Blob | null> {
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal,
    });
    if (!res.ok) return null;
    return res.blob();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return null;
    return null;
  }
}

function waitForAudioReady(audio: HTMLAudioElement): Promise<void> {
  if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Audio failed to load'));
    };
    const cleanup = () => {
      audio.removeEventListener('canplay', onReady);
      audio.removeEventListener('error', onError);
    };
    audio.addEventListener('canplay', onReady);
    audio.addEventListener('error', onError);
  });
}

export function useSpeech() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeechLoading, setIsSpeechLoading] = useState(false);
  const [speechProgress, setSpeechProgress] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [neuralTtsAvailable, setNeuralTtsAvailable] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onResultRef = useRef<((text: string) => void) | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);
  const sessionRef = useRef(0);

  const sttSupported = typeof window !== 'undefined' && !!getSpeechRecognitionCtor();
  const ttsSupported = neuralTtsAvailable;

  const cancelRaf = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const releaseAudio = useCallback(() => {
    cancelRaf();

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
      audioRef.current = null;
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, [cancelRaf]);

  useEffect(() => {
    fetch('/api/tts/config')
      .then((res) => setNeuralTtsAvailable(res.ok))
      .catch(() => setNeuralTtsAvailable(false));
  }, []);

  const stopSpeaking = useCallback((options?: { complete?: boolean }) => {
    sessionRef.current += 1;
    fetchAbortRef.current?.abort();
    fetchAbortRef.current = null;
    releaseAudio();
    setIsSpeaking(false);
    setIsSpeechLoading(false);
    setSpeechProgress(options?.complete ? 1 : 0);
  }, [releaseAudio]);

  const speak = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !neuralTtsAvailable) return;

      stopSpeaking({ complete: false });
      const sessionId = sessionRef.current;

      setIsSpeechLoading(true);
      setIsSpeaking(false);
      setSpeechProgress(0);

      const controller = new AbortController();
      fetchAbortRef.current = controller;

      const blob = await fetchNeuralSpeech(trimmed, controller.signal);
      if (sessionId !== sessionRef.current) return;

      if (!blob) {
        setIsSpeechLoading(false);
        setNeuralTtsAvailable(false);
        return;
      }

      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.preload = 'auto';
      audioRef.current = audio;
      audioUrlRef.current = audioUrl;

      try {
        await waitForAudioReady(audio);
      } catch {
        if (sessionId === sessionRef.current) {
          stopSpeaking({ complete: false });
        }
        return;
      }

      if (sessionId !== sessionRef.current) return;

      setIsSpeechLoading(false);
      setIsSpeaking(true);
      setSpeechProgress(0);

      const syncProgress = () => {
        if (sessionId !== sessionRef.current || !audioRef.current) return;
        const { currentTime, duration } = audioRef.current;
        if (duration > 0 && Number.isFinite(duration)) {
          setSpeechProgress(Math.min(currentTime / duration, 1));
        }
        if (!audioRef.current.paused && !audioRef.current.ended) {
          rafRef.current = requestAnimationFrame(syncProgress);
        }
      };

      audio.onended = () => {
        if (sessionId !== sessionRef.current) return;
        cancelRaf();
        setSpeechProgress(1);
        setIsSpeaking(false);
      };

      audio.onerror = () => {
        if (sessionId === sessionRef.current) {
          stopSpeaking({ complete: true });
        }
      };

      try {
        await audio.play();
        if (sessionId !== sessionRef.current) return;
        syncProgress();
      } catch {
        if (sessionId === sessionRef.current) {
          stopSpeaking({ complete: true });
        }
      }
    },
    [neuralTtsAvailable, stopSpeaking, cancelRaf, releaseAudio]
  );

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const startListening = useCallback(
    (onResult: (text: string) => void, existingText = '') => {
      const SpeechRecognition = getSpeechRecognitionCtor();
      if (!SpeechRecognition) return;

      stopListening();
      stopSpeaking({ complete: true });

      onResultRef.current = onResult;
      const baseText = existingText.trim();

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = SPEECH_LANG;

      let finalTranscript = '';

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interim += transcript;
          }
        }
        setInterimTranscript(interim);
        const combined = [baseText, finalTranscript.trim(), interim].filter(Boolean).join(' ');
        onResultRef.current?.(combined);
      };

      recognition.onerror = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    },
    [stopListening, stopSpeaking]
  );

  const toggleListening = useCallback(
    (onResult: (text: string) => void, existingText = '') => {
      if (isListening) {
        stopListening();
      } else {
        startListening(onResult, existingText);
      }
    },
    [isListening, startListening, stopListening]
  );

  useEffect(() => {
    return () => {
      stopSpeaking({ complete: false });
      stopListening();
    };
  }, [stopSpeaking, stopListening]);

  return {
    speak,
    stopSpeaking,
    startListening,
    stopListening,
    toggleListening,
    isListening,
    isSpeaking,
    isSpeechLoading,
    speechProgress,
    interimTranscript,
    ttsSupported,
    sttSupported,
  };
}
