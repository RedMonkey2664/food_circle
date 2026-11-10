/**
 * Theme animation: RANSOM FLIP. A number set as cut-out letter tiles, like the sign-in
 * wordmark; inside a revealed card the tiles flip up one by one (CSS .sk-tile). Plain markup:
 * correct without JavaScript, and static under reduced motion. Screen readers get the number.
 */
export function RansomNumber({ value }: { value: number }) {
  const text = value.toLocaleString('en-IN');
  let tile = 0;
  return (
    <span className="inline-flex items-baseline" style={{ fontVariantNumeric: 'tabular-nums' }}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="inline-flex items-baseline">
        {[...text].map((ch, i) =>
          /\d/.test(ch) ? (
            <span key={i} className="sk-tile" style={{ '--i': tile++ } as React.CSSProperties}>
              {ch}
            </span>
          ) : (
            <span key={i}>{ch}</span>
          ),
        )}
      </span>
    </span>
  );
}
