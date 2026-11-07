// Hand-drawn SVG stickers for the sign-in "scrapbook" (all original artwork, no image files).
// Style cues from the team's mood board: die-cut white borders, black-and-white halftone
// cut-outs, watercolour food, a fat red ribbon, wavy stripes, scribbled stars and a cat mascot.
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

export function VadaPav() {
  return (
    <svg viewBox="0 0 130 120" filter="url(#fc-diecut)">
      <g filter="url(#fc-rough)">
        {/* green chilli */}
        <path d="M98 30c14-12 26-4 26 10-6-6-15-5-22 3-3-3-4-8-4-13Z" fill="#3f8f2f" />
        <path
          d="M98 30c-2-5 0-9 4-10"
          stroke="#2c6a1f"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        {/* bottom bun */}
        <path d="M14 76q51 30 102 0 2 14-12 20-44 16-78 0-14-6-12-20Z" fill="#d48f3d" />
        {/* vada */}
        <ellipse cx="65" cy="71" rx="54" ry="13" fill="#c2741d" />
        <g fill="#9c5410" opacity="0.8">
          <circle cx="30" cy="72" r="2" />
          <circle cx="48" cy="77" r="1.6" />
          <circle cx="70" cy="74" r="2.2" />
          <circle cx="92" cy="77" r="1.6" />
          <circle cx="104" cy="70" r="1.8" />
        </g>
        {/* chutneys */}
        <path
          d="M16 64q9-6 18 0t18 0 18 0 18 0 18 0 18 0"
          stroke="#4c9a2a"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M24 67l8 2m14-2 7 2m14-3 8 2m14-2 7 2"
          stroke="#c0392b"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* top bun */}
        <path d="M12 62q2-42 53-44 51 2 53 44-53 9-106 0Z" fill="#e7a24a" />
        <path d="M28 46q10-18 36-21-17 6-25 24Z" fill="#f8cf8c" opacity="0.9" />
        <g fill="#fff6e6" opacity="0.85">
          <ellipse cx="56" cy="32" rx="3" ry="1.3" />
          <ellipse cx="78" cy="30" rx="2.4" ry="1.1" />
          <ellipse cx="90" cy="40" rx="2.8" ry="1.2" />
          <ellipse cx="68" cy="42" rx="2" ry="1" />
        </g>
      </g>
    </svg>
  );
}

export function CuttingChai() {
  return (
    <svg viewBox="0 0 120 130" filter="url(#fc-diecut)">
      <g
        className="fc-steam"
        stroke="#9b7653"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      >
        <path d="M48 24c-6-6 6-10 0-18" />
        <path d="M62 22c-6-6 6-10 0-18" />
        <path d="M76 24c-6-6 6-10 0-18" />
      </g>
      <g filter="url(#fc-rough)">
        <path d="M30 32h60l-7 84q-23 8-46 0Z" fill="#f4ede4" />
        <path d="M33 56h54l-5 58q-22 7-44 0Z" fill="#b8692c" />
        <ellipse cx="60" cy="56" rx="27" ry="4.5" fill="#d79352" />
        <g stroke="#ffffff" strokeWidth="2.4" opacity="0.45">
          <path d="M40 34l3 80M50 34l1.5 82M60 34v83M70 34l-1.5 82M80 34l-3 80" />
        </g>
        <ellipse cx="60" cy="32" rx="30" ry="5" fill="none" stroke="#8b6a4a" strokeWidth="2.5" />
        <path d="M30 32l7 84q23 8 46 0l7-84" fill="none" stroke="#8b6a4a" strokeWidth="2.5" />
      </g>
    </svg>
  );
}

/** Black-and-white halftone cut-out, like a photocopied zine. */
export function HalftonePizza() {
  return (
    <svg viewBox="0 0 120 120" filter="url(#fc-diecut)">
      <g filter="url(#fc-rough)">
        <path d="M12 26q48-20 96 0L62 114Z" fill="#fbf7ef" />
        <path d="M12 26q48-20 96 0L62 114Z" fill="url(#fc-ht)" />
        <path d="M12 26q48-20 96 0l-5 11Q60 20 17 37Z" fill="url(#fc-ht-dense)" />
        {[
          [44, 48, 10],
          [74, 49, 9],
          [58, 76, 8.5],
          [62, 99, 5],
        ].map(([cx, cy, r]) => (
          <g key={`${cx}-${cy}`}>
            <circle cx={cx} cy={cy} r={r} fill="#fbf7ef" />
            <circle cx={cx} cy={cy} r={r} fill="url(#fc-ht-dense)" />
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={INK} strokeWidth="1.6" />
          </g>
        ))}
        <path
          d="M12 26q48-20 96 0L62 114Z"
          fill="none"
          stroke={INK}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
      </g>
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

/** Black star with a cream spiral, cut from card. */
export function SpiralStar() {
  return (
    <svg viewBox="0 0 120 120" filter="url(#fc-diecut)">
      <g filter="url(#fc-rough)">
        <path
          d="M60 8l12.9 34.2 36.6 1.7-28.6 22.9 9.7 35.3L60 82l-30.6 20.1 9.7-35.3-28.6-22.9 36.6-1.7Z"
          fill={INK}
          stroke={INK}
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <path
          d="M60 62c0-3 4-3 4 0 0 6-9 6-9 0 0-9 14-9 14 0 0 12-19 12-19 0 0-15 24-15 24 0 0 18-29 18-29 0"
          stroke="#f3e9d6"
          strokeWidth="3.6"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

/** A scribbled star on a torn scrap of paper. */
export function ScribbleStar() {
  return (
    <svg viewBox="0 0 80 80">
      <g filter="url(#fc-rough)">
        <path
          d="M14 22 30 8l18 6 20-2 4 22-6 18 6 16-22 6-14-4-20 4-6-20 6-16Z"
          fill="#fbf7ef"
          stroke="#d9cfc0"
          strokeWidth="1.5"
        />
        <path
          d="M40 18l6 15 16 1-12 10 4 16-14-9-14 9 4-16-12-10 16-1Z"
          fill="none"
          stroke={INK}
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </g>
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
