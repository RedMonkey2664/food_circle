'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { redeemInvite } from '@/lib/actions/social';
import { copy } from '@/lib/copy';

/** The one tap that turns an invite into a friendship (POST via server action). */
export function AcceptInvite({ code }: { code: string }) {
  const [state, action, pending] = useActionState(redeemInvite, null);
  return (
    <form action={action} className="mt-6">
      <input type="hidden" name="code" value={code} />
      <Button type="submit" size="lg" fullWidth disabled={pending}>
        {pending ? copy.social.sending : copy.invite.accept}
      </Button>
      {state && !state.ok ? (
        <p role="alert" className="text-skip mt-2 text-sm">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
