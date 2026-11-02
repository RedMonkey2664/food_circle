'use client';

import { useState } from 'react';
import { VerdictButtons } from '@/components/verdict/VerdictButtons';
import { VerdictLabel } from '@/components/verdict/VerdictLabel';
import type { Verdict } from '@/lib/domain/verdict';

export function VerdictPlayground() {
  const [picked, setPicked] = useState<{ verdict: Verdict; text?: string } | null>(null);
  return (
    <div className="space-y-3">
      <p className="font-display text-lg">Aap-ne kaisa paaya?</p>
      <VerdictButtons
        value={picked?.verdict ?? null}
        onSelect={(verdict, text) => setPicked({ verdict, text })}
      />
      <p className="text-muted text-sm" aria-live="polite">
        {picked ? (
          <>
            Logged: <VerdictLabel verdict={picked.verdict} onlyForText={picked.text} />
          </>
        ) : (
          'Tap a verdict.'
        )}
      </p>
    </div>
  );
}
