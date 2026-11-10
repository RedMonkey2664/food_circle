import Link from 'next/link';
import { PersonRow } from '@/components/social/PersonRow';
import { SearchIcon } from '@/components/ui/icons';
import { copy } from '@/lib/copy';
import { discoverPeople } from '@/lib/data/discover';
import { myGroups } from '@/lib/data/groups';

/**
 * PC-only side column on Home: jump into a group feed, people worth following, and a
 * search shortcut. Hidden below lg (phones and iPad keep a single focused column).
 */
export async function HomeAside() {
  const [groups, people] = await Promise.all([myGroups(), discoverPeople('suggested', null, 4)]);
  const t = copy.home;
  return (
    <div className="space-y-6">
      <form action="/search" role="search" className="relative">
        <label htmlFor="aside-q" className="sr-only">
          {copy.search.label}
        </label>
        <SearchIcon
          size={18}
          className="text-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
        />
        <input
          id="aside-q"
          name="q"
          type="search"
          placeholder={copy.search.placeholder}
          autoComplete="off"
          className="border-line bg-surface focus:border-primary min-h-11 w-full rounded-[var(--radius-button)] border-2 pr-3 pl-9 text-sm focus:outline-none"
        />
      </form>

      <section className="border-line bg-surface rounded-[var(--radius-card)] border p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display font-semibold">{copy.groups.title}</h2>
          <Link href="/groups" className="text-primary text-sm font-semibold">
            {copy.groups.seeAll}
          </Link>
        </div>
        {groups.length === 0 ? (
          <p className="text-muted mt-2 text-sm">{copy.groups.emptyBody}</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {groups.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/?group=${g.id}`}
                  className="hover:bg-bg -mx-2 flex min-h-11 items-center justify-between rounded-[var(--radius-button)] px-2 transition-colors duration-(--dur-tap)"
                >
                  <span className="truncate font-medium">{g.name}</span>
                  <span className="text-muted text-xs">{copy.groups.members(g.memberCount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {people.length > 0 ? (
        <section className="border-line bg-surface rounded-[var(--radius-card)] border px-4 pt-4 pb-2">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display font-semibold">{t.findPeople}</h2>
            <Link href="/discover" className="text-primary text-sm font-semibold">
              {copy.nav.discover}
            </Link>
          </div>
          <ul className="divide-line divide-y">
            {people.map((p) => (
              <PersonRow key={p.id} person={p} meta={copy.discover.places(p.score)} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
