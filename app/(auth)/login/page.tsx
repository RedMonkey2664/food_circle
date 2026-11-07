import { Suspense, type CSSProperties } from 'react';
import { Anton, Permanent_Marker } from 'next/font/google';
import Image from 'next/image';
import {
  GoStamp,
  MarkerLoop,
  MazeRings,
  RibbonPhone,
  RibbonWide,
  StickerDefs,
} from '@/components/login/Stickers';
import { Footer } from '@/components/ui/Footer';
import { GoogleIcon } from '@/components/ui/icons';
import { PromisePreview } from '@/components/verdict/PromisePreview';
import { signInWithGoogle } from '@/lib/actions/auth';
import { cn } from '@/lib/cn';
import { APP_NAME } from '@/lib/config';
import { copy } from '@/lib/copy';
import { devToolsEnabled } from '@/lib/dev';
import './login.css';

// Display faces for this page only (self-hosted by next/font, loaded only on /login).
const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-anton',
  display: 'swap',
});
const marker = Permanent_Marker({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-marker',
  display: 'swap',
});

export const metadata = { title: 'Sign in' };

const t = copy.login;

/** Cut-out stickers in public/login (pixel sizes of the files, so nothing shifts). */
const ART = {
  burger: [424, 391],
  'cat-pizza': [341, 424],
  croissant: [424, 373],
  eyes: [345, 478],
  fries: [424, 412],
  'hand-point': [424, 393],
  'iced-coffee': [252, 424],
  lantern: [289, 424],
  pin: [196, 256],
  sunflower: [424, 422],
  vinyl: [407, 424],
} as const;
type ArtName = keyof typeof ART;

function Art({ name, w }: { name: ArtName; w: number }) {
  const [width, height] = ART[name];
  return (
    <Image
      src={`/login/${name}.webp`}
      width={width}
      height={height}
      sizes={`${Math.max(w, 60)}px`}
      alt=""
      draggable={false}
    />
  );
}

type Show = 'all' | 'phone' | 'lg' | 'xl';
const SHOW: Record<Show, string> = {
  all: '',
  phone: 'lg:hidden',
  lg: 'hidden lg:block',
  xl: 'hidden xl:block',
};

/**
 * A few deliberate pieces with room to breathe (the human found the full collage too busy).
 * Pieces hidden on a screen size are never downloaded there.
 */
const DESK: Array<{
  name: ArtName;
  at: string;
  show: Show;
  w: number;
  r: number;
  d: number;
  f?: number;
}> = [
  {
    name: 'eyes',
    at: 'sk-eyes -top-10 -right-9 lg:-top-8 lg:-right-10',
    show: 'all',
    w: 260,
    r: -4,
    d: 0.5,
    f: 7,
  },
  { name: 'fries', at: 'top-[178px] right-3', show: 'phone', w: 62, r: 12, d: 1.4 },
  { name: 'lantern', at: 'sk-swing -top-3 left-[3vw]', show: 'lg', w: 100, r: 0, d: 0.6 },
  { name: 'croissant', at: 'top-[6vh] left-[50vw]', show: 'lg', w: 120, r: -8, d: 1.2 },
  { name: 'burger', at: 'top-[54vh] left-[2.5vw]', show: 'xl', w: 128, r: -8, d: 1.4 },
  { name: 'iced-coffee', at: 'bottom-[15vh] left-[50vw]', show: 'xl', w: 72, r: 8, d: 1.6 },
  { name: 'vinyl', at: 'sk-vinyl bottom-[16vh] -right-14', show: 'lg', w: 220, r: 0, d: 1.3 },
];

/** A sticker stuck onto, or tucked behind, a card. */
function Corner({
  name,
  at,
  w,
  r,
  d,
  behind = false,
}: {
  name: ArtName;
  at: string;
  w: number;
  r: number;
  d: number;
  behind?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn('sk-corner', behind && 'sk-behind', at)}
      style={{ '--r': `${r}deg`, '--delay': `${d}s` } as CSSProperties}
    >
      <div>
        <Art name={name} w={w} />
      </div>
    </div>
  );
}

