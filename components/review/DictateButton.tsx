'use client';

import { useEffect, useRef, useState } from 'react';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult:
    | ((e: {
        results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

/**
 * P7-06 voice experiment: dictate a note with the browser's own speech recognition (Hindi or
 * English). Text only: no audio is recorded or uploaded by us. Hidden where unsupported.
 */
export function DictateButton({ onText }: { onText: (text: string) => void }) {
  const t = copy.voice;
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [lang, setLang] = useState<'hi-IN' | 'en-IN'>('hi-IN');
  const rec = useRef<SpeechRec | null>(null);

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRec;
      webkitSpeechRecognition?: new () => SpeechRec;
    };
    const ok = Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
    queueMicrotask(() => setSupported(ok));
    return () => rec.current?.stop();
  }, []);

  function toggle() {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRec;
      webkitSpeechRecognition?: new () => SpeechRec;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = lang;
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e) => {
      const parts: string[] = [];
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        if (res?.isFinal && res[0]) parts.push(res[0].transcript);
      }
      if (parts.length) onText(parts.join(' ').trim());
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setListening(true);
    track('dictation_used');
    r.start();
  }

  if (!supported) return null;
  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={listening}
        className={cn(
          'inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-xs font-semibold transition-colors duration-150',
          listening
            ? 'border-skip bg-skip-soft text-skip motion-safe:animate-pulse'
            : 'border-line bg-surface',
        )}
      >
        <span aria-hidden>🎤</span>
        {listening ? t.stop : t.speak}
      </button>
      <button
        type="button"
        onClick={() => setLang(lang === 'hi-IN' ? 'en-IN' : 'hi-IN')}
        className="text-muted min-h-9 px-1 text-xs font-semibold"
        aria-label={t.switchLang}
      >
        {lang === 'hi-IN' ? 'हिं' : 'EN'}
      </button>
    </span>
  );
}
