import Link from 'next/link';
import { Suspense } from 'react';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Footer } from '@/components/ui/Footer';
import { VerdictCard } from '@/components/verdict/VerdictCard';
import { requireOnboardedUser } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';
import { homeFeed, type FeedTab } from '@/lib/data/feed';

const TABS: FeedTab[] = ['friends', 'following'];

function Tabs({ active }: { active: FeedTab }) {
  return (
    <nav aria-label={copy.home.feedLabel} className="border-line grid grid-cols-2 border-b">
      {TABS.map((t) => (
        <Link
          key={t}
          href={t === 'friends' ? '/' : '/?tab=following'}
          aria-current={active === t ? 'page' : undefined}
          className={cn(
            'flex min-h-11 items-center justify-center border-b-2 font-medium',
            active === t ? 'border-primary text-primary' : 'text-muted border-transparent',
          )}
        >
          {copy.home.tabs[t]}
        </Link>
      ))}
    </nav>
  );
}

async function Feed({ searchParams }: { searchParams: PageProps<'/'>['searchParams'] }) {
  const sp = await searchParams;
  const tab: FeedTab = sp.tab === 'following' ? 'following' : 'friends';
  const cursor = typeof sp.cursor === 'string' ? sp.cursor : undefined;
  await requireOnboardedUser();
  const page = await homeFeed(tab, cursor);
  const t = copy.home;

  return (
    <>
      <Tabs active={tab} />
      {page.items.length === 0 && !cursor ? (
        <div className="mt-6">
          {tab === 'friends' ? (
            <EmptyState
              title={t.emptyTitle}
              body={t.emptyFriendsBody}
              action={
                <div className="flex flex-wrap gap-2">
                  <Link href="/friends?tab=find" className={buttonClass()}>
                    {t.findFriends}
                  </Link>
                  <Link href="/log" className={buttonClass({ variant: 'secondary' })}>
                    {t.logFirst}
                  </Link>
                </div>
              }
            />
          ) : (
            <EmptyState
              title={t.emptyFollowingTitle}
              body={t.emptyFollowingBody}
              action={
                <Link href="/friends?tab=find" className={buttonClass()}>
                  {t.findPeople}
                </Link>
              }
            />
          )}
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {page.items.map((item) => (
            <li key={item.visitId}>
              <VerdictCard data={item} />
            </li>
          ))}
        </ul>
      )}
      {page.nextCursor ? (
        <Link
          href={`/?${new URLSearchParams({ ...(tab === 'following' ? { tab } : {}), cursor: page.nextCursor })}`}
          className={buttonClass({ variant: 'ghost', fullWidth: true, className: 'mt-4' })}
        >
          {t.older}
        </Link>
      ) : null}
    </>
  );
}

export default function HomePage(props: PageProps<'/'>) {
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
        </div>
      </header>
      <Suspense
        fallback={
          <div aria-busy="true" className="mt-4 space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-line/60 h-24 animate-pulse rounded-[var(--radius-card)]" />
            ))}
          </div>
        }
      >
        <Feed searchParams={props.searchParams} />
      </Suspense>
      <Footer className="mt-10" />
    </main>
  );
}
