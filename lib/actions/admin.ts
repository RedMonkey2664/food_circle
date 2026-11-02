'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { fail, fromDbError, type ActionResult } from '@/lib/domain/errors';
import { createClient } from '@/lib/supabase/server';

const resolveInput = z.object({
  reportId: z.uuid(),
  status: z.enum(['reviewed', 'actioned', 'dismissed']),
});

/** Admin: close a report. The RPC re-checks is_admin and writes admin_audit. */
export async function resolveReport(
  _prev: ActionResult<unknown> | null,
  formData: FormData,
): Promise<ActionResult<unknown>> {
  const parsed = resolveInput.safeParse({
    reportId: formData.get('reportId'),
    status: formData.get('status'),
  });
  if (!parsed.success) return fail('invalid_input');
  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_resolve_report', {
    p_report: parsed.data.reportId,
    p_status: parsed.data.status,
  });
  if (error) return { ok: false, ...fromDbError(error) };
  revalidatePath('/admin/reports');
  return { ok: true, data: undefined };
}
