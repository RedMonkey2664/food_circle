import Link from 'next/link';
import { Suspense } from 'react';
import { CompanionPrompts } from '@/components/home/CompanionPrompts';
import { HomeAside } from '@/components/home/HomeAside';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Footer } from '@/components/ui/Footer';
import { VerdictCard } from '@/components/verdict/VerdictCard';
import { requireOnboardedUser } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';
import { homeFeed, type FeedTab } from '@/lib/data/feed';
import { myGroups, type MyGroup } from '@/lib/data/groups';

function tabHref(tab: FeedTab): string {
  if (tab === 'friends') return '/';
  if (tab === 'following') return '/?tab=following';
  return `/?group=${tab.slice('group:'.length)}`;
}

/** Friends and Following, then one tab per group (P3-05). Tiers stay separate feeds. */
function Tabs({ active, groups }: { active: FeedTab; groups: MyGroup[] }) {
  const tabs: { tab: FeedTab; label: string }[] = [
    { tab: 'friends', label: copy.home.tabs.friends },
    { tab: 'following', label: copy.home.tabs.following },
    ...groups.map((g) => ({ tab: `group:${g.id}` as FeedTab, label: g.name })),
  ];
  return (
    <nav
      aria-label={copy.home.feedLabel}
      className="border-line -mx-4 flex [scrollbar-width:none] overflow-x-auto border-b px-4"
    >
      {tabs.map(({ tab, label }) => (
        <Link
          key={tab}
          href={tabHref(tab)}
          aria-current={active === tab ? 'page' : undefined}
          className={cn(
            'flex min-h-11 shrink-0 grow basis-0 items-center justify-center border-b-2 px-3 font-medium whitespace-nowrap',
            active === tab ? 'border-primary text-primary' : 'text-muted border-transparent',
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Feed({ searchParams }: { searchParams: PageProps<'/'>['searchParams'] }) {
  const sp = await searchParams;
  const cursor = typeof sp.cursor === 'string' ? sp.cursor : undefined;
  await requireOnboardedUser();
  const groups = await myGroups();
  const groupId =
    typeof sp.group === 'string' && UUID_RE.test(sp.group) && groups.some((g) => g.id === sp.group)
      ? sp.group
      : null;
  const tab: FeedTab = groupId
    ? `group:${groupId}`
    : sp.tab === 'following'
      ? 'following'
      : 'friends';
  const page = await homeFeed(tab, cursor);
  const t = copy.home;

  return (
    <>
      {!cursor ? <CompanionPrompts /> : null}
      <Tabs active={tab} groups={groups} />
      {page.items.length === 0 && !cursor ? (
        <div className="mt-6">
          {groupId ? (
            <EmptyState
              title={t.emptyGroupTitle}
              body={t.emptyGroupBody}
              action={
                <Link href={`/groups/${groupId}`} className={buttonClass({ variant: 'secondary' })}>
                  {copy.groups.manage}
                </Link>
              }
            />
          ) : tab === 'friends' ? (
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
          href={`/?${new URLSearchParams({
            ...(tab === 'following' ? { tab } : {}),
            ...(groupId ? { group: groupId } : {}),
            cursor: page.nextCursor,
          })}`}
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
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-10">
      <main className="min-w-0">
        <header className="flex items-center justify-between py-2">
          <h1 className="font-display text-primary text-2xl font-semibold md:sr-only">
            {copy.app.name}
          </h1>
          <div className="flex items-center gap-1 md:hidden">
            <Link
              href="/search"
              className={buttonClass({ variant: 'ghost', className: 'text-sm' })}
            >
              {copy.nav.search}
            </Link>
            <Link
              href="/friends"
              className={buttonClass({ variant: 'ghost', className: 'text-sm' })}
            >
              {copy.friends.title}
            </Link>
          </div>
        </header>
        <Suspense
          fallback={
            <div aria-busy="true" className="mt-4 space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-line/60 h-24 animate-pulse rounded-[var(--radius-card)]"
                />
              ))}
            </div>
          }
        >
          <Feed searchParams={props.searchParams} />
        </Suspense>
        <Footer className="mt-10" />
      </main>
      <aside className="sticky top-8 hidden lg:block">
        <Suspense
          fallback={
            <div
              aria-busy="true"
              className="bg-line/60 h-64 animate-pulse rounded-[var(--radius-card)]"
            />
          }
        >
          <HomeAside />
        </Suspense>
      </aside>
    </div>
  );
}
