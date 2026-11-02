import { APP_NAME, APP_TAGLINE } from '@/lib/config';

// Placeholder until P0-05 (auth) and P0-06 (design system) land.
export default function Home() {
  return (
    <main>
      <h1>{APP_NAME}</h1>
      <p>{APP_TAGLINE}</p>
    </main>
  );
}
