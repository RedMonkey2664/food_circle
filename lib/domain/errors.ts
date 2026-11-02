// Stable error codes raised by RPCs (API_SPEC.md §5) and their user-facing sentences.
// Never show raw database errors to users.
export const ERROR_COPY = {
  not_authenticated: 'Please sign in again.',
  forbidden: "You can't do that.",
  not_found: "We couldn't find that.",
  blocked: "You can't interact with this person.",
  rate_limited: "You've done that a lot today. Try again tomorrow.",
  invalid_input: 'Something in the form needs a fix.',
  username_taken: 'That username is taken. Try another.',
  already_friends: "You're already friends.",
  request_pending: 'A request is already pending.',
  invite_expired: 'This invite link has expired. Ask for a new one.',
  invite_revoked: 'This invite link was turned off. Ask for a new one.',
  invite_used_up: 'This invite link has been used too many times. Ask for a new one.',
  needs_friendship: 'You need to be friends first.',
  duplicate_candidates: 'This might already exist.',
  place_merged: 'This place was merged into another one.',
  future_date: "That date hasn't happened yet.",
  group_full: 'This group is full.',
  generic: 'Something went wrong. Please try again.',
} as const;

export type ErrorCode = keyof typeof ERROR_COPY;

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; code: ErrorCode; message: string; field?: string };

function isErrorCode(v: string): v is ErrorCode {
  return v in ERROR_COPY;
}

/** Map a Supabase/PostgREST error to a stable code + friendly message. */
export function fromDbError(err: { message?: string; details?: string | null } | null): {
  code: ErrorCode;
  message: string;
  field?: string;
} {
  const raw = err?.message?.trim() ?? '';
  const code: ErrorCode = isErrorCode(raw) ? raw : 'generic';
  const field = err?.details ?? undefined;
  return { code, message: ERROR_COPY[code], ...(field ? { field } : {}) };
}

export function fail(
  code: ErrorCode,
  field?: string,
): { ok: false; code: ErrorCode; message: string; field?: string } {
  return { ok: false, code, message: ERROR_COPY[code], ...(field ? { field } : {}) };
}
