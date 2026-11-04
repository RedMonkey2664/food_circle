import Link from 'next/link';
import { buttonClass } from '@/components/ui/Button';
import { copy } from '@/lib/copy';

export const metadata = { title: 'Offline' };

/** Shown by the service worker when there's no connection and no saved copy of the page. */
export default function OfflinePage() {
  const t = copy.pwa;
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center px-4">
      <p aria-hidden className="text-5xl">
        🍵
      </p>
      <h1 className="font-display mt-4 text-2xl font-semibold">{t.offlineTitle}</h1>
      <p className="text-muted mt-2">{t.offlineBody}</p>
      <Link href="/diary" className={buttonClass({ className: 'mt-6' })}>
        {t.offlineDiary}
      </Link>
    </main>
  );
}
