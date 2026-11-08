import Link from 'next/link';
import { Brand } from '@/components/brand/Logo';
import { SUPPORT_EMAIL } from '@/lib/config';
import { copy } from '@/lib/copy';

/** Plain, readable legal page (public; linked from every footer). */
export function LegalPage({
  title,
  sections,
}: {
  title: string;
  sections: readonly { h: string; p: string }[];
}) {
  return (
    <main className="mx-auto max-w-[680px] px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-16">
      <Link href="/" className="text-xl">
        <Brand />
      </Link>
      <h1 className="font-display mt-8 text-[2rem] leading-tight font-semibold tracking-tight">
        {title}
      </h1>
      <p className="text-muted mt-1 text-sm">{copy.legal.updated}</p>
      {sections.map((s) => (
        <section key={s.h} className="mt-6">
          <h2 className="font-display text-xl font-semibold">{s.h}</h2>
          <p className="mt-2 leading-relaxed">{s.p}</p>
        </section>
      ))}
      <p className="text-muted mt-10 text-sm">{copy.legal.contact(SUPPORT_EMAIL)}</p>
    </main>
  );
}
