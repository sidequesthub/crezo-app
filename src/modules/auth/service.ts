import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { getSupabase } from '../../config/supabase';
import { env } from '../../config/env';
import * as msg91 from './msg91';

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface PhoneSession {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
  expires_at: number;
  user: {
    id: string;
    phone: string;
  };
}

/**
 * Normalize an Indian phone number to MSG91's expected format: '91XXXXXXXXXX' (no + prefix, 12 digits).
 * Also returns an E.164 form ('+91XXXXXXXXXX') for storage in Supabase.
 */
export function normalizePhone(raw: string): { msg91: string; e164: string } {
  const digits = raw.replace(/\D/g, '');
  let national = digits;
  if (national.startsWith('91') && national.length === 12) {
    national = national.slice(2);
  } else if (national.startsWith('0') && national.length === 11) {
    national = national.slice(1);
  }
  if (national.length !== 10) {
    throw new Error('Invalid phone number. Expected a 10-digit Indian mobile.');
  }
  return { msg91: `91${national}`, e164: `+91${national}` };
}

export async function startPhoneOtp(rawPhone: string): Promise<{ phone: string }> {
  const { msg91: m, e164 } = normalizePhone(rawPhone);
  await msg91.sendOtp(m);
  return { phone: e164 };
}

export async function resendPhoneOtp(
  rawPhone: string,
  via: 'text' | 'voice' = 'text',
): Promise<{ phone: string }> {
  const { msg91: m, e164 } = normalizePhone(rawPhone);
  await msg91.resendOtp(m, via);
  return { phone: e164 };
}

export async function verifyPhoneOtp(
  rawPhone: string,
  otp: string,
): Promise<PhoneSession> {
  const { msg91: m, e164 } = normalizePhone(rawPhone);
  await msg91.verifyOtp(m, otp);

  const userId = await upsertSupabaseUser(e164);
  return mintPhoneSession(userId, e164);
}

/**
 * Find an existing Supabase auth user by phone, or create one. Returns the user id.
 *
 * Supabase admin SDK does not expose a direct "find by phone" — we list users with
 * a phone filter. For high user counts, replace with a dedicated lookup table.
 */
async function upsertSupabaseUser(phoneE164: string): Promise<string> {
  const supabase = getSupabase();

  // Try to find existing user. listUsers supports email/phone filters via admin RPC,
  // but the JS client only supports paginated listUsers. Use a small page and filter
  // client-side; for production, swap to a `phone_users` table for O(1) lookup.
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) throw new Error(`User lookup failed: ${listErr.message}`);

  const existing = list.users.find((u) => u.phone === phoneE164.replace('+', ''));
  if (existing) return existing.id;

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    phone: phoneE164.replace('+', ''),
    phone_confirm: true,
  });
  if (createErr || !created.user) {
    throw new Error(`User create failed: ${createErr?.message ?? 'unknown'}`);
  }
  return created.user.id;
}

/**
 * Mint a Supabase-compatible JWT signed with SUPABASE_JWT_SECRET. The Supabase
 * service validates this signature in `auth.getUser()` and PostgREST RLS, so any
 * call made with this token is treated as the authenticated user.
 */
function mintPhoneSession(userId: string, phoneE164: string): PhoneSession {
  const now = Math.floor(Date.now() / 1000);
  const accessExp = now + ACCESS_TOKEN_TTL_SECONDS;

  const access_token = jwt.sign(
    {
      sub: userId,
      aud: 'authenticated',
      role: 'authenticated',
      phone: phoneE164.replace('+', ''),
      iat: now,
      exp: accessExp,
      iss: 'crezo-backend',
      app_metadata: { provider: 'phone', providers: ['phone'] },
      user_metadata: {},
    },
    env.supabaseJwtSecret,
    { algorithm: 'HS256' },
  );

  const refresh_token = jwt.sign(
    {
      sub: userId,
      type: 'refresh',
      jti: randomUUID(),
      iat: now,
      exp: now + REFRESH_TOKEN_TTL_SECONDS,
      iss: 'crezo-backend',
    },
    env.supabaseJwtSecret,
    { algorithm: 'HS256' },
  );

  return {
    access_token,
    refresh_token,
    token_type: 'bearer',
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    expires_at: accessExp,
    user: { id: userId, phone: phoneE164 },
  };
}

export function refreshPhoneSession(refreshToken: string): PhoneSession {
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(refreshToken, env.supabaseJwtSecret, {
      algorithms: ['HS256'],
    }) as jwt.JwtPayload;
  } catch {
    throw new Error('Invalid or expired refresh token');
  }
  if (payload.type !== 'refresh' || !payload.sub) {
    throw new Error('Invalid refresh token');
  }
  // We don't have phone in refresh; the access token only needs `sub` for RLS.
  return mintPhoneSession(payload.sub, '');
}
