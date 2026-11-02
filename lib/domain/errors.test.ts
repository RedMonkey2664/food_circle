import { describe, expect, it } from 'vitest';
import { fromDbError } from './errors';

describe('fromDbError', () => {
  it('maps known RPC codes to friendly copy', () => {
    expect(fromDbError({ message: 'username_taken' })).toEqual({
      code: 'username_taken',
      message: 'That username is taken. Try another.',
    });
  });
  it('keeps the field hint from details', () => {
    expect(fromDbError({ message: 'invalid_input', details: 'home_area' }).field).toBe('home_area');
  });
  it('never leaks raw database messages', () => {
    const r = fromDbError({ message: 'duplicate key value violates unique constraint "x"' });
    expect(r.code).toBe('generic');
    expect(r.message).not.toContain('constraint');
  });
});
