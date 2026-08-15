import { env } from '../../config/env';

const MSG91_BASE = 'https://control.msg91.com/api/v5/otp';

export interface Msg91Response {
  type: 'success' | 'error';
  message: string;
  request_id?: string;
}

/**
 * Send an OTP to the given E.164 phone number (without leading '+').
 * MSG91 expects mobile in international format e.g. "919876543210".
 */
export async function sendOtp(mobile: string): Promise<void> {
  const url = new URL(MSG91_BASE);
  url.searchParams.set('template_id', env.msg91TemplateId);
  url.searchParams.set('mobile', mobile);
  url.searchParams.set('otp_length', String(env.msg91OtpLength));
  url.searchParams.set('otp_expiry', String(env.msg91OtpExpiryMinutes));
  if (env.msg91SenderId) url.searchParams.set('sender', env.msg91SenderId);

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      authkey: env.msg91AuthKey,
      'Content-Type': 'application/json',
    },
  });

  const json = (await res.json()) as Msg91Response;
  if (!res.ok || json.type !== 'success') {
    throw new Error(json.message || `MSG91 send failed (${res.status})`);
  }
}

/**
 * Verify an OTP for a given mobile. Throws on failure.
 */
export async function verifyOtp(mobile: string, otp: string): Promise<void> {
  const url = new URL(`${MSG91_BASE}/verify`);
  url.searchParams.set('mobile', mobile);
  url.searchParams.set('otp', otp);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { authkey: env.msg91AuthKey },
  });

  const json = (await res.json()) as Msg91Response;
  if (!res.ok || json.type !== 'success') {
    throw new Error(json.message || 'Invalid OTP');
  }
}

/**
 * Resend an OTP. retrytype is 'text' or 'voice'.
 */
export async function resendOtp(
  mobile: string,
  retrytype: 'text' | 'voice' = 'text',
): Promise<void> {
  const url = new URL(`${MSG91_BASE}/retry`);
  url.searchParams.set('mobile', mobile);
  url.searchParams.set('retrytype', retrytype);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { authkey: env.msg91AuthKey },
  });

  const json = (await res.json()) as Msg91Response;
  if (!res.ok || json.type !== 'success') {
    throw new Error(json.message || 'Resend failed');
  }
}
