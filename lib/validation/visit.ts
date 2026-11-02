import { z } from 'zod';
import { VERDICTS, ONLY_FOR_MAX } from '@/lib/domain/verdict';
import { VISIBILITIES } from '@/lib/domain/visibility';

// API_SPEC.md §2. Only the verdict (plus place and audience) is required: the 10-second rule.
export const logVisitInput = z
  .object({
    placeId: z.uuid(),
    verdict: z.enum(VERDICTS),
    onlyForText: z.string().trim().max(ONLY_FOR_MAX).optional(),
    visibility: z.enum(VISIBILITIES),
    visitedOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(), // IST date; the database defaults to today
  })
  .refine((v) => v.verdict === 'only_for' || !v.onlyForText, {
    message: 'onlyForText only with only_for',
    path: ['onlyForText'],
  })
  .refine((v) => v.verdict !== 'only_for' || (v.onlyForText?.length ?? 0) > 0, {
    message: 'Say what it is worth going for.',
    path: ['onlyForText'],
  });

export type LogVisitInput = z.infer<typeof logVisitInput>;
