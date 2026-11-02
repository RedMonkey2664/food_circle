import { Suspense } from 'react';
import Link from 'next/link';
import { Button, buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Footer } from '@/components/ui/Footer';
import { requireUser } from '@/lib/auth';
import { signOut } from '@/lib/actions/auth';
import { copy } from '@/lib/copy';

async function Greeting() {
  const user = await requireUser();
  return <p className="text-muted text-sm">{copy.home.signedInAs(user.displayName)}</p>;
}

// Phase 0: an empty home screen. The Friends / Following feed arrives in Phase 1.
export default function HomePage() {
  return (
    <main>
      <header className="flex items-center justify-between py-2">
        <h1 className="font-display text-primary text-2xl font-semibold">{copy.app.name}</h1>
        <div className="flex items-center gap-1">
          <Link href="/search" className={buttonClass({ variant: 'ghost', className: 'text-sm' })}>
            {copy.nav.search}
          </Link>
          <Link href="/friends" className={buttonClass({ variant: 'ghost', className: 'text-sm' })}>
            {copy.friends.title}
          </Link>
          <form action={signOut}>
            <Button type="submit" variant="ghost" className="text-muted text-sm">
              {copy.auth.signOut}
            </Button>
          </form>
        </div>
      </header>
      <Suspense fallback={<p className="h-5" />}>
        <Greeting />
      </Suspense>

      <div className="mt-6">
        <EmptyState
          title={copy.home.emptyTitle}
          body={copy.home.emptyBody}
          action={
            <Link href="/friends?tab=find" className={buttonClass()}>
              {copy.home.findFriends}
            </Link>
          }
        />
      </div>

      <Footer className="mt-10" />
    </main>
  );
}
