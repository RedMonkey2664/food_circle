import { Suspense } from 'react';
import { RouteSettled } from '@/components/motion/RouteSettled';
import { BackToTop } from '@/components/interactive/BackToTop';
import { Toaster } from '@/components/interactive/Toast';
import { BottomNav, BottomNavStatic } from '@/components/nav/BottomNav';
import { SideNav, SideNavStatic } from '@/components/nav/SideNav';
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
      {/* Phones: one 480px column above the bottom nav. iPad (md): side rail, 720px column.
          PC (lg): full sidebar, up to 1080px so pages can add a second column. */}
      <div className="md:pl-[84px] md:has-[[data-takeover]]:pl-0 lg:pl-[248px]">
        <div className="mx-auto min-h-dvh max-w-[480px] px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-28 md:max-w-[720px] md:px-8 md:pt-8 md:pb-12 lg:max-w-[1080px] lg:px-10">
          <Suspense fallback={<ShellSkeleton />}>
            <AuthGate>{children}</AuthGate>
          </Suspense>
        </div>
      </div>
      <Suspense fallback={<SideNavStatic />}>
        <SideNav />
      </Suspense>
      <Suspense fallback={<BottomNavStatic />}>
        <BottomNav />
      </Suspense>
      <Suspense fallback={null}>
        <RouteSettled />
      </Suspense>
      <Toaster />
      <BackToTop />
    </>
  );
}
