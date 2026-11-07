import Image from 'next/image';
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

/** A decorative sticker. `data-sticker` lets the motion layer slap it on. */
export function Sticker({
  name,
  size,
  tilt = 0,
  className,
}: {
  name: StickerName;
  size: number;
  tilt?: number;
  className?: string;
}) {
  const [w, h] = STICKERS[name];
  return (
    <span
      aria-hidden
      data-sticker=""
      className={cn('pointer-events-none inline-block select-none', className)}
      style={{ width: size, rotate: `${tilt}deg` }}
    >
      <Image
        src={`/stickers/${name}.webp`}
        width={w}
        height={h}
        sizes={`${size}px`}
        alt=""
        draggable={false}
        className="h-auto w-full drop-shadow-[0_8px_10px_rgb(50_20_5/0.22)]"
      />
    </span>
  );
}

/** A page heading with its sticker tucked at the right. */
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
        'relative flex items-end justify-between gap-3 pr-1 md:justify-start md:gap-4',
        className,
      )}
    >
      <h1 className="font-display text-[2rem] leading-tight font-semibold tracking-tight md:text-[2.4rem]">
        {children}
      </h1>
      <Sticker name={sticker} size={64} tilt={tilt} className="-mt-3 -mb-2 shrink-0 md:w-[76px]!" />
    </div>
  );
}
