'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { CloseIcon, SearchIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';
import type { PlaceSearchResult } from '@/lib/data/places';
import { PLACE_TYPE_LABEL } from '@/lib/domain/place';
import { DietBadges } from './DietBadges';
import { RecentPlaces } from './RecentPlaces';

type Mode = 'place' | 'log';
const DEBOUNCE_MS = 90;
const SPINNER_AFTER_MS = 180;

const hrefFor = (mode: Mode, id: string) => (mode === 'log' ? `/log?place=${id}` : `/place/${id}`);

/** Bold the part of the name that matches what was typed (case-insensitive). */
function Highlight({ text, query }: { text: string; query: string }): ReactNode {
  const q = query.trim().toLowerCase();
  const at = q ? text.toLowerCase().indexOf(q) : -1;
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <mark className="text-ink bg-transparent font-bold">{text.slice(at, at + q.length)}</mark>
      {text.slice(at + q.length)}
    </>
  );
}

/**
 * Search-as-you-type for places (combobox pattern). Without JS it is a plain GET form, and the
 * server renders full results for ?q=. With JS, suggestions update on every keystroke.
 */
export function PlaceSearch({
  mode,
  action,
  initialQuery,
  initialResults,
}: {
  mode: Mode;
  action: string;
  initialQuery: string;
  initialResults: PlaceSearchResult[] | null;
}) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  // Seeded with the server-rendered results so the first render isn't refetched.
  const cache = useRef<Map<string, PlaceSearchResult[]> | null>(null);
  cache.current ??= new Map(
    initialResults ? [[initialQuery.trim().toLowerCase(), initialResults]] : [],
  );
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<PlaceSearchResult[] | null>(initialResults);
  const [shownFor, setShownFor] = useState(initialQuery.trim());
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  // Bumped only when a list appears from nothing, so the entrance animation doesn't replay
  // on every keystroke.
  const [entrance, setEntrance] = useState(0);

  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < 2) return;
    const key = trimmed.toLowerCase();
    const cached = cache.current?.get(key);
    if (cached) {
      setResults((prev) => {
        if (!prev?.length && cached.length) setEntrance((n) => n + 1);
        return cached;
      });
      setShownFor(trimmed);
      setActive(-1);
      return;
    }
    const controller = new AbortController();
    const spinner = window.setTimeout(() => setLoading(true), SPINNER_AFTER_MS);
    const timer = window.setTimeout(async () => {
      try {
        // The city (cookie) is part of the URL only so cached suggestions differ per city.
        const city = /(?:^|; )skoop_near=([^;|]*)/.exec(document.cookie)?.[1] ?? '';
        const res = await fetch(`/api/places/suggest?q=${encodeURIComponent(trimmed)}&c=${city}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const body = (await res.json()) as { results?: PlaceSearchResult[] };
        const next = body.results ?? [];
        cache.current?.set(key, next);
        setResults((prev) => {
          if (!prev?.length && next.length) setEntrance((n) => n + 1);
          return next;
        });
        setShownFor(trimmed);
        setActive(-1);
      } catch {
        // aborted by a newer keystroke, or offline: keep showing the previous list
      } finally {
        window.clearTimeout(spinner);
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
      window.clearTimeout(spinner);
    };
  }, [trimmed]);

  const typing = trimmed.length >= 2;
  const list = typing ? (results ?? []) : [];
  const open = typing && results !== null;

  function choose(i: number) {
    const r = list[i];
    if (r) router.push(hrefFor(mode, r.id));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || list.length === 0) {
      if (e.key === 'Escape') setQuery('');
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % list.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? list.length - 1 : i - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      choose(active);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (active >= 0) setActive(-1);
      else setQuery('');
    }
  }

  function setAndFocus(value: string) {
    setQuery(value);
    inputRef.current?.focus();
  }

  return (
    <div>
      <form action={action} role="search" className="mt-3">
        <label htmlFor={`${listId}-q`} className="sr-only">
          {copy.search.label}
        </label>
        <div className="relative">
          <SearchIcon
            size={20}
            aria-hidden
            className="text-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
          />
          <input
            ref={inputRef}
            id={`${listId}-q`}
            name="q"
            type="search"
            role="combobox"
            aria-expanded={open && list.length > 0}
            aria-controls={`${listId}-list`}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={copy.search.placeholder}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            className="border-line bg-surface focus:border-primary min-h-12 w-full rounded-[var(--radius-button)] border-2 pr-12 pl-10 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          <div className="absolute top-1/2 right-1 flex -translate-y-1/2 items-center">
            {loading ? (
              <span
                aria-hidden
                className="border-line border-t-primary mr-3 size-4 animate-spin rounded-full border-2"
              />
            ) : query ? (
              <button
                type="button"
                onClick={() => setAndFocus('')}
                aria-label={copy.search.clear}
                className="text-muted hover:text-ink flex size-10 items-center justify-center rounded-full"
              >
                <CloseIcon size={18} />
              </button>
            ) : null}
          </div>
        </div>
      </form>

      <p aria-live="polite" className="sr-only">
        {loading ? copy.search.searching : open ? copy.search.resultsCount(list.length) : ''}
      </p>

      {!typing ? (
        <>
          <div className="mt-4">
            <h2 className="text-muted text-xs font-bold tracking-wide uppercase">
              {copy.search.tryTitle}
            </h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {copy.search.tryChips.map((chip) => (
                <li key={chip}>
                  <button
                    type="button"
                    onClick={() => setAndFocus(chip)}
                    className="border-line bg-surface hover:border-primary active:bg-primary-soft min-h-10 rounded-full border px-3.5 text-sm font-medium transition-colors duration-150"
                  >
                    {chip}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <RecentPlaces title={copy.search.recent} hrefFor={(id) => hrefFor(mode, id)} />
        </>
      ) : open && list.length === 0 ? (
        <p className="text-muted mt-4 text-sm">
          {copy.search.noMatch(shownFor)}{' '}
          <Link
            href={`/add-place?name=${encodeURIComponent(shownFor)}`}
            className="text-primary font-semibold"
          >
            {copy.search.addIt}
          </Link>
        </p>
      ) : (
        <ul
          id={`${listId}-list`}
          role="listbox"
          aria-label={copy.search.label}
          className={cn(
            'divide-line mt-2 divide-y transition-opacity duration-150',
            loading && 'opacity-60',
          )}
        >
          {list.map((r, i) => (
            <li
              key={`${entrance}-${r.id}`}
              id={`${listId}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              className="motion-safe:animate-suggest-in"
              style={{ animationDelay: `${Math.min(i, 7) * 18}ms` }}
            >
              <Link
                href={hrefFor(mode, r.id)}
                prefetch={false}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  '-mx-2 flex min-h-14 flex-col justify-center gap-0.5 rounded-[var(--radius-button)] px-2 py-2.5 transition-colors duration-100',
                  i === active ? 'bg-primary-soft' : 'active:bg-primary-soft',
                )}
              >
                <span className="text-ink/75 font-medium">
                  <Highlight text={r.name} query={shownFor} />
                </span>
                <span className="text-muted text-sm">
                  {[PLACE_TYPE_LABEL[r.type], r.areaName].filter(Boolean).join(' · ')}
                </span>
                {r.dietFlags.length > 0 ? <DietBadges flags={r.dietFlags} /> : null}
              </Link>
            </li>
          ))}
          {mode === 'place' && list.length === 8 ? (
            <li>
              <Link
                href={`/search?q=${encodeURIComponent(shownFor)}`}
                className="text-primary flex min-h-12 items-center text-sm font-semibold"
              >
                {copy.search.seeAll(shownFor)}
              </Link>
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
