'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/analytics';

/** Last-resort boundary (replaces the root layout, so it carries its own html/body). */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error.message || 'Global error', error.digest);
  }, [error]);
  return (
    <html lang="en">
      <body
        style={{ fontFamily: 'system-ui, sans-serif', background: '#fffbf5', color: '#1c1917' }}
      >
        <main style={{ maxWidth: 420, margin: '20vh auto', padding: 16, textAlign: 'center' }}>
          <h1 style={{ fontSize: 22 }}>Something went wrong. Please try again.</h1>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 16,
              minHeight: 44,
              padding: '0 16px',
              borderRadius: 12,
              border: 0,
              background: '#c2410c',
              color: '#fff',
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
