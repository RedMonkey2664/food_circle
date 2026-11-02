import { Suspense } from 'react';
import { RouteSettled } from '@/components/motion/RouteSettled';
import { BottomNav, BottomNavStatic } from '@/components/nav/BottomNav';
import { requireOnboardedUser } from '@/lib/auth';

// Session guard. The shell (nav, column) prerenders instantly; the session check streams in
// behind Suspense (Cache Components). Signed-out users are redirected to /login.
async function AuthGate({ children }: { children: React.ReactNode }) {
  await requireOnboardedUser();
  return <>{children}</>;
}

function ShellSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-3 pt-4">
      <div className="bg-line h-7 w-40 animate-pulse rounded-md" />
      <div className="bg-line/60 h-32 animate-pulse rounded-[var(--radius-card)]" />
    </div>
  );
}

export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <div className="mx-auto min-h-dvh max-w-[480px] px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-28">
        <Suspense fallback={<ShellSkeleton />}>
          <AuthGate>{children}</AuthGate>
        </Suspense>
      </div>
      <Suspense fallback={<BottomNavStatic />}>
        <BottomNav />
      </Suspense>
      <Suspense fallback={null}>
        <RouteSettled />
      </Suspense>
    </>
  );
}
