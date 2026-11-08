'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CircleOpenLink } from '@/components/motion/CircleLink';
import { BookIcon, CompassIcon, HomeIcon, PersonIcon, PlusIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';

// Home, Discover, + Log, Diary, Me (Phase 5). Friends is one tap away from Home and Me.
const items = {
  home: { href: '/', label: copy.nav.home, Icon: HomeIcon },
  discover: { href: '/discover', label: copy.nav.discover, Icon: CompassIcon },
  diary: { href: '/diary', label: copy.nav.diary, Icon: BookIcon },
  me: { href: '/me', label: copy.nav.me, Icon: PersonIcon },
} as const;

/** Live nav: highlights the current section. Must sit inside <Suspense> (reads the URL). */
export function BottomNav() {
  return <BottomNavView pathname={usePathname()} />;
}

/** Static nav for the prerendered shell (no active state until the URL is known). */
export function BottomNavStatic() {
  return <BottomNavView pathname={null} />;
}

/** Grid column (0-4) of the active tab; the Log button sits in column 2. */
function activeColumn(pathname: string | null): number | null {
  if (!pathname) return null;
  if (pathname === '/') return 0;
  if (pathname.startsWith('/discover')) return 1;
  if (pathname.startsWith('/diary')) return 3;
  if (pathname.startsWith('/me') || pathname.startsWith('/u/')) return 4;
  return null;
}

function BottomNavView({ pathname }: { pathname: string | null }) {
  // The log screen is a full-screen takeover with its own close button.
  if (pathname?.startsWith('/log')) return null;
  const col = activeColumn(pathname);
  return (
    <nav
      aria-label="Main"
      className="border-line bg-surface/90 fixed inset-x-0 bottom-0 z-20 border-t pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_-24px_rgb(60_25_5/0.5)] backdrop-blur md:hidden"
    >
      <ul className="relative mx-auto grid max-w-[480px] grid-cols-5 items-center px-2">
        {/* The highlight's place comes from the active column (no measuring), and it glides
            there with a springy transition. Columns are 1/5 of the padded row. */}
        <span
          aria-hidden
          className="sk-tab-glide pointer-events-none absolute top-0 left-2 flex h-14 w-[calc((100%-1rem)/5)] justify-center"
          style={{
            transform: `translateX(${(col ?? 0) * 100}%)`,
            opacity: col === null ? 0 : 1,
          }}
        >
          <span className="bg-primary-soft mt-[3px] h-8 w-[50px] rounded-full" />
        </span>
        <NavItem {...items.home} active={pathname === '/'} />
        <NavItem {...items.discover} active={!!pathname?.startsWith('/discover')} />
        <li className="flex justify-center">
          <CircleOpenLink
            href="/log"
            aria-label={copy.nav.log}
            className="bg-primary text-on-primary relative z-[1] -mt-5 flex size-14 items-center justify-center rounded-full shadow-[0_6px_16px_-6px_rgb(176_20_27/0.55)] transition-transform duration-150 active:scale-[0.94]"
          >
            <PlusIcon size={26} strokeWidth={2.5} />
          </CircleOpenLink>
        </li>
        <NavItem {...items.diary} active={!!pathname?.startsWith('/diary')} />
        <NavItem
          {...items.me}
          active={!!pathname && (pathname.startsWith('/me') || pathname.startsWith('/u/'))}
        />
      </ul>
    </nav>
  );
}

function NavItem({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: typeof HomeIcon;
  active: boolean;
}) {
  return (
    <li className="flex justify-center">
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'relative z-[1] flex min-h-14 min-w-14 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors duration-200',
          active ? 'text-primary' : 'text-muted',
        )}
      >
        <Icon size={22} strokeWidth={active ? 2.4 : 2} />
        {label}
      </Link>
    </li>
  );
}
