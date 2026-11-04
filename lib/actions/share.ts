'use server';

import { z } from 'zod';
import { fail, fromDbError, type ActionResult } from '@/lib/domain/errors';
import { siteOrigin } from '@/lib/site';
import { createClient } from '@/lib/supabase/server';

const input = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('recap'), ref: z.string().regex(/^\d{4}$/) }),
  z.object({ kind: z.literal('badge'), ref: z.string().regex(/^[a-z0-9-]{2,40}$/) }),
  z.object({ kind: z.literal('journey') }),
]);

/** Create a public share link on purpose (P7-04). Returns the page URL and the story image URL. */
export async function createShareCard(
  raw: z.infer<typeof input>,
): Promise<ActionResult<{ url: string; storyUrl: string }>> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return fail('invalid_input');
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_share_card', {
    p_kind: parsed.data.kind,
    ...('ref' in parsed.data ? { p_ref: parsed.data.ref } : {}),
  });
  if (error || !data) return { ok: false, ...fromDbError(error) };
  const origin = await siteOrigin();
  return { ok: true, data: { url: `${origin}/s/${data}`, storyUrl: `${origin}/s/${data}/story` } };
}

export async function revokeShareCard(token: string): Promise<ActionResult<null>> {
  const t = z
    .string()
    .regex(/^[A-Za-z0-9_-]{22,64}$/)
    .safeParse(token);
  if (!t.success) return fail('invalid_input');
  const supabase = await createClient();
  const { error } = await supabase.rpc('revoke_share_card', { p_token: t.data });
  if (error) return { ok: false, ...fromDbError(error) };
  return { ok: true, data: null };
}
