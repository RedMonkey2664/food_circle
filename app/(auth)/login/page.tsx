import { Suspense } from 'react';
import { Button } from '@/components/ui/Button';
import { Footer } from '@/components/ui/Footer';
import { GoogleIcon } from '@/components/ui/icons';
import { PromisePreview } from '@/components/verdict/PromisePreview';
import { signInWithGoogle } from '@/lib/actions/auth';
import { copy } from '@/lib/copy';

export const metadata = { title: 'Sign in' };

function GoogleButton({ disabled = false }: { disabled?: boolean }) {
  return (
    <Button type="submit" variant="secondary" size="lg" fullWidth disabled={disabled}>
      <GoogleIcon />
      {copy.login.google}
    </Button>
  );
}

async function LoginForm({ searchParams }: { searchParams: PageProps<'/login'>['searchParams'] }) {
  const params = await searchParams;
  const next = typeof params.next === 'string' ? params.next : '';
  const hasError = typeof params.error === 'string';

  return (
    <form action={signInWithGoogle} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      {hasError ? (
        <p
          role="alert"
          className="bg-skip-soft text-skip rounded-[var(--radius-button)] px-3 py-2 text-sm"
        >
          {copy.login.error}
        </p>
      ) : null}
      <GoogleButton />
    </form>
  );
}

export default function LoginPage(props: PageProps<'/login'>) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-4 pt-[max(2.5rem,env(safe-area-inset-top))] pb-6">
      <header>
        <p className="font-display text-primary text-xl font-semibold">{copy.login.title}</p>
        <h1 className="font-display text-hero mt-6 font-semibold tracking-tight text-balance">
          {copy.login.headline}
        </h1>
        <p className="text-muted mt-3 max-w-[34ch] text-lg">{copy.login.pitch}</p>
      </header>

      <div className="mt-8">
        <PromisePreview />
      </div>

      <div className="mt-auto pt-10">
        <Suspense fallback={<GoogleButton disabled />}>
          <LoginForm searchParams={props.searchParams} />
        </Suspense>
        <p className="text-muted mt-3 text-sm">{copy.login.privacy}</p>
        <Footer className="mt-6" />
      </div>
    </main>
  );
}
