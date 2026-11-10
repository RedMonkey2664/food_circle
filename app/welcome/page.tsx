import { Fragment, type CSSProperties, type ReactNode } from 'react';
import type { Metadata } from 'next';
import { Anton, Permanent_Marker } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import { Brand } from '@/components/brand/Logo';
import { Sticker, type StickerName } from '@/components/brand/Sticker';
import { LandingMotion } from '@/components/landing/LandingMotion';
import { VerdictDemo } from '@/components/landing/VerdictDemo';
import { GoStamp, StickerDefs } from '@/components/login/Stickers';
import { Footer } from '@/components/ui/Footer';
import { PromisePreview } from '@/components/verdict/PromisePreview';
import { RelationshipTag } from '@/components/verdict/RelationshipTag';
import { cn } from '@/lib/cn';
import { APP_NAME } from '@/lib/config';
import { copy } from '@/lib/copy';
import { CITIES } from '@/lib/domain/cities';
import './welcome.css';

// Display faces for this page (self-hosted by next/font; the same two as the sign-in page).
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

const t = copy.landing;

export const metadata: Metadata = {
  title: t.metaTitle,
  description: t.metaDescription,
  openGraph: { title: `${APP_NAME}: ${t.metaTitle}`, description: t.metaDescription },
};

const SIGN_IN = '/login';

/** Large cut-out stickers (public/login), with the files' pixel sizes so nothing shifts. */
const ART = {
  burger: [424, 391],
  croissant: [424, 373],
  eyes: [345, 478],
  fries: [424, 412],
  'iced-coffee': [252, 424],
  lantern: [289, 424],
  pin: [196, 256],
  sunflower: [424, 422],
  vinyl: [407, 424],
} as const;
type ArtName = keyof typeof ART;

function Art({ name, w, priority = false }: { name: ArtName; w: number; priority?: boolean }) {
  const [width, height] = ART[name];
  return (
    <Image
      src={`/login/${name}.webp`}
      width={width}
      height={height}
      sizes={`${w}px`}
      alt=""
      draggable={false}
      priority={priority}
    />
  );
}

