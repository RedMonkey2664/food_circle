// The app mark: the SKOOP cat (sunglasses, slice of pizza) on cream. The artwork lives in
// public/brand/skoop-mark.png; icons and share images are rendered from it by next/og.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const BRAND_ORANGE = '#c2410c';
export const BRAND_CREAM = '#fffbf5';

let cached: Promise<string> | null = null;

/** The mark as a data URI, for next/og (server only). */
export function markDataUri(): Promise<string> {
  cached ??= readFile(join(process.cwd(), 'public', 'brand', 'skoop-mark.png')).then(
    (buf) => `data:image/png;base64,${buf.toString('base64')}`,
  );
  return cached;
}

/** `safe` shrinks the mark for maskable icons (Android crops to a circle). */
export function AppMark({
  size,
  src,
  safe = false,
}: {
  size: number;
  src: string;
  safe?: boolean;
}) {
  const art = Math.round(size * (safe ? 0.66 : 0.9));
  return (
    <div
      style={{
        width: size,
        height: size,
        background: BRAND_CREAM,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: safe ? 0 : Math.round(size * 0.22),
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- next/og renders plain <img> */}
      <img src={src} width={art} height={art} alt="" />
    </div>
  );
}
