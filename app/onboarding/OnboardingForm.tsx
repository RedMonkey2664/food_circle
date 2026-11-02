'use client';

import { useActionState, useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { checkUsername, completeOnboarding, type OnboardingState } from '@/lib/actions/profile';
import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';
import {
  VISIBILITY_LABEL,
  defaultVisibility,
  visibilityOptions,
  whoCanSee,
  type Visibility,
} from '@/lib/domain/visibility';
import { DIET_PREFS, USERNAME_RE } from '@/lib/validation/onboarding';

export type AreaGroup = { label: string; areas: Array<{ id: string; name: string }> };

type Props = { areas: AreaGroup[]; initial: { username: string; displayName: string } };

type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

const DIET_LABEL: Record<(typeof DIET_PREFS)[number], string> = {
  veg: 'Veg',
  jain: 'Jain',
  halal: 'Halal',
  egg: 'Eggetarian',
  nonveg: 'Non-veg',
};

function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block font-semibold">
        {label}
      </label>
      {hint ? <p className="text-muted text-sm">{hint}</p> : null}
      {children}
    </div>
  );
}

const inputCls =
  'border-line bg-surface text-ink placeholder:text-muted min-h-12 w-full rounded-[var(--radius-button)] border-2 px-3 focus:border-primary focus:outline-none';

export function OnboardingForm({ areas, initial }: Props) {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    completeOnboarding,
    null,
  );
  const [username, setUsername] = useState(initial.username);
  const [checked, setChecked] = useState<{ value: string; available: boolean } | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>(defaultVisibility(false));
  const ids = { username: useId(), name: useId(), area: useId() };

  // Format problems are known during render; only the server check is async.
  const value = username.trim().toLowerCase();
  const localStatus: Availability | null = !value
    ? 'idle'
    : USERNAME_RE.test(value)
      ? null
      : 'invalid';
  const availability: Availability =
    localStatus ??
    (checked?.value === value ? (checked.available ? 'available' : 'taken') : 'checking');

  // Debounced availability check (state is only set from the async callback).
  useEffect(() => {
    if (localStatus) return;
    const t = setTimeout(async () => {
      const r = await checkUsername(value);
      setChecked({ value, available: r.available });
    }, 350);
    return () => clearTimeout(t);
  }, [value, localStatus]);

  function changeAccountType(priv: boolean) {
    setIsPrivate(priv);
    // Follow the account type's default (PRODUCT_SPEC §5), unless they picked "Only me".
    if (visibility !== 'private') setVisibility(defaultVisibility(priv));
  }

  const availabilityText: Record<Availability, string> = {
    idle: '',
    checking: 'Checking…',
    available: 'Available',
    taken: 'That username is taken.',
    invalid: '3 to 24 characters: lowercase letters, numbers, dots or underscores.',
  };

  const errorField = state && !state.ok ? state.field : undefined;

  return (
    <form action={formAction} className="mt-8 space-y-7" noValidate>
      <Field label="Username" hint="How friends find you." htmlFor={ids.username}>
        <div className={cn(inputCls, 'focus-within:border-primary flex items-center gap-1')}>
          <span className="text-muted" aria-hidden>
            @
          </span>
          <input
            id={ids.username}
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={24}
            required
            aria-describedby={`${ids.username}-status`}
            aria-invalid={
              availability === 'taken' || availability === 'invalid' || errorField === 'username'
            }
            className="min-w-0 flex-1 bg-transparent py-2 focus:outline-none focus-visible:outline-none"
          />
        </div>
        <p
          id={`${ids.username}-status`}
          aria-live="polite"
          className={cn(
            'min-h-5 text-sm',
            availability === 'available'
              ? 'text-go'
              : availability === 'checking'
                ? 'text-muted'
                : 'text-skip',
          )}
        >
          {availabilityText[availability]}
        </p>
      </Field>

      <Field label="Your name" htmlFor={ids.name}>
        <input
          id={ids.name}
          name="displayName"
          defaultValue={initial.displayName}
          maxLength={60}
          required
          autoComplete="name"
          className={inputCls}
        />
      </Field>

      <Field label="Home area" hint="Optional. Helps friends and badges later." htmlFor={ids.area}>
        <select id={ids.area} name="homeAreaId" defaultValue="" className={inputCls}>
          <option value="">Skip for now</option>
          {areas.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>

      <fieldset className="space-y-2">
        <legend className="font-semibold">What do you eat?</legend>
        <p className="text-muted text-sm">
          Pick any. Used for filters, never shown as a judgement.
        </p>
        <div className="flex flex-wrap gap-2">
          {DIET_PREFS.map((d) => (
            <label key={d} className="relative">
              <input type="checkbox" name="dietPrefs" value={d} className="peer sr-only" />
              <span className="border-line bg-surface peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:text-primary peer-focus-visible:outline-focus inline-flex min-h-11 cursor-pointer items-center rounded-[var(--radius-pill)] border-2 px-4 font-medium peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2">
                {DIET_LABEL[d]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="font-semibold">Account type</legend>
        <input type="hidden" name="isPrivate" value={String(isPrivate)} />
        <div className="grid gap-2">
          {[
            {
              priv: false,
              title: 'Public',
              body: 'Anyone can follow you. Friends still see more.',
            },
            { priv: true, title: 'Private', body: 'You approve each follower.' },
          ].map((o) => (
            <label
              key={o.title}
              className={cn(
                'bg-surface flex min-h-14 cursor-pointer items-start gap-3 rounded-[var(--radius-card)] border-2 p-3',
                isPrivate === o.priv ? 'border-primary' : 'border-line',
              )}
            >
              <input
                type="radio"
                name="accountType"
                checked={isPrivate === o.priv}
                onChange={() => changeAccountType(o.priv)}
                className="accent-primary mt-1 size-5"
              />
              <span>
                <span className="block font-semibold">{o.title}</span>
                <span className="text-muted text-sm">{o.body}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="font-semibold">Who sees your entries by default?</legend>
        <p className="text-muted text-sm">You can change it on every entry.</p>
        <div role="radiogroup" className="grid grid-cols-2 gap-2">
          {visibilityOptions(isPrivate).map((v) => (
            <label
              key={v}
              className={cn(
                'bg-surface flex min-h-12 cursor-pointer items-center justify-center rounded-[var(--radius-button)] border-2 px-3 font-medium',
                visibility === v ? 'border-primary text-primary' : 'border-line',
              )}
            >
              <input
                type="radio"
                name="defaultVisibility"
                value={v}
                checked={visibility === v}
                onChange={() => setVisibility(v)}
                className="sr-only"
              />
              {VISIBILITY_LABEL[v]}
            </label>
          ))}
        </div>
        <p className="text-sm" aria-live="polite">
          {whoCanSee(visibility, isPrivate)}
        </p>
      </fieldset>

      {state && !state.ok ? (
        <p
          role="alert"
          className="bg-skip-soft text-skip rounded-[var(--radius-button)] px-3 py-2 text-sm"
        >
          {state.message}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        fullWidth
        disabled={
          pending ||
          availability === 'taken' ||
          availability === 'invalid' ||
          availability === 'checking'
        }
      >
        {pending ? copy.onboarding.saving : copy.onboarding.submit}
      </Button>
    </form>
  );
}