function GoogleButton({ disabled = false }: { disabled?: boolean }) {
  return (
    <button type="submit" className="fc-google" disabled={disabled}>
      <span className="fc-g" aria-hidden>
        <GoogleIcon />
      </span>
      {t.google}
    </button>
  );
}

async function LoginForm({ searchParams }: { searchParams: PageProps<'/login'>['searchParams'] }) {
  const params = await searchParams;
  const next = typeof params.next === 'string' ? params.next : '';
  const errorText =
    params.error === 'provider' ? t.providerOff : typeof params.error === 'string' ? t.error : null;

  return (
    <form action={signInWithGoogle} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      {errorText ? (
        <p
          role="alert"
          className="bg-skip-soft text-skip rounded-[var(--radius-button)] px-3 py-2 text-sm"
        >
          {errorText}
        </p>
      ) : null}
      <GoogleButton />
    </form>
  );
}

/** Each letter of the name cut from a different paper, ransom-note style. */
const LETTERS = [
  { bg: 'var(--cherry)', fg: '#fbf3e6', ff: 'var(--font-anton)', fw: 400, r: -4 },
  { bg: 'var(--ink)', fg: 'var(--sun)', ff: 'var(--font-fraunces)', fw: 900, r: 3 },
  { bg: 'var(--sun)', fg: 'var(--ink)', ff: 'var(--font-marker)', fw: 400, r: -2 },
  { bg: '#fbf6ec', fg: 'var(--cobalt)', ff: 'var(--font-anton)', fw: 400, r: 5, dots: true },
  { bg: 'var(--pink)', fg: 'var(--ink)', ff: 'var(--font-fraunces)', fw: 900, r: -3 },
] as const;

function Wordmark() {
  return (
    <h1 aria-label={APP_NAME} className="sk-word mt-3">
      {[...APP_NAME].map((ch, i) => {
        const s = LETTERS[i % LETTERS.length] ?? LETTERS[0];
        return (
          <span
            key={`${ch}-${i}`}
            aria-hidden
            className={cn('sk-l', 'dots' in s && s.dots && 'sk-dots')}
            style={
              {
                '--bg': s.bg,
                '--fg': s.fg,
                '--ff': s.ff,
                '--fw': s.fw,
                '--r': `${s.r}deg`,
                '--i': i,
              } as CSSProperties
            }
          >
            {ch}
          </span>
        );
      })}
    </h1>
  );
}

/** "Eat where your people eat." with each word rising in and the key phrase circled. */
function Tagline() {
  const full = t.headline;
  const at = full.indexOf(t.headlineHighlight);
  const parts =
    at >= 0
      ? [full.slice(0, at), t.headlineHighlight, full.slice(at + t.headlineHighlight.length)]
      : [full, '', ''];
  let i = 0;
  const words = (text: string) =>
    text
      .split(/\s+/)
      .filter(Boolean)
      .flatMap((w, k) => [
        k > 0 ? ' ' : null,
        <span key={`${w}-${i}`} className="fc-word">
          <span style={{ '--i': i++ } as CSSProperties}>{w}</span>
        </span>,
      ]);
  return (
    <p className="font-display mt-5 text-[clamp(2.1rem,8vw,3rem)] leading-[1.02] font-semibold tracking-tight text-balance [font-variation-settings:'SOFT'_100]">
      {words(parts[0] ?? '')}{' '}
      {parts[1] ? (
        <span className="fc-hl">
          {words(parts[1])}
          <MarkerLoop />
        </span>
      ) : null}{' '}
      {words(parts[2] ?? '')}
    </p>
  );
}

