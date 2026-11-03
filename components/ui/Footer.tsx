import { copy } from '@/lib/copy';

/** Place-data attribution (OSM: ODbL; Overture: CDLA-Permissive-2.0 / Apache-2.0) and the privacy note. */
export function Footer({ className = '' }: { className?: string }) {
  return (
    <footer className={`text-muted text-xs ${className}`}>
      <p>
        Place data{' '}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          {copy.footer.osm}
        </a>
        {' · '}
        <a
          href="https://docs.overturemaps.org/attribution/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          {copy.footer.overture}
        </a>
      </p>
      <p className="mt-1">{copy.footer.privacy}</p>
    </footer>
  );
}
