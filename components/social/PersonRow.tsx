import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Person } from '@/lib/data/social';
import { Avatar } from './Avatar';

/** Avatar, name, @username and a slot for relationship buttons (UI_UX.md §3). */
export function PersonRow({
  person,
  meta,
  children,
}: {
  person: Person;
  meta?: string;
  children?: ReactNode;
}) {
  return (
    <li className="flex min-h-16 items-center gap-3 py-2">
      <Link href={`/u/${person.username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={person.displayName} url={person.avatarUrl} />
        <span className="min-w-0">
          <span className="block truncate font-semibold">{person.displayName}</span>
          <span className="text-muted block truncate text-sm">
            @{person.username}
            {person.isPrivate ? ' · private' : ''}
            {meta ? ` · ${meta}` : ''}
          </span>
        </span>
      </Link>
      {children ? <div className="flex shrink-0 items-start gap-2">{children}</div> : null}
    </li>
  );
}
