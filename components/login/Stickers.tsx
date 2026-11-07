// Hand-drawn SVG pieces for the sign-in "scrapbook": sunflower, stars, GO stamp, cat mascot,
// ribbon and doodles. The food and the eyes are cut-out images in public/login.
// Everything here is decorative and hidden from screen readers.

const INK = '#161412';

/** Shared filters and patterns. Render once per page, before any sticker. */
export function StickerDefs() {
  return (
    <svg width="0" height="0" aria-hidden focusable="false" className="absolute">
      <defs>
        {/* Die-cut sticker: white outline grown from the shape's alpha + a soft paper shadow. */}
        <filter id="fc-diecut" x="-25%" y="-25%" width="150%" height="150%">
          <feMorphology in="SourceAlpha" operator="dilate" radius="5" result="grow" />
          <feGaussianBlur in="grow" stdDeviation="3.5" result="blur" />
          <feOffset in="blur" dy="5" result="drop" />
          <feFlood floodColor="#3c1405" floodOpacity="0.28" />
          <feComposite in2="drop" operator="in" result="shadow" />
          <feFlood floodColor="#ffffff" />
          <feComposite in2="grow" operator="in" result="border" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="border" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Wobbly hand-cut / watercolour edges. */}
        <filter id="fc-rough" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="3.2" />
        </filter>
        <pattern id="fc-ht" width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.9" fill={INK} />
        </pattern>
        <pattern id="fc-ht-mid" width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.35" fill={INK} />
        </pattern>
        <pattern id="fc-ht-dense" width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.8" fill={INK} />
        </pattern>
        <pattern id="fc-seeds" width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="2.5" cy="2.5" r="1.2" fill="#e8b04a" opacity="0.55" />
        </pattern>
      </defs>
    </svg>
  );
}

/** Sunflower with a misprinted magenta/cyan "neon" outline. */
export function Sunflower() {
  const petals = Array.from({ length: 16 }, (_, i) => i * 22.5);
  return (
    <svg viewBox="0 0 120 120" filter="url(#fc-diecut)">
      <g className="fc-spin-slow" style={{ transformOrigin: '60px 60px' }}>
        <g
          transform="translate(-2.5 1.5)"
          fill="none"
          stroke="#ff2e88"
          strokeWidth="2"
          opacity="0.75"
        >
          {petals.map((a) => (
            <ellipse key={a} cx="60" cy="27" rx="8" ry="20" transform={`rotate(${a} 60 60)`} />
          ))}
        </g>
        <g
          transform="translate(2.5 -1.5)"
          fill="none"
          stroke="#1ec8ff"
          strokeWidth="2"
          opacity="0.75"
        >
          {petals.map((a) => (
            <ellipse key={a} cx="60" cy="27" rx="8" ry="20" transform={`rotate(${a} 60 60)`} />
          ))}
        </g>
        {petals.map((a) => (
          <ellipse
            key={a}
            cx="60"
            cy="27"
            rx="8"
            ry="20"
            fill={a % 45 === 0 ? '#f6b400' : '#ffcb2b'}
            stroke="#de8a00"
            strokeWidth="1"
            transform={`rotate(${a + 11} 60 60)`}
          />
        ))}
        <circle cx="60" cy="60" r="19" fill="#4b2a10" />
        <circle cx="60" cy="60" r="19" fill="url(#fc-seeds)" />
        <circle cx="60" cy="60" r="19" fill="none" stroke="#2b1607" strokeWidth="2" />
      </g>
    </svg>
  );
}

/** The mascot: a very cool cat. Original character. */
export function CoolCat() {
  return (
    <svg viewBox="0 0 130 130" filter="url(#fc-diecut)">
      <path
        className="fc-tail"
        d="M92 108q30-4 26-30-2-10-9-6"
        stroke={INK}
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M30 116q-8-38 12-50 22-10 44 0 20 12 12 50Z" fill={INK} />
      <g className="fc-bob">
        <path d="M24 58q-2-30 13-38l8 13q19-6 38 0l8-13q15 8 13 38 0 26-40 26T24 58Z" fill={INK} />
        <path d="M38 26l5 9-9 3Z M90 26l-5 9 9 3Z" fill="#ff7aa2" />
        {/* sunglasses */}
        <rect x="31" y="44" width="28" height="17" rx="7" fill="#ff6a13" />
        <rect x="69" y="44" width="28" height="17" rx="7" fill="#ff6a13" />
        <path
          d="M59 50h10M24 48l7 2M104 48l-7 2"
          stroke="#ff6a13"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M36 49l7-2M74 49l7-2"
          stroke="#fff"
          strokeWidth="2.6"
          strokeLinecap="round"
          opacity="0.9"
        />
        <ellipse cx="37" cy="69" rx="5" ry="3" fill="#ff7aa2" opacity="0.75" />
        <ellipse cx="91" cy="69" rx="5" ry="3" fill="#ff7aa2" opacity="0.75" />
        <path
          d="M57 70q3.5 4 7 0 3.5 4 7 0"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
      </g>
      {/* paws holding a tiny cutting chai */}
      <path d="M54 92h20l-2 18q-8 3-16 0Z" fill="#f4ede4" />
      <path d="M55.5 98h17l-1.4 11q-7 2.6-14 0Z" fill="#b8692c" />
      <ellipse cx="50" cy="104" rx="8" ry="6" fill={INK} />
      <ellipse cx="78" cy="104" rx="8" ry="6" fill={INK} />
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
        stroke="#b3141c"
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
            d={`M${70 + o} -30c90 70-60 120 20 200s170 40 100 140`}
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
        stroke="#b3141c"
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
