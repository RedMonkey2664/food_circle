// The app mark: a cream ring with a dot on spice orange (a "circle" of people around a place).
// Rendered to PNG by next/og at build time; no binary icon files in the repo.
export const BRAND_ORANGE = '#c2410c';
export const BRAND_CREAM = '#fffbf5';

/** `safe` shrinks the mark for maskable icons (Android crops to a circle). */
export function AppMark({ size, safe = false }: { size: number; safe?: boolean }) {
  const ring = Math.round(size * (safe ? 0.42 : 0.56));
  const stroke = Math.max(2, Math.round(size * (safe ? 0.06 : 0.08)));
  const dot = Math.round(size * (safe ? 0.12 : 0.16));
  return (
    <div
      style={{
        width: size,
        height: size,
        background: BRAND_ORANGE,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: safe ? 0 : Math.round(size * 0.22),
      }}
    >
      <div
        style={{
          width: ring,
          height: ring,
          borderRadius: '50%',
          border: `${stroke}px solid ${BRAND_CREAM}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: dot, height: dot, borderRadius: '50%', background: BRAND_CREAM }} />
      </div>
    </div>
  );
}
