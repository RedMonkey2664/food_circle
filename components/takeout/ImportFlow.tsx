'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, buttonClass } from '@/components/ui/Button';
import { VisibilityPicker } from '@/components/verdict/VisibilityPicker';
import {
  importTakeout,
  matchTakeout,
  type ImportEntry,
  type ImportMatch,
} from '@/lib/actions/takeout';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';
import { parseTakeout, verdictForStars, type TakeoutItem } from '@/lib/domain/takeout';
import type { Visibility } from '@/lib/domain/visibility';

type Row = TakeoutItem & {
  match: ImportMatch | null;
  include: boolean;
  verdict: 'go' | 'skip' | null;
};

const t = copy.takeout;
const chunk = <T,>(xs: T[], n: number) =>
  Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

/**
 * Google Takeout import: read the user's own file here, match to SKOOP places, let them check
 * every entry and pick the audience (Only me by default), then import.
 */
export function ImportFlow({
  isPrivateAccount,
  counts,
}: {
  isPrivateAccount: boolean;
  counts: { friends: number; followers: number };
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [bringText, setBringText] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setStatus(t.reading);
    setResult(null);
    const items: TakeoutItem[] = [];
    for (const f of Array.from(files)) {
      try {
        items.push(...parseTakeout(JSON.parse(await f.text())));
      } catch {
        // not JSON: ignored
      }
    }
    const seen = new Set<string>();
    const unique = items.filter((i) => {
      const k = `${i.kind}|${i.name.toLowerCase()}|${i.lat.toFixed(4)}|${i.lng.toFixed(4)}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    if (!unique.length) {
      setRows(null);
      setStatus(t.nothing);
      return;
    }
    setStatus(t.matching);
    const matches: (ImportMatch | null)[] = unique.map(() => null);
    let offset = 0;
    for (const part of chunk(unique, 300)) {
      const r = await matchTakeout(part.map(({ name, lat, lng }) => ({ name, lat, lng })));
      if (r.ok) for (const m of r.data) matches[offset + m.idx] = m;
      offset += part.length;
    }
    setRows(
      unique.map((i, n) => {
        const match = matches[n] ?? null;
        const verdict = verdictForStars(i.rating) as 'go' | 'skip' | null;
        const inIndia = i.lat >= 6 && i.lat <= 37.5 && i.lng >= 68 && i.lng <= 98;
        return {
          ...i,
          match,
          verdict,
          include:
            !match?.visited &&
            (match !== null || inIndia) &&
            (i.kind === 'saved' || verdict !== null),
        };
      }),
    );
    setStatus(null);
  }

  function update(n: number, patch: Partial<Row>) {
    setRows((rs) => rs?.map((r, i) => (i === n ? { ...r, ...patch } : r)) ?? null);
  }

  async function runImport() {
    if (!rows) return;
    const entries: ImportEntry[] = rows
      .filter((r) => r.include && (r.kind === 'saved' || r.verdict))
      .map((r) => ({
        ...(r.match
          ? { placeId: r.match.placeId }
          : { newPlace: { name: r.name, lat: r.lat, lng: r.lng } }),
        ...(r.kind === 'saved'
          ? { save: true }
          : {
              verdict: r.verdict ?? undefined,
              ...(r.date ? { visitedOn: r.date } : {}),
              ...(bringText && r.text ? { note: r.text } : {}),
            }),
      }));
    if (!entries.length) return;
    setBusy(true);
    const total = { logged: 0, saved: 0, added: 0, skipped: 0 };
    let done = 0;
    for (const part of chunk(entries, 50)) {
      setStatus(t.importing(done, entries.length));
      const r = await importTakeout({ visibility, entries: part });
      if (!r.ok) {
        setBusy(false);
        setStatus(t.failed);
        return;
      }
      total.logged += r.data.logged;
      total.saved += r.data.saved;
      total.added += r.data.added;
      total.skipped += r.data.skipped;
      done += part.length;
    }
    setBusy(false);
    setStatus(null);
    setRows(null);
    setResult(t.done(total));
  }

  if (result) {
    return (
      <div className="mt-6 space-y-4">
        <p
          className="bg-go-soft text-go rounded-[var(--radius-card)] p-4 font-semibold"
          role="status"
        >
          {result}
        </p>
        <Link href="/diary" className={buttonClass({})}>
          {t.openDiary}
        </Link>
      </div>
    );
  }

  const reviews = rows?.filter((r) => r.kind === 'review').length ?? 0;
  const saved = rows?.filter((r) => r.kind === 'saved').length ?? 0;
  const chosen = rows?.filter((r) => r.include && (r.kind === 'saved' || r.verdict)).length ?? 0;

  return (
    <div className="mt-5 space-y-6">
      {!rows ? (
        <section className="border-line bg-surface rounded-[var(--radius-card)] border p-4">
          <h2 className="font-display text-lg font-semibold">{t.stepsTitle}</h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm">
            {t.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <a
            href="https://takeout.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass({ variant: 'secondary', className: 'mt-4' })}
          >
            {t.openTakeout} ↗
          </a>
          <label className={buttonClass({ className: 'mt-3 w-full cursor-pointer' })}>
            {t.choose}
            <input
              type="file"
              accept=".json,application/json"
              multiple
              className="sr-only"
              onChange={(e) => void onFiles(e.target.files)}
            />
          </label>
          <p className="text-muted mt-2 text-xs">{t.privacy}</p>
        </section>
      ) : (
        <>
          <p className="font-semibold">{t.found(reviews, saved)}</p>

          <section>
            <h2 className="text-sm font-bold">{t.audience}</h2>
            <div className="mt-2">
              <VisibilityPicker
                value={visibility}
                onChange={setVisibility}
                isPrivateAccount={isPrivateAccount}
                counts={counts}
              />
            </div>
            <label className="mt-3 flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={bringText}
                onChange={(e) => setBringText(e.target.checked)}
                className="size-5"
              />
              {t.bringText}
            </label>
          </section>

          <ul className="divide-line border-line bg-surface divide-y rounded-[var(--radius-card)] border">
            {rows.map((r, n) => {
              const blocked = Boolean(r.match?.visited);
              return (
                <li
                  key={`${r.name}-${n}`}
                  className={cn('flex gap-3 p-3', blocked && 'opacity-60')}
                >
                  <input
                    type="checkbox"
                    aria-label={r.name}
                    checked={r.include}
                    disabled={blocked || (r.kind === 'review' && !r.verdict)}
                    onChange={(e) => update(n, { include: e.target.checked })}
                    className="mt-1 size-5 shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{r.name}</span>
                    <span className="text-muted block text-xs">
                      {blocked
                        ? t.already
                        : r.match
                          ? t.onSkoop(r.match.placeName, r.match.areaName)
                          : t.newPlace}
                    </span>
                    {r.kind === 'saved' ? (
                      <span className="text-cobalt mt-1 block text-sm font-semibold">
                        ★ {t.savedLabel}
                      </span>
                    ) : (
                      <span className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span aria-label={`${r.rating} stars`} className="text-sun text-sm">
                          {t.stars(r.rating ?? 0)}
                        </span>
                        {(['go', 'skip'] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            disabled={blocked}
                            aria-pressed={r.verdict === v}
                            onClick={() => update(n, { verdict: v, include: true })}
                            className={cn(
                              'min-h-9 rounded-full border px-3 text-xs font-bold',
                              r.verdict === v
                                ? v === 'go'
                                  ? 'border-go bg-go-soft text-go'
                                  : 'border-skip bg-skip-soft text-skip'
                                : 'border-line text-muted',
                            )}
                          >
                            {v === 'go' ? 'GO' : 'SKIP'}
                          </button>
                        ))}
                        {r.verdict === null ? (
                          <span className="text-muted text-xs">{t.pickVerdict}</span>
                        ) : null}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>

          <Button
            onClick={() => void runImport()}
            disabled={busy || chosen === 0}
            fullWidth
            size="lg"
          >
            {busy && status ? status : t.importBtn(chosen)}
          </Button>
        </>
      )}
      {status && !busy ? (
        <p role="status" className="text-muted text-sm">
          {status}
        </p>
      ) : null}
    </div>
  );
}
