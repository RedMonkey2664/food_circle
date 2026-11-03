import { z } from 'zod';
import { DISH_NAME_MAX, MAX_DISHES, NOTE_MAX, OCCASIONS } from '@/lib/domain/review';

// Review layer input (P4-01, P4-02). Everything optional: the verdict is already saved.
export const saveReviewInput = z.object({
  visitId: z.uuid(),
  note: z.string().trim().max(NOTE_MAX).optional(),
  pricePerHead: z.number().int().min(0).max(100_000).nullable().optional(),
  occasions: z.array(z.enum(OCCASIONS)).max(OCCASIONS.length).optional(),
  dishes: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(DISH_NAME_MAX),
        verdict: z.enum(['go', 'skip']),
      }),
    )
    .max(MAX_DISHES)
    .optional(),
});
export type SaveReviewInput = z.infer<typeof saveReviewInput>;

/** {author}/{visit}/{uuid}.webp, as the storage policy and the photo guard expect. */
export const photoPath = z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/);
