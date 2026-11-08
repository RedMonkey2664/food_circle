import 'server-only';
import { cookies } from 'next/headers';
import { NEAR_COOKIE, parseNear, type Near } from '@/lib/domain/cities';

/** The visitor's chosen city or approximate "near me" point (a device cookie), if any. */
export async function readNear(): Promise<Near | null> {
  return parseNear((await cookies()).get(NEAR_COOKIE)?.value);
}
