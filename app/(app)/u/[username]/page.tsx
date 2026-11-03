import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Avatar } from '@/components/social/Avatar';
import { ProfileMenu } from '@/components/social/ProfileMenu';
import { RelationshipActions } from '@/components/social/RelationshipActions';
import { Button, buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { VerdictCard } from '@/components/verdict/VerdictCard';
import { signOut } from '@/lib/actions/auth';
import { requireOnboardedUser } from '@/lib/auth';
import { copy } from '@/lib/copy';
import { profileByUsername, profileStats, recentVisitsBy } from '@/lib/data/profile';
import { refreshMyTasteMatches } from '@/lib/data/discover';
import { myGraph } from '@/lib/data/social';
import { relationshipWith } from '@/lib/domain/relationship';

function Stat({ value, label, href }: { value: number; label: string; href?: string }) {
  const inner = (
    <>
      <span className="font-display block text-xl font-semibold">{value}</span>
      <span className="text-muted text-xs">{label}</span>
    </>
  );
  return href ? (
    <Link
      href={href}
      className="hover:bg-primary-soft block rounded-[var(--radius-button)] py-1 text-center"
    >
      {inner}
    </Link>
  ) : (
    <div className="py-1 text-center">{inner}</div>
  );
}

async function ProfileContent({ params }: { params: PageProps<'/u/[username]'>['params'] }) {
  const { username } = await params;
  const me = await requireOnboardedUser();
  const profile = await profileByUsername(decodeURIComponent(username));
  if (!profile) notFound();

  const isSelf = profile.id === me.id;
  // Lazy taste-match refresh on profile view (P2-03).
  if (!isSelf) await refreshMyTasteMatches();
  const [stats, graph, visits] = await Promise.all([
    profileStats(profile.id),
    myGraph(),
    recentVisitsBy(profile.id),
  ]);
  const rel = relationshipWith(me.id, profile.id, graph.friendships, graph.follows);
  const canSeeEntries =
    isSelf || !profile.isPrivate || rel.friend === 'friends' || rel.follow === 'following';
  const t = copy.profile;
  const listBase = `/u/${profile.username}`;

  return (
    <>
      <header className="flex items-start gap-4 pt-2">
        <Avatar name={profile.displayName} url={profile.avatarUrl} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display truncate text-2xl font-semibold">{profile.displayName}</h1>
          <p className="text-muted truncate text-sm">
            @{profile.username}
            {profile.homeArea ? `, ${profile.homeArea}` : ''}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {rel.friend === 'friends' ? (
              <span className="bg-primary text-on-primary rounded-[var(--radius-pill)] px-2 py-0.5 text-xs font-bold">
                {t.friendsBadge}
              </span>
            ) : null}
            {stats.matchRate !== null ? (
              <span className="bg-go-soft text-go rounded-[var(--radius-pill)] px-2 py-0.5 text-xs font-semibold">
                {t.match(stats.matchRate, stats.sharedPlaces ?? 0)}
              </span>
            ) : null}
            {rel.followsYou ? (
              <span className="bg-following-bg text-following-fg rounded-[var(--radius-pill)] px-2 py-0.5 text-xs font-semibold">
                {t.followsYou}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {profile.bio ? <p className="mt-3 whitespace-pre-wrap">{profile.bio}</p> : null}

      <div className="border-line bg-surface mt-4 grid grid-cols-5 rounded-[var(--radius-card)] border">
        <Stat value={stats.placesVisible} label={t.stats.places} />
        <Stat value={stats.areasVisible} label={t.stats.areas} />
        <Stat
          value={stats.friends}
          label={t.stats.friends}
          href={isSelf ? '/friends' : undefined}
        />
        <Stat
          value={stats.followers}
          label={t.stats.followers}
          href={isSelf ? `${listBase}/followers` : undefined}
        />
        <Stat
          value={stats.following}
          label={t.stats.following}
          href={isSelf ? `${listBase}/following` : undefined}
        />
      </div>

      <div className="mt-4 flex items-start gap-2">
        {isSelf ? (
          <>
            <Link
              href="/friends"
              className={buttonClass({ variant: 'secondary', className: 'flex-1' })}
            >
              {copy.friends.title}
            </Link>
            <form action={signOut}>
              <Button type="submit" variant="ghost">
                {copy.auth.signOut}
              </Button>
            </form>
          </>
        ) : (
          <>
            <div className="flex flex-1 flex-wrap justify-start gap-2">
              <RelationshipActions userId={profile.id} rel={rel} path={listBase} />
            </div>
            <ProfileMenu
              userId={profile.id}
              displayName={profile.displayName}
              isFriend={rel.friend === 'friends'}
              followsYou={rel.followsYou}
            />
          </>
        )}
      </div>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">{t.recent}</h2>
        {!canSeeEntries ? (
          <div className="mt-3">
            <EmptyState title={t.privateTitle} body={t.privateBody} />
          </div>
        ) : visits.length === 0 ? (
          <p className="text-muted mt-3">{isSelf ? t.emptySelf : t.emptyOther}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {visits.map((v) => (
              <li key={v.visitId}>
                <VerdictCard data={isSelf ? v : { ...v, ownVisibility: undefined }} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export async function generateMetadata(props: PageProps<'/u/[username]'>) {
  const { username } = await props.params;
  return { title: `@${decodeURIComponent(username)}` };
}

export default function ProfilePage(props: PageProps<'/u/[username]'>) {
  return (
    <main>
      <Suspense
        fallback={
          <div aria-busy="true" className="space-y-3 pt-2">
            <div className="flex items-center gap-4">
              <div className="bg-line size-[72px] animate-pulse rounded-full" />
              <div className="bg-line h-6 w-40 animate-pulse rounded-md" />
            </div>
            <div className="bg-line/60 h-16 animate-pulse rounded-[var(--radius-card)]" />
          </div>
        }
      >
        <ProfileContent params={props.params} />
      </Suspense>
    </main>
  );
}
