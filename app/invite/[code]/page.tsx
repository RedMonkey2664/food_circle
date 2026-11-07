import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { Avatar } from '@/components/social/Avatar';
import { buttonClass } from '@/components/ui/Button';
import { copy } from '@/lib/copy';
import { createClient } from '@/lib/supabase/server';
import { AcceptInvite } from './AcceptInvite';
import { Brand } from '@/components/brand/Logo';

export const metadata = { title: 'Invite' };

const CODE_RE = /^[A-Za-z0-9_-]{22,64}$/;
type Status = keyof typeof copy.invite.status;

// Opening the link never changes anything (no state-changing GET). The friendship is created
// only when the signed-in person taps "Add as friend" (DECISIONS.md).
async function InviteContent({ params }: { params: PageProps<'/invite/[code]'>['params'] }) {
  const { code } = await params;
  const here = `/invite/${encodeURIComponent(code)}`;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims?.sub) {
    return (
      <Card>
        <h1 className="text-2xl">
          <Brand size={44} />
        </h1>
        <p className="text-muted mt-2">{copy.invite.pageBody}</p>
        <Link
          href={`/login?next=${encodeURIComponent(here)}`}
          className={buttonClass({ size: 'lg', fullWidth: true, className: 'mt-6' })}
        >
          {copy.invite.signIn}
        </Link>
      </Card>
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded_at')
    .eq('id', claims.claims.sub)
    .maybeSingle();
  if (!profile?.onboarded_at) redirect(`/onboarding?next=${encodeURIComponent(here)}`);

  const preview = CODE_RE.test(code)
    ? (await supabase.rpc('get_invite_preview', { p_code: code })).data?.[0]
    : undefined;
  const status = (preview?.status ?? 'not_found') as Status;
  const groupName = preview?.kind === 'group' ? preview.group_name : null;
  const inviter = preview?.display_name ?? '';

  return (
    <Card>
      {preview?.display_name ? (
        <div className="flex items-center gap-3">
          <Avatar name={preview.display_name} url={preview.avatar_url} size={56} />
          <div>
            <h1 className="font-display text-xl font-semibold">
              {groupName
                ? copy.invite.groupTitle(groupName)
                : copy.invite.pageTitle(preview.display_name)}
            </h1>
            <p className="text-muted text-sm">@{preview.username}</p>
          </div>
        </div>
      ) : (
        <h1 className="text-xl">
          <Brand />
        </h1>
      )}

      {status === 'ok' && groupName ? (
        <>
          <p className="text-muted mt-4">{copy.invite.groupBody(inviter)}</p>
          <AcceptInvite code={code} label={copy.invite.joinGroup} />
        </>
      ) : status === 'needs_friendship' && groupName ? (
        <>
          <p className="text-muted mt-4">{copy.invite.groupNeedsFriend(inviter)}</p>
          <AcceptInvite code={code} label={copy.invite.befriendAndJoin(inviter)} befriend />
        </>
      ) : status === 'ok' ? (
        <>
          <p className="text-muted mt-4">{copy.invite.pageBody}</p>
          <AcceptInvite code={code} />
        </>
      ) : (
        <>
          <p className="mt-4">{copy.invite.status[status]}</p>
          <Link
            href={
              status === 'already_member' && preview?.group_id
                ? `/groups/${preview.group_id}`
                : '/friends'
            }
            className={buttonClass({ variant: 'secondary', fullWidth: true, className: 'mt-6' })}
          >
            {status === 'already_member' ? copy.groups.title : copy.friends.title}
          </Link>
        </>
      )}
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="border-line bg-surface rounded-[var(--radius-card)] border p-5">
      {children}
    </section>
  );
}

export default function InvitePage(props: PageProps<'/invite/[code]'>) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center px-4 py-10">
      <Suspense
        fallback={
          <div
            aria-busy="true"
            className="bg-line/60 h-48 animate-pulse rounded-[var(--radius-card)]"
          />
        }
      >
        <InviteContent params={props.params} />
      </Suspense>
    </main>
  );
}