/** A sticker placed around a block: slapped on when it appears, optionally drifting on scroll. */
function Stk({
  name,
  w,
  wLg,
  r,
  at,
  delay,
  drift,
}: {
  name: ArtName;
  w: number;
  /** Width on desktop, if bigger. */
  wLg?: number;
  r: number;
  at: string;
  delay: number;
  drift?: number;
}) {
  return (
    <div
      aria-hidden
      className={cn('lp-stk', at)}
      style={{ '--w': `${w}px`, ...(wLg ? { '--w-lg': `${wLg}px` } : {}) } as CSSProperties}
      data-drift={drift}
    >
      <div style={{ '--r': `${r}deg`, '--delay': `${delay}ms` } as CSSProperties}>
        <Art name={name} w={wLg ?? w} />
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="size-5" fill="none">
      <path
        d="M4 10h11m0 0-4.5-4.5M15 10l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Cta({ className }: { className?: string }) {
  return (
    <Link href={SIGN_IN} className={cn('lp-cta', className)}>
      {t.cta}
      <Arrow />
    </Link>
  );
}

/** Papers the cut-out letters are "cut" from. */
const PAPERS = [
  { bg: 'var(--cherry)', fg: '#fbf3e6', ff: 'var(--font-anton)', fw: 400, r: -4 },
  { bg: 'var(--ink)', fg: 'var(--sun)', ff: 'var(--font-fraunces)', fw: 900, r: 3 },
  { bg: 'var(--sun)', fg: 'var(--ink)', ff: 'var(--font-marker)', fw: 400, r: -2 },
  { bg: '#fffaf2', fg: 'var(--cobalt)', ff: 'var(--font-anton)', fw: 400, r: 4 },
  { bg: 'var(--pink)', fg: 'var(--ink)', ff: 'var(--font-fraunces)', fw: 900, r: -3 },
] as const;

function CutWord({ word }: { word: string }) {
  return (
    <span className="lp-cut">
      <span className="sr-only">{word}</span>
      {[...word].map((ch, i) => {
        const p = PAPERS[i % PAPERS.length] ?? PAPERS[0];
        return (
          <span
            key={i}
            aria-hidden
            style={
              {
                '--bg': p.bg,
                '--fg': p.fg,
                '--ff': p.ff,
                '--fw': p.fw,
                '--r': `${p.r}deg`,
                '--i': i,
              } as CSSProperties
            }
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
}

function Nav() {
  const links = [
    ['#how', t.nav.how],
    ['#circles', t.nav.circles],
    ['#cities', t.nav.cities],
    ['#faq', t.nav.faq],
  ] as const;
  return (
    <header className="fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-40 px-3">
      <nav
        aria-label="Page"
        className="lp-nav border-line mx-auto flex h-14 max-w-[1180px] items-center justify-between gap-4 rounded-full border pr-2 pl-4"
      >
        <Link href="/welcome" aria-label={APP_NAME}>
          <Brand size={32} className="text-xl" />
        </Link>
        <ul className="hidden items-center gap-7 text-sm font-semibold md:flex">
          {links.map(([href, label]) => (
            <li key={href}>
              <a href={href} className="hover:text-primary underline-offset-4 hover:underline">
                {label}
              </a>
            </li>
          ))}
        </ul>
        <Link
          href={SIGN_IN}
          className="bg-ink flex h-10 items-center rounded-full px-5 text-sm font-bold whitespace-nowrap text-[#fbf3e6]"
        >
          {t.cta}
        </Link>
      </nav>
    </header>
  );
}

function Hero() {
  const h = t.hero;
  const i = (n: number) => ({ '--i': n }) as CSSProperties;
  return (
    <section className="lp-hero relative mx-auto grid max-w-[1240px] gap-6 px-5 pt-24 pb-10 md:px-8 lg:min-h-[100dvh] lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-center lg:pt-20 lg:pb-8">
      <div className="relative z-[1]">
        <p className="lp-marker lp-rise text-primary flex items-end gap-1 text-lg" style={i(0)}>
          {h.scribble}
          <svg
            aria-hidden
            viewBox="0 0 44 44"
            className="lp-draw size-8 shrink-0"
            style={{ '--delay': '900ms' } as CSSProperties}
          >
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
        <h1 className="font-display mt-3 text-[clamp(2.7rem,10.5vw,4.7rem)] leading-[1.04] font-semibold tracking-tight">
          <span className="lp-rise inline-block" style={i(1)}>
            {h.before}
          </span>{' '}
          <CutWord word={h.cut} />{' '}
          <span className="lp-rise inline-block" style={i(3)}>
            {h.after}
          </span>
        </h1>
        <p className="lp-rise mt-6 max-w-[40ch] text-lg text-[#5c5248]" style={i(4)}>
          {h.sub}
        </p>
        <div className="lp-rise mt-8 flex flex-wrap items-center gap-x-6 gap-y-4" style={i(5)}>
          <Cta />
          <a href="#how" className="font-bold underline decoration-2 underline-offset-[6px]">
            {h.secondary}
          </a>
        </div>
      </div>

      {/* The collage: the product's core sentence as a pinned note, stickers tucked behind it. */}
      <div className="relative mx-auto w-full max-w-[440px] px-6 pt-14 pb-20 lg:max-w-none lg:px-16 lg:py-28">
        <Stk
          name="eyes"
          w={170}
          r={6}
          at="-top-2 right-0 lg:top-0 lg:right-2"
          wLg={230}
          delay={700}
          drift={0.9}
        />
        <Stk
          name="sunflower"
          w={84}
          r={-12}
          at="top-6 left-0 lg:top-14 lg:left-4"
          wLg={110}
          delay={850}
          drift={0.4}
        />
        <Stk
          name="fries"
          w={104}
          r={-8}
          at="bottom-0 left-2 lg:bottom-6 lg:left-6"
          wLg={150}
          delay={1000}
          drift={0.65}
        />
        <Stk
          name="iced-coffee"
          w={70}
          r={9}
          at="right-2 bottom-2 lg:right-6 lg:bottom-10"
          wLg={96}
          delay={1150}
          drift={0.3}
        />
        <div className="lp-note relative z-[1] mx-auto max-w-[390px]">
          <div className="-rotate-2">
            <span aria-hidden className="absolute -top-7 left-1/2 z-[2] w-9 -translate-x-1/2">
              <Art name="pin" w={36} />
            </span>
            <PromisePreview />
            <span aria-hidden className="absolute -right-5 -bottom-9 w-[84px] -rotate-12">
              <GoStamp label={h.stamp} />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Words({
  text,
  part,
  mark,
  children,
  className,
}: {
  text: string;
  part: string;
  /** One word to draw on (never wraps, so the line always fits it). */
  mark?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <span data-part={part} className={className}>
      {text.split(' ').map((w, n) => (
        <Fragment key={n}>
          {n > 0 ? ' ' : null}
          {mark && w === mark ? (
            <span className="relative inline-block">
              <span className="lp-w inline-block">{w}</span>
              {children}
            </span>
          ) : (
            <span className="lp-w inline-block">{w}</span>
          )}
        </Fragment>
      ))}
    </span>
  );
}

function Statement() {
  const s = t.statement;
  return (
    <section className="lp-statement relative flex min-h-[70dvh] items-center md:min-h-[100dvh]">
      <p className="font-display mx-auto max-w-[1100px] px-6 py-20 text-[clamp(2rem,6.2vw,4.6rem)] leading-[1.12] font-semibold tracking-tight md:px-10">
        <Words text={s.a} part="a" mark={s.aMark}>
          <svg
            aria-hidden
            viewBox="0 0 200 16"
            preserveAspectRatio="none"
            className="lp-strike pointer-events-none absolute top-[48%] -left-[4%] h-[0.32em] w-[108%] overflow-visible"
          >
            <path
              pathLength={1}
              strokeDasharray="1"
              d="M3 9c38-7 82 6 120-1s50 3 74-3"
              fill="none"
              stroke="#ef4a3c"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>
        </Words>{' '}
        <Words text={s.aEnd} part="aEnd" />
        <span className="block h-[0.7em]" />
        <Words text={s.b} part="b" mark={s.bMark}>
          <svg
            aria-hidden
            viewBox="0 0 100 60"
            preserveAspectRatio="none"
            className="lp-ring pointer-events-none absolute -top-[12%] -left-[9%] h-[124%] w-[118%] overflow-visible"
          >
            <path
              pathLength={1}
              strokeDasharray="1"
              d="M52 5C24 3 4 14 5 31c1 16 22 25 47 24 26-1 44-11 43-27C94 14 74 4 44 7"
              fill="none"
              stroke="var(--sun)"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </Words>{' '}
        <Words text={s.bEnd} part="bEnd" className="lp-hot" />
      </p>
    </section>
  );
}

function Demo() {
  const d = t.demo;
  return (
    <section
      id="how"
      className="mx-auto grid max-w-[1180px] scroll-mt-24 gap-12 px-5 py-20 md:px-8 md:py-28 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-20"
    >
      <div>
        <h2
          data-lp-reveal
          className="font-display text-[clamp(2.2rem,6vw,3.6rem)] leading-[1.05] font-semibold tracking-tight"
        >
          {d.title}
        </h2>
        <p data-lp-reveal className="mt-4 max-w-[36ch] text-lg text-[#5c5248]">
          {d.sub}
        </p>
        <ol className="mt-10 space-y-6">
          {d.steps.map((s, n) => (
            <li key={s.title} data-lp-reveal className="flex gap-4">
              <span
                aria-hidden
                className="lp-anton bg-ink text-sun flex size-11 shrink-0 -rotate-3 items-center justify-center rounded-[10px] text-xl"
              >
                {n + 1}
              </span>
              <span>
                <span className="block text-lg font-bold">{s.title}</span>
                <span className="block text-[#5c5248]">{s.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div data-lp-reveal className="relative mx-auto w-full max-w-[460px]">
        <span aria-hidden data-lp-pop className="absolute -top-12 -right-3 block w-[92px]">
          <Sticker name="spiral-star" size={92} tilt={12} />
        </span>
        <span aria-hidden data-lp-pop className="absolute -bottom-12 -left-4 block w-[96px]">
          <Sticker name="pancakes" size={96} tilt={-10} />
        </span>
        <div className="relative z-[1]">
          <VerdictDemo />
        </div>
      </div>
    </section>
  );
}

function Circles() {
  const c = t.circles;
  return (
    <section id="circles" className="mx-auto max-w-[1180px] scroll-mt-24 px-5 py-20 md:px-8">
      <h2
        data-lp-reveal
        className="font-display max-w-[14ch] text-[clamp(2.2rem,6vw,3.6rem)] leading-[1.05] font-semibold tracking-tight"
      >
        {c.title}
      </h2>
      <p data-lp-reveal className="mt-4 max-w-[46ch] text-lg text-[#5c5248]">
        {c.sub}
      </p>
      <div className="mt-12 space-y-5 md:space-y-10 md:pb-10">
        {c.cards.map((card, n) => (
          <div key={card.tier} className="lp-circle-wrap" style={{ '--n': n } as CSSProperties}>
            <article
              className={cn(
                'lp-circle grid gap-6 p-6 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-center md:gap-10 md:p-10',
                card.tier === 'friend' && 'border-primary/40 border-2',
              )}
            >
              <div>
                <RelationshipTag tier={card.tier} />
                <h3 className="font-display mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
                  {card.title}
                </h3>
                <p className="mt-3 max-w-[34ch] text-[#5c5248]">{card.body}</p>
              </div>
              <figure className="bg-bg rounded-[var(--radius-button)] p-5">
                <figcaption className="text-muted text-xs font-bold tracking-[0.16em] uppercase">
                  {c.example}
                </figcaption>
                <p className="font-display mt-2 text-2xl leading-snug font-semibold md:text-3xl">
                  {card.line}
                </p>
              </figure>
            </article>
          </div>
        ))}
      </div>
    </section>
  );
}

function Cell({
  tone,
  title,
  body,
  sticker,
  size,
  tilt,
  className,
}: {
  tone: 'ink' | 'sun' | 'cherry' | 'paper' | 'map';
  title: string;
  body: string;
  sticker: StickerName;
  size: number;
  tilt: number;
  className?: string;
}) {
  return (
    <article
      data-lp-reveal
      className={cn(
        'lp-cell flex min-h-[260px] flex-col justify-end p-6',
        `lp-cell-${tone}`,
        className,
      )}
    >
      <span aria-hidden className="lp-cell-art absolute top-4 right-4 block">
        <Sticker name={sticker} size={size} tilt={tilt} />
      </span>
      <h3 className="font-display max-w-[13ch] text-2xl leading-tight font-semibold">{title}</h3>
      <p
        className={cn(
          'mt-2 max-w-[34ch]',
          tone === 'paper' || tone === 'map' ? 'text-[#5c5248]' : '',
        )}
      >
        {body}
      </p>
    </article>
  );
}

function More() {
  const m = t.more;
  return (
    <section className="mx-auto max-w-[1180px] px-5 py-20 md:px-8 md:py-28">
      <h2
        data-lp-reveal
        className="font-display max-w-[16ch] text-[clamp(2.2rem,6vw,3.6rem)] leading-[1.05] font-semibold tracking-tight"
      >
        {m.title}
      </h2>
      <div className="mt-10 grid gap-4 md:grid-cols-6">
        <Cell
          tone="ink"
          {...m.cells.diary}
          sticker="camera-hand"
          size={120}
          tilt={8}
          className="md:col-span-4 md:min-h-[300px]"
        />
        <Cell
          tone="sun"
          {...m.cells.badges}
          sticker="torn-stars"
          size={104}
          tilt={-8}
          className="md:col-span-2 md:min-h-[300px]"
        />
        <Cell
          tone="paper"
          {...m.cells.groups}
          sticker="cat"
          size={72}
          tilt={6}
          className="md:col-span-2"
        />
        <Cell
          tone="cherry"
          {...m.cells.recap}
          sticker="vinyl"
          size={78}
          tilt={-6}
          className="md:col-span-2"
        />
        <Cell
          tone="map"
          {...m.cells.map}
          sticker="lantern"
          size={70}
          tilt={4}
          className="md:col-span-2"
        />
      </div>
    </section>
  );
}

function Cities() {
  const c = t.cities;
  const names = CITIES.map((x) => x.name);
  const half = Math.ceil(names.length / 2);
  const rows = [names.slice(0, half), names.slice(half)];
  return (
    <section id="cities" className="lp-cities scroll-mt-24 py-20 md:py-28">
      <div aria-hidden className="lp-anton space-y-2 md:space-y-4">
        {rows.map((row, n) => (
          <div key={n} className={cn('lp-row', n === 1 && 'lp-row-outline')}>
            {[...row, ...row].map((name, k) => (
              <span key={`${name}-${k}`}>
                {name}
                <i>✦</i>
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="mx-auto mt-12 grid max-w-[1180px] gap-8 px-5 md:grid-cols-[auto_minmax(0,1fr)] md:items-end md:gap-16 md:px-8">
        <h2
          data-lp-reveal
          className="font-display text-[clamp(2.2rem,6vw,3.6rem)] leading-[1.05] font-semibold tracking-tight"
        >
          {c.title}
        </h2>
        <div data-lp-reveal>
          <p className="lp-anton text-primary text-3xl uppercase md:text-4xl">
            {c.places} <span className="text-ink">/ {c.count(names.length)}</span>
          </p>
          <p className="mt-3 max-w-[44ch] text-lg text-[#5c5248]">{c.body}</p>
        </div>
      </div>
    </section>
  );
}

function Rules() {
  const r = t.rules;
  return (
    <section className="mx-auto max-w-[1180px] px-5 py-16 md:px-8 md:py-24">
      <h2 data-lp-reveal className="lp-marker text-primary text-2xl">
        {r.title}
      </h2>
      <div className="mt-6">
        {r.rows.map((row) => (
          <div
            key={row.title}
            className="lp-rule grid gap-2 py-7 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] md:items-baseline md:gap-12 md:py-9"
          >
            <h3 className="font-display text-[clamp(1.9rem,5vw,3.2rem)] leading-[1.05] font-semibold tracking-tight">
              {row.title}
            </h3>
            <p className="max-w-[40ch] text-lg text-[#5c5248]">{row.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Faq() {
  const f = t.faq;
  return (
    <section
      id="faq"
      className="lp-faq mx-auto grid max-w-[1180px] scroll-mt-24 gap-8 px-5 py-16 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] md:gap-16 md:px-8 md:py-24"
    >
      <h2
        data-lp-reveal
        className="font-display text-[clamp(2.2rem,6vw,3.6rem)] leading-[1.05] font-semibold tracking-tight md:sticky md:top-28 md:self-start"
      >
        {f.title}
      </h2>
      <div className="space-y-3">
        {f.items.map((item) => (
          <details
            key={item.q}
            data-lp-reveal
            className="border-line rounded-[var(--radius-card)] border bg-[#fffaf2] px-5"
          >
            <summary className="flex min-h-16 items-center justify-between gap-4 text-lg font-bold">
              {item.q}
              <span
                aria-hidden
                className="lp-plus bg-ink text-sun flex size-8 shrink-0 items-center justify-center rounded-full text-xl leading-none"
              >
                +
              </span>
            </summary>
            <p className="max-w-[56ch] pb-5 text-[#5c5248]">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function Final() {
  const f = t.final;
  const around: Array<{ name: StickerName; at: string; size: number; tilt: number; from: string }> =
    [
      {
        name: 'burger',
        at: 'top-24 left-[4%] md:top-28 md:left-[10%]',
        size: 96,
        tilt: -10,
        from: '-220,-60,-40',
      },
      {
        name: 'pizza',
        at: 'top-20 right-[4%] md:top-28 md:right-[11%]',
        size: 92,
        tilt: 12,
        from: '220,-70,45',
      },
      {
        name: 'iced-coffee',
        at: 'bottom-8 left-[6%] md:bottom-16 md:left-[16%]',
        size: 62,
        tilt: 8,
        from: '-240,80,30',
      },
      {
        name: 'croissant',
        at: 'right-[5%] bottom-8 md:right-[15%] md:bottom-14',
        size: 92,
        tilt: -8,
        from: '240,90,-35',
      },
    ];
  return (
    <section className="lp-final relative overflow-hidden px-5 pt-48 pb-40 text-center md:pt-52 md:pb-44">
      {around.map((s) => (
        <span key={s.name} aria-hidden data-from={s.from} className={cn('absolute block', s.at)}>
          <Sticker name={s.name} size={s.size} tilt={s.tilt} />
        </span>
      ))}
      <h2
        data-lp-reveal
        className="font-display relative mx-auto max-w-[15ch] text-[clamp(2.5rem,8vw,5rem)] leading-[1.03] font-semibold tracking-tight"
      >
        {f.title}
      </h2>
      <p data-lp-reveal className="lp-marker text-primary relative mt-5 text-2xl md:text-3xl">
        {f.sub}
      </p>
      <div data-lp-reveal className="relative mt-9">
        <Cta />
      </div>
    </section>
  );
}

export default function WelcomePage() {
  return (
    <main className={cn('lp', anton.variable, marker.variable)}>
      <StickerDefs />
      <LandingMotion>
        <Nav />
        <Hero />
        <Statement />
        <Demo />
        <Circles />
        <More />
        <Cities />
        <Rules />
        <Faq />
        <Final />
      </LandingMotion>
      <div className="border-line mx-auto max-w-[1180px] border-t px-5 py-8 md:px-8">
        <Footer />
        <p className="text-muted mt-3 text-xs">{t.footerNote}</p>
      </div>
    </main>
  );
}
