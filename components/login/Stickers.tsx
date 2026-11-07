// Hand-drawn SVG pieces for the sign-in "scrapbook": sunflower, stars, GO stamp, cat mascot,
// ribbon and doodles. The food and the eyes are cut-out images in public/login.
// Everything here is decorative and hidden from screen readers.

/** Shared filters and patterns. Render once per page, before any sticker. */
export function StickerDefs() {
  return (
    <svg width="0" height="0" aria-hidden focusable="false" className="absolute">
      <defs>
        {/* Wobbly, inked edges for the rubber stamp. */}
        <filter id="fc-rough" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="3.2" />
        </filter>
      </defs>
    </svg>
  );
}

/** Rubber stamp: the product's favourite word. */
export function GoStamp({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 120 120">
      <g filter="url(#fc-rough)" fill="none" stroke="#15803d">
        <circle cx="60" cy="60" r="52" strokeWidth="5" />
        <circle cx="60" cy="60" r="43" strokeWidth="1.8" strokeDasharray="4 5" />
        <text
          x="60"
          y="72"
          textAnchor="middle"
          fill="#15803d"
          stroke="none"
          fontSize="36"
          fontWeight="800"
          fontFamily="var(--font-inter), system-ui, sans-serif"
          letterSpacing="2"
        >
          {label}
        </text>
      </g>
    </svg>
  );
}

/** Concentric broken rings, slowly turning (a maze-like doodle). */
export function MazeRings() {
  const rings = [40, 66, 92, 118, 144, 170];
  return (
    <svg viewBox="0 0 360 360">
      {rings.map((r, i) => (
        <circle
          key={r}
          cx="180"
          cy="180"
          r={r}
          fill="none"
          stroke="#8b7b68"
          strokeWidth="11"
          strokeDasharray={`${r * 1.1} ${18 + i * 6} ${r * 0.6} 14`}
          transform={`rotate(${i * 47} 180 180)`}
        />
      ))}
    </svg>
  );
}

/** The big red ribbon + wavy blue stripes that draw themselves across the page (PC/iPad). */
export function RibbonWide() {
  return (
    <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <path
        className="fc-draw fc-ribbon"
        pathLength={1}
        d="M-90 830C150 700 300 920 520 820S800 610 960 740s260 150 300-60-120-330 60-420 200-140 220-260"
        stroke="#b0141b"
        strokeWidth="66"
        strokeLinecap="round"
        fill="none"
      />
      <g className="fc-waves" stroke="#2f5fa7" strokeWidth="3.2" fill="none" strokeLinecap="round">
        {[0, 11, 22, 33, 44, 55].map((o) => (
          <path
            key={o}
            className="fc-draw"
            pathLength={1}
            style={{ animationDelay: `${0.5 + o / 110}s` }}
            d={`M${10 + o} -30c90 70-60 120 20 200s150 40 60 140`}
          />
        ))}
      </g>
    </svg>
  );
}

/** Phone version: one ribbon swoop behind the cards. */
export function RibbonPhone() {
  return (
    <svg viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <path
        className="fc-draw fc-ribbon"
        pathLength={1}
        d="M-60 560c80-70 150 40 230-10s110-120 190-60 50 150 90 170"
        stroke="#b0141b"
        strokeWidth="38"
        strokeLinecap="round"
        fill="none"
      />
      <g stroke="#2f5fa7" strokeWidth="2.4" fill="none" strokeLinecap="round">
        {[0, 9, 18, 27].map((o) => (
          <path
            key={o}
            className="fc-draw"
            pathLength={1}
            style={{ animationDelay: `${0.5 + o / 90}s` }}
            d={`M${300 + o} -20c60 50-40 80 14 140`}
          />
        ))}
      </g>
    </svg>
  );
}

/** Hand-drawn marker loop around a phrase. Stretches to the phrase's box. */
export function MarkerLoop() {
  return (
    <svg viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden className="fc-marker">
      <path
        className="fc-draw"
        pathLength={1}
        d="M14 34C8 14 120 2 186 18c16 6 10 26-30 34C96 62 18 56 8 38 2 24 40 10 92 8"
        stroke="#c2410c"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
