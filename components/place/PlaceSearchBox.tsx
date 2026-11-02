import { copy } from '@/lib/copy';

/** Search box: a plain GET form, so results are server-rendered and work without JS. */
export function PlaceSearchBox({
  query,
  action,
  hidden,
}: {
  query: string;
  action: string;
  hidden?: Record<string, string>;
}) {
  return (
    <form action={action} role="search" className="mt-3">
      {hidden
        ? Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)
        : null}
      <label htmlFor="place-q" className="sr-only">
        {copy.search.label}
      </label>
      <input
        id="place-q"
        name="q"
        type="search"
        defaultValue={query}
        placeholder={copy.search.placeholder}
        autoFocus
        autoComplete="off"
        enterKeyHint="search"
        className="border-line bg-surface focus:border-primary min-h-12 w-full rounded-[var(--radius-button)] border-2 px-3 focus:outline-none"
      />
    </form>
  );
}
