import { Suspense } from 'react';
import { Button } from '@/components/ui/Button';
import { Footer } from '@/components/ui/Footer';
import { GoogleIcon } from '@/components/ui/icons';
import { PromisePreview } from '@/components/verdict/PromisePreview';
import { signInWithGoogle } from '@/lib/actions/auth';
import { copy } from '@/lib/copy';
import { devToolsEnabled } from '@/lib/dev';

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
  const errorText =
    params.error === 'provider'
      ? copy.login.providerOff
      : typeof params.error === 'string'
        ? copy.login.error
        : null;

  return (
    <form action={signInWithGoogle} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      {errorText ? (
        <p
          role="alert"
          className="bg-skip-soft text-skip rounded-[var(--radius-button)] px-3 py-2 text-sm"
        >
          {errorText}
        </p>
      ) : null}
      <GoogleButton />
    </form>
  );
}

export default function LoginPage(props: PageProps<'/login'>) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-4 pt-[max(2.5rem,env(safe-area-inset-top))] pb-6 md:max-w-[560px] md:pt-16 lg:grid lg:max-w-[1080px] lg:grid-cols-[minmax(0,1fr)_420px] lg:content-center lg:items-center lg:gap-16 lg:px-10">
      {/* PC: pitch + preview on the left, a sign-in card on the right. */}
      <div>
        <header>
          <p className="font-display text-primary text-xl font-semibold">{copy.login.title}</p>
          <h1 className="font-display text-hero mt-6 font-semibold tracking-tight text-balance">
            {copy.login.headline}
          </h1>
          <p className="text-muted mt-3 max-w-[34ch] text-lg">{copy.login.pitch}</p>
        </header>

        <div className="mt-8 lg:max-w-md">
          <PromisePreview />
        </div>
      </div>

      <div className="lg:border-line lg:bg-surface mt-auto pt-10 lg:mt-0 lg:rounded-[var(--radius-card)] lg:border lg:p-8 lg:shadow-[0_24px_60px_-40px_rgb(60_20_5/0.45)]">
        <Suspense fallback={<GoogleButton disabled />}>
          <LoginForm searchParams={props.searchParams} />
        </Suspense>
        <p className="text-muted mt-3 text-sm">{copy.login.privacy}</p>
        {devToolsEnabled() ? (
          <p className="mt-3 text-sm">
            <a href="/dev/login" className="text-primary underline underline-offset-2">
              Dev sign-in (local only)
            </a>
          </p>
        ) : null}
        <Footer className="mt-6" />
      </div>
    </main>
  );
}
