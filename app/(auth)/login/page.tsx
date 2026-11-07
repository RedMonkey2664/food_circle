import { Suspense, type CSSProperties, type ReactNode } from 'react';
import Image from 'next/image';
import {
  CoolCat,
  GoStamp,
  MarkerLoop,
  MazeRings,
  RibbonPhone,
  RibbonWide,
  StickerDefs,
  Sunflower,
} from '@/components/login/Stickers';
import { Footer } from '@/components/ui/Footer';
import { GoogleIcon } from '@/components/ui/icons';
import { PromisePreview } from '@/components/verdict/PromisePreview';
import { signInWithGoogle } from '@/lib/actions/auth';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';
import { devToolsEnabled } from '@/lib/dev';
import './login.css';

export const metadata = { title: 'Sign in' };

const t = copy.login;

function GoogleButton({ disabled = false }: { disabled?: boolean }) {
  return (
    <button type="submit" className="fc-google" data-magnet disabled={disabled}>
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

/** Cut-out artwork in public/login (sizes are the files' own, for no layout shift). */
const ART = {
  burger: [480, 441],
  dessert: [394, 480],
  croissant: [480, 424],
  icecream: [227, 480],
  toast: [469, 480],
  fries: [480, 466],
  pizza: [480, 428],
  eyes: [337, 474],
  pin: [191, 252],
} as const;

function Art({ name }: { name: keyof typeof ART }) {
  const [width, height] = ART[name];
  return (
    <Image src={`/login/${name}.webp`} width={width} height={height} alt="" draggable={false} />
  );
}

/** A sticker on the desk: position via className, tilt/timing via CSS variables. */
function Sticker({
  className,
  w,
  tilt,
  delay,
  float = 5.5,
  children,
}: {
  className: string;
  w: number;
  tilt: number;
  delay: number;
  float?: number;
  children: ReactNode;
}) {
  const vars = {
    '--w': `${w}px`,
    '--r': `${tilt}deg`,
    '--delay': `${delay}s`,
    '--fdur': `${float}s`,
  } as CSSProperties;
  return (
    <div className={cn('fc-stk pointer-events-auto', className)} style={vars}>
      <div className="fc-pop">{children}</div>
    </div>
  );
}

/** A sticker stuck onto a card corner. */
function Corner({
  className,
  tilt,
  delay,
  children,
}: {
  className: string;
  tilt: number;
  delay: number;
  children: ReactNode;
}) {
  return (
    <div
      aria-hidden
      className={cn('fc-corner pointer-events-none', className)}
      style={{ '--r': `${tilt}deg`, '--delay': `${delay}s` } as CSSProperties}
    >
      <div>{children}</div>
    </div>
  );
}

/** "Eat where your people eat." with each word rising in and the key phrase circled. */
function Headline() {
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
    <h1 className="font-display mt-14 text-[clamp(2.7rem,11vw,5.4rem)] leading-[0.98] font-semibold tracking-tight text-balance [font-variation-settings:'SOFT'_100] lg:mt-8">
      {words(parts[0] ?? '')}{' '}
      {parts[1] ? (
        <span className="fc-hl">
          {words(parts[1])}
          <MarkerLoop />
        </span>
      ) : null}{' '}
      {words(parts[2] ?? '')}
    </h1>
  );
}

export default function LoginPage(props: PageProps<'/login'>) {
  const strip = [...t.marquee, ...t.marquee];
  return (
    <main className="fc-login">
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

      {/* Stickers scattered on the desk. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[1]">
        {/* The eyes peek in from the top-right corner, cut off by the page edge. */}
        <Sticker
          className="fc-eyes -top-4 -right-7 lg:-top-8 lg:-right-10"
          w={0}
          tilt={-4}
          delay={0.6}
          float={7}
        >
          <Art name="eyes" />
        </Sticker>
        <Sticker className="top-14 right-[96px] lg:hidden" w={70} tilt={-10} delay={1}>
          <Art name="croissant" />
        </Sticker>
        <Sticker className="top-[6vh] left-[2.5vw] hidden xl:block" w={150} tilt={-10} delay={0.9}>
          <Art name="burger" />
        </Sticker>
        <Sticker
          className="top-[2vh] left-[37vw] hidden lg:block"
          w={92}
          tilt={10}
          delay={1.05}
          float={7}
        >
          <Sunflower />
        </Sticker>
        <Sticker className="top-[6vh] left-[50vw] hidden lg:block" w={150} tilt={-8} delay={1.15}>
          <Art name="croissant" />
        </Sticker>
        <Sticker
          className="top-[42vh] left-[46vw] hidden lg:block"
          w={112}
          tilt={12}
          delay={1.3}
          float={4.8}
        >
          <Art name="fries" />
        </Sticker>
        <Sticker
          className="bottom-[12vh] left-[47vw] hidden lg:block"
          w={104}
          tilt={-9}
          delay={1.45}
          float={6.2}
        >
          <Art name="dessert" />
        </Sticker>
        <Sticker
          className="right-[2.5vw] bottom-[17vh] hidden xl:block"
          w={165}
          tilt={14}
          delay={1.55}
        >
          <Art name="pizza" />
        </Sticker>
        <Sticker
          className="top-[40vh] left-[2vw] hidden xl:block"
          w={76}
          tilt={-12}
          delay={1.65}
          float={4.4}
        >
          <Art name="icecream" />
        </Sticker>
        <Sticker
          className="bottom-[20vh] left-[1.5vw] hidden xl:block"
          w={130}
          tilt={8}
          delay={1.75}
        >
          <Art name="toast" />
        </Sticker>
      </div>

      <div className="relative z-[2] mx-auto flex min-h-dvh max-w-[480px] flex-col px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-6 md:max-w-[600px] lg:grid lg:max-w-[1120px] lg:grid-cols-[minmax(0,1fr)_400px] lg:content-center lg:items-center lg:gap-20 lg:px-10 lg:pt-10 lg:pb-36">
        <div>
          <header className="relative">
            <p className="font-display text-primary fc-fade flex items-center gap-2 text-xl font-semibold [--delay:0s]">
              <span
                aria-hidden
                className="fc-logo-dot border-primary inline-block size-4 rounded-full border-[5px]"
              />
              {t.title}
            </p>
            <Headline />
            <p className="text-muted fc-fade mt-7 max-w-[34ch] text-lg [--delay:0.9s] lg:text-xl">
              {t.pitch}
            </p>
          </header>

          <div className="fc-note mt-10 lg:max-w-md">
            <span aria-hidden className="fc-pin">
              <Art name="pin" />
            </span>
            <PromisePreview />
            <Corner
              className="-right-1 -bottom-9 w-[78px] lg:-right-4 lg:w-[96px]"
              tilt={-14}
              delay={2.6}
            >
              <GoStamp label={t.stamp} />
            </Corner>
          </div>
        </div>

        <div className="fc-ticket-wrap mt-16 lg:mt-0">
          <Corner
            className="-top-[70px] right-3 w-[104px] lg:-top-[86px] lg:w-[124px]"
            tilt={6}
            delay={2.1}
          >
            <CoolCat />
          </Corner>
          <div className="fc-ticket">
            <div className="fc-stub flex flex-col justify-center px-7">
              <p className="text-primary text-xs font-bold tracking-[0.18em] uppercase">
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

      <div
        aria-hidden
        className="relative z-[2] pb-10 lg:absolute lg:inset-x-0 lg:bottom-10 lg:pb-0"
      >
        <div className="fc-marquee">
          <div className="fc-marquee-track">
            {strip.map((dish, n) => (
              <span key={`${dish}-${n}`}>
                {dish}
                <i>✦</i>
              </span>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
