'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { redeemInvite } from '@/lib/actions/social';
import { copy } from '@/lib/copy';

/** The one tap that redeems an invite (POST via server action): friendship, or group join. */
export function AcceptInvite({
  code,
  label = copy.invite.accept,
  befriend = false,
}: {
  code: string;
  label?: string;
  befriend?: boolean;
}) {
  const [state, action, pending] = useActionState(redeemInvite, null);
  return (
    <form action={action} className="mt-6">
      <input type="hidden" name="code" value={code} />
      {befriend ? <input type="hidden" name="befriend" value="1" /> : null}
      <Button type="submit" size="lg" fullWidth disabled={pending}>
        {pending ? copy.social.sending : label}
      </Button>
      {state && !state.ok ? (
        <p role="alert" className="text-skip mt-2 text-sm">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
