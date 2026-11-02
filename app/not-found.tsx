import Link from 'next/link';
import { buttonClass } from '@/components/ui/Button';
import { copy } from '@/lib/copy';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center px-4">
      <p className="font-display text-primary text-xl font-semibold">{copy.app.name}</p>
      <h1 className="font-display mt-4 text-2xl font-semibold">{copy.notFound.title}</h1>
      <p className="text-muted mt-2">{copy.notFound.body}</p>
      <Link href="/" className={buttonClass({ className: 'mt-6 self-start' })}>
        {copy.notFound.home}
      </Link>
    </main>
  );
}
