import Link from 'next/link';
import { buttonClass } from '@/components/ui/Button';
import { copy } from '@/lib/copy';
import { Brand } from '@/components/brand/Logo';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center px-4">
      <p className="text-xl">
        <Brand />
      </p>
      <h1 className="font-display mt-4 text-2xl font-semibold">{copy.notFound.title}</h1>
      <p className="text-muted mt-2">{copy.notFound.body}</p>
      <Link href="/" className={buttonClass({ className: 'mt-6 self-start' })}>
        {copy.notFound.home}
      </Link>
    </main>
  );
}