function Tape({ kind, items }: { kind: 'ink' | 'sun'; items: readonly string[] }) {
  const strip = [...items, ...items, ...items, ...items];
  return (
    <div className={cn('sk-tape', kind)}>
      <div className="sk-track">
        {strip.map((word, n) => (
          <span key={`${word}-${n}`}>
            {word}
            <i>✦</i>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function LoginPage(props: PageProps<'/login'>) {
  return (
    <main className={cn('sk-login', anton.variable, marker.variable)}>
      <StickerDefs />

      {/* Background: ribbon, wavy stripes, turning rings. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 hidden md:block">
        <RibbonWide />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 md:hidden">
        <RibbonPhone />
      </div>
      <div
        aria-hidden
        className="fc-maze pointer-events-none absolute -bottom-44 -left-36 z-0 w-[440px] opacity-25"
      >
        <MazeRings />
      </div>

      {/* The collage. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[1]">
        {DESK.map((s) => (
          <div
            key={`${s.name}-${s.at}`}
            className={cn('sk-stk pointer-events-auto', SHOW[s.show], s.at)}
            style={
              {
                '--w': `${s.w}px`,
                '--r': `${s.r}deg`,
                '--delay': `${s.d}s`,
                '--fdur': `${s.f ?? 5.5}s`,
              } as CSSProperties
            }
          >
            <div className="sk-pop">
              <Art name={s.name} w={s.w} />
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-[2] mx-auto flex min-h-dvh max-w-[480px] flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-4 md:max-w-[600px] lg:grid lg:max-w-[1120px] lg:grid-cols-[minmax(0,1fr)_400px] lg:content-center lg:items-center lg:gap-20 lg:px-10 lg:pt-6 lg:pb-32">
        <div>
          <p className="sk-scribble fc-fade flex items-end gap-1 text-lg [--delay:0.9s] lg:text-xl">
            {t.scribble}
            <svg viewBox="0 0 44 44" aria-hidden className="sk-arrow size-9 shrink-0">
              <path
                pathLength={1}
                d="M4 8c18 0 30 10 30 28m0 0-8-7m8 7 6-9"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </p>
          <Wordmark />
          <Tagline />
          <p className="fc-fade mt-4 max-w-[36ch] text-lg text-[#5c5248] [--delay:1.2s]">
            {t.pitch}
          </p>

          <div className="fc-note mt-14 lg:mt-12 lg:max-w-md">
            <span aria-hidden className="fc-pin">
              <Art name="pin" w={50} />
            </span>
            <PromisePreview />
            <Corner
              name="sunflower"
              at="-top-12 -left-8 w-[62px] lg:-left-12 lg:w-[70px]"
              w={70}
              r={-12}
              d={2.1}
            />
            <div
              aria-hidden
              className="sk-corner -right-1 -bottom-9 w-[78px] lg:-right-4 lg:w-[96px]"
              style={{ '--r': '-14deg', '--delay': '2.9s' } as CSSProperties}
            >
              <div>
                <GoStamp label={t.stamp} />
              </div>
            </div>
          </div>
        </div>

        <div className="fc-ticket-wrap mt-20 lg:mt-0">
          <Corner
            name="cat-pizza"
            at="-top-[78px] right-2 w-[96px] lg:-top-[96px] lg:w-[120px]"
            w={120}
            r={6}
            d={2}
          />
          <div
            aria-hidden
            className="sk-corner sk-poke top-[150px] -left-[150px] hidden w-[140px] lg:block"
            style={{ '--r': '-4deg', '--delay': '2.6s' } as CSSProperties}
          >
            <div>
              <Art name="hand-point" w={140} />
            </div>
          </div>
          <div className="fc-ticket">
            <div className="fc-stub flex flex-col justify-center px-7">
              <p className="sk-eyebrow text-xs font-bold tracking-[0.18em] uppercase">
                {t.ticketEyebrow}
              </p>
              <p className="font-display mt-1 text-3xl font-semibold tracking-tight">
                {t.ticketTitle}
              </p>
            </div>
            <div className="px-7 pt-7 pb-7">
              <Suspense fallback={<GoogleButton disabled />}>
                <LoginForm searchParams={props.searchParams} />
              </Suspense>
              <p className="text-muted mt-4 text-sm">{t.privacy}</p>
              {devToolsEnabled() ? (
                <p className="mt-3 text-sm">
                  <a href="/dev/login" className="text-primary underline underline-offset-2">
                    Dev sign-in (local only)
                  </a>
                </p>
              ) : null}
              <Footer className="mt-6" />
            </div>
          </div>
        </div>
      </div>

      <div aria-hidden className="sk-tapes relative lg:absolute lg:inset-x-0 lg:bottom-4">
        <Tape kind="ink" items={t.marquee} />
      </div>
    </main>
  );
}
