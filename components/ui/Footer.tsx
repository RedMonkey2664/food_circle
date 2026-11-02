import { copy } from '@/lib/copy';

/** OSM attribution (ODbL) and the privacy note, on every screen. */
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
      </p>
      <p className="mt-1">{copy.footer.privacy}</p>
    </footer>
  );
}
