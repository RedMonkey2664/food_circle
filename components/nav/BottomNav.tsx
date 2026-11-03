'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CircleOpenLink } from '@/components/motion/CircleLink';
import { CompassIcon, HomeIcon, PersonIcon, PlusIcon, UsersIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';

// Home, Discover, + Log, Friends, Me. Friends sits where Diary arrives in Phase 5.
const items = {
  home: { href: '/', label: copy.nav.home, Icon: HomeIcon },
  discover: { href: '/discover', label: copy.nav.discover, Icon: CompassIcon },
  friends: { href: '/friends', label: copy.nav.friends, Icon: UsersIcon },
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

function BottomNavView({ pathname }: { pathname: string | null }) {
  // The log screen is a full-screen takeover with its own close button.
  if (pathname?.startsWith('/log')) return null;
  return (
    <nav
      aria-label="Main"
      className="border-line bg-surface/95 fixed inset-x-0 bottom-0 z-20 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto grid max-w-[480px] grid-cols-5 items-center px-2">
        <NavItem {...items.home} active={pathname === '/'} />
        <NavItem {...items.discover} active={!!pathname?.startsWith('/discover')} />
        <li className="flex justify-center">
          <CircleOpenLink
            href="/log"
            aria-label={copy.nav.log}
            className="bg-primary text-on-primary -mt-5 flex size-14 items-center justify-center rounded-full shadow-[0_6px_16px_-6px_rgb(194_65_12/0.6)] transition-transform duration-150 active:scale-[0.94]"
          >
            <PlusIcon size={26} strokeWidth={2.5} />
          </CircleOpenLink>
        </li>
        <NavItem {...items.friends} active={!!pathname?.startsWith('/friends')} />
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
          'flex min-h-14 min-w-14 flex-col items-center justify-center gap-0.5 text-xs font-medium',
          active ? 'text-primary' : 'text-muted',
        )}
      >
        <Icon size={22} strokeWidth={active ? 2.4 : 2} />
        {label}
      </Link>
    </li>
  );
}
