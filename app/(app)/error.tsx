'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { reportError } from '@/lib/analytics';
import { copy } from '@/lib/copy';

/** In-app error boundary: a friendly retry, and an anonymous error report (P7-07). */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error.message || 'Render error', error.digest);
  }, [error]);
  return (
    <main className="mx-auto max-w-[480px] py-16 text-center">
      <p aria-hidden className="text-5xl">
        🫠
      </p>
      <h1 className="font-display mt-4 text-2xl font-semibold">{copy.errors.generic}</h1>
      <Button className="mt-6" onClick={reset}>
        {copy.errors.retry}
      </Button>
    </main>
  );
}
