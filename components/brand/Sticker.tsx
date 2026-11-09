import Image from 'next/image';
import { TapSticker } from '@/components/interactive/TapSticker';
import { cn } from '@/lib/cn';

/** Mood-board stickers (public/stickers, white die-cut edge baked in). Sizes are the files'. */
const STICKERS = {
  eyes: [173, 240],
  'camera-hand': [204, 240],
  'torn-stars': [240, 197],
  lantern: [164, 240],
  vinyl: [230, 240],
  cat: [192, 240],
  sunflower: [240, 239],
  croissant: [240, 211],
  pizza: [240, 215],
  fries: [240, 233],
  burger: [240, 221],
  cheesecake: [240, 197],
  toast: [234, 240],
  dessert: [199, 240],
  pancakes: [240, 236],
  'iced-coffee': [143, 240],
  'spiral-star': [239, 240],
  'red-flower': [231, 240],
} as const;
export type StickerName = keyof typeof STICKERS;

const FOOD: StickerName[] = [
  'croissant',
  'pizza',
  'fries',
  'burger',
  'cheesecake',
  'toast',
  'dessert',
  'pancakes',
  'iced-coffee',
];

/** A stable food sticker for a piece of text (same text, same sticker, on server and client). */
export function foodFor(text: string): StickerName {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FOOD[h % FOOD.length] ?? 'croissant';
}

// Halftone dot colours (SKOOP palette), picked per sticker so pages differ.
const DOTS = ['rgb(176 20 27 / 0.32)', 'rgb(46 79 174 / 0.3)', 'rgb(246 181 0 / 0.45)'] as const;
const pick = <T,>(xs: readonly T[], key: string, salt = 0): T => {
  let h = salt;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return xs[h % xs.length] as T;
};

/**
 * A decorative sticker. `taped` sets it on a halftone dot backdrop, like the sign-in scrapbook. `data-sticker` lets the motion layer slap it on.
 */
export function Sticker({
  name,
  size,
  tilt = 0,
  taped = false,
  className,
}: {
  name: StickerName;
  size: number;
  tilt?: number;
  taped?: boolean;
  className?: string;
}) {
  const [w, h] = STICKERS[name];
  return (
    <span
      aria-hidden
      data-sticker=""
      className={cn(
        'pointer-events-none isolate inline-block select-none',
        // Positioned for the tape and dots, unless the caller already places it absolutely.
        !(className ?? '').split(' ').some((c) => c === 'absolute' || c === 'fixed') && 'relative',
        className,
      )}
      style={{ width: size, rotate: `${tilt}deg` }}
    >
      {taped ? (
        <span
          className="sk-sticker-dots"
          style={{ '--dot': pick(DOTS, name, 7) } as React.CSSProperties}
        />
      ) : null}
      <Image
        src={`/stickers/${name}.webp`}
        width={w}
        height={h}
        sizes={`${size}px`}
        alt=""
        draggable={false}
        className="relative h-auto w-full drop-shadow-[0_8px_10px_rgb(50_20_5/0.22)]"
      />
    </span>
  );
}

/** A page heading with a marker underline and its taped sticker tucked at the right. */
export function PageTitle({
  children,
  sticker,
  tilt = 8,
  className,
}: {
  children: React.ReactNode;
  sticker: StickerName;
  tilt?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative flex items-end justify-between gap-3 pr-1 md:justify-start md:gap-5',
        className,
      )}
    >
      <h1 className="font-display relative text-[2rem] leading-tight font-semibold tracking-tight md:text-[2.4rem]">
        {children}
        <svg
          aria-hidden
          viewBox="0 0 200 14"
          preserveAspectRatio="none"
          className="sk-underline pointer-events-none absolute -bottom-1.5 left-0 h-3 w-[calc(100%+0.3em)]"
        >
          <path
            pathLength={1}
            d="M3 9c30-6 60-7 96-4s66 4 98-2"
            fill="none"
            stroke="var(--c-primary)"
            strokeWidth="3.4"
            strokeLinecap="round"
          />
        </svg>
      </h1>
      <TapSticker name={sticker}>
        <Sticker
          name={sticker}
          size={66}
          tilt={tilt}
          taped
          className="-mt-2 mr-1 -mb-1 shrink-0 md:w-[80px]!"
        />
      </TapSticker>
    </div>
  );
}
