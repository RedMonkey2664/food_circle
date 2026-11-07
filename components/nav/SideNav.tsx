'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CircleOpenLink } from '@/components/motion/CircleLink';
import { NavPill } from '@/components/motion/NavPill';
import {
  BookIcon,
  CompassIcon,
  HomeIcon,
  PersonIcon,
  PlusIcon,
  SearchIcon,
  TrophyIcon,
  UsersIcon,
} from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';
import { Logo } from '@/components/brand/Logo';

type Item = { href: string; label: string; Icon: typeof HomeIcon; match: (p: string) => boolean };

const ITEMS: Item[] = [
  { href: '/', label: copy.nav.home, Icon: HomeIcon, match: (p) => p === '/' },
  {
    href: '/search',
    label: copy.nav.search,
    Icon: SearchIcon,
    match: (p) => p.startsWith('/search'),
  },
  {
    href: '/discover',
    label: copy.nav.discover,
    Icon: CompassIcon,
    match: (p) => p.startsWith('/discover'),
  },
  { href: '/diary', label: copy.nav.diary, Icon: BookIcon, match: (p) => p.startsWith('/diary') },
  {
    href: '/achievements',
    label: copy.achieve.title,
    Icon: TrophyIcon,
    match: (p) => p.startsWith('/achievements'),
  },
  {
    href: '/friends',
    label: copy.nav.friends,
    Icon: UsersIcon,
    match: (p) => p.startsWith('/friends'),
  },
  {
    href: '/groups',
    label: copy.groups.title,
    Icon: GroupsIcon,
    match: (p) => p.startsWith('/groups'),
  },
  {
    href: '/me',
    label: copy.nav.me,
    Icon: PersonIcon,
    match: (p) => p.startsWith('/me') || p.startsWith('/u/'),
  },
];

function GroupsIcon(props: Parameters<typeof HomeIcon>[0]) {
  return (
    <svg
      width={props.size ?? 20}
      height={props.size ?? 20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={props.strokeWidth ?? 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
    >
      <circle cx="12" cy="7.5" r="3" />
      <circle cx="5.5" cy="10" r="2.2" />
      <circle cx="18.5" cy="10" r="2.2" />
      <path d="M7 20c.6-3 2.6-4.8 5-4.8s4.4 1.8 5 4.8M2 18.5c.4-1.9 1.6-3 3.3-3.2M22 18.5c-.4-1.9-1.6-3-3.3-3.2" />
    </svg>
  );
}

/** Live side nav (iPad/PC). Must sit inside <Suspense> (reads the URL). */
export function SideNav() {
  return <SideNavView pathname={usePathname()} />;
}

export function SideNavStatic() {
  return <SideNavView pathname={null} />;
}

/**
 * iPad (md): a slim icon rail with small labels. PC (lg): a full sidebar with the wordmark,
 * labelled links and a prominent Log button. Phones use BottomNav instead.
 */
function SideNavView({ pathname }: { pathname: string | null }) {
  if (pathname?.startsWith('/log')) return null;
  return (
    <nav
      aria-label="Main"
      className="border-line bg-surface/90 fixed inset-y-0 left-0 z-20 hidden w-[84px] flex-col border-r px-2 pt-[max(1.25rem,env(safe-area-inset-top))] pb-6 backdrop-blur md:flex lg:w-[248px] lg:px-4"
    >
      <Link
        href="/"
        className="font-display mb-6 flex h-12 items-center justify-center gap-2 text-2xl font-bold tracking-tight lg:justify-start lg:px-2"
      >
        <Logo size={44} />
        <span className="sr-only lg:not-sr-only">{copy.app.name}</span>
      </Link>

      <CircleOpenLink
        href="/log"
        aria-label={copy.nav.log}
        className="sk-log-btn bg-primary text-on-primary hover:bg-primary-press mx-auto mb-6 flex size-14 items-center justify-center rounded-full shadow-[0_8px_20px_-8px_rgb(176_20_27/0.55)] transition-[transform,background-color] duration-150 active:scale-[0.96] lg:mx-0 lg:h-12 lg:w-full lg:gap-2 lg:rounded-[var(--radius-button)]"
      >
        <PlusIcon size={22} strokeWidth={2.5} />
        <span className="hidden font-semibold lg:inline">{copy.nav.log}</span>
      </CircleOpenLink>

      <ul className="relative flex flex-col gap-1">
        <NavPill pathname={pathname} className="bg-primary-soft rounded-[var(--radius-button)]" />
        {ITEMS.map(({ href, label, Icon, match }) => {
          const active = pathname !== null && match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative z-[1] flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-button)] text-[11px] font-medium transition-colors duration-200',
                  'lg:min-h-12 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-[15px]',
                  active ? 'text-primary' : 'text-muted hover:text-ink',
                )}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
