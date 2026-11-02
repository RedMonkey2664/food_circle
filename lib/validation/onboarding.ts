import { z } from 'zod';
import { VISIBILITIES } from '@/lib/domain/visibility';

export const USERNAME_RE = /^[a-z0-9_.]{3,24}$/;
export const DIET_PREFS = ['veg', 'jain', 'halal', 'egg', 'nonveg'] as const;

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(USERNAME_RE, '3 to 24 characters: lowercase letters, numbers, dots or underscores.');

export const onboardingInput = z
  .object({
    username: usernameSchema,
    displayName: z.string().trim().min(1, 'Add your name.').max(60, 'Keep it under 60 characters.'),
    homeAreaId: z.uuid().nullable(),
    dietPrefs: z.array(z.enum(DIET_PREFS)).max(DIET_PREFS.length),
    isPrivate: z.boolean(),
    defaultVisibility: z.enum(VISIBILITIES),
  })
  .refine((v) => !(v.isPrivate && v.defaultVisibility === 'public'), {
    message: 'Private accounts cannot default to Public.',
    path: ['defaultVisibility'],
  });

export type OnboardingInput = z.infer<typeof onboardingInput>;

/** FormData -> plain object for onboardingInput. */
export function onboardingFromForm(form: FormData) {
  const area = form.get('homeAreaId');
  return {
    username: form.get('username'),
    displayName: form.get('displayName'),
    homeAreaId: typeof area === 'string' && area !== '' ? area : null,
    dietPrefs: form.getAll('dietPrefs'),
    isPrivate: form.get('isPrivate') === 'true',
    defaultVisibility: form.get('defaultVisibility'),
  };
}
