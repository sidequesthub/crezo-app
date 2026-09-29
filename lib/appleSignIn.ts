import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase';

/**
 * Sign in with Apple, required by App Store guideline 4.8 alongside Google.
 * Native sheet → identity token → Supabase `signInWithIdToken`. The nonce is
 * sent hashed to Apple and raw to Supabase, which re-hashes it to check the
 * token was minted for this request.
 */
export async function appleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/** Resolves false if the user cancelled; throws on any other failure. */
export async function signInWithApple(): Promise<boolean> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return false;
    throw e;
  }
  if (!credential.identityToken) throw new Error('Apple returned no identity token');

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;

  // Apple sends the name only on the very first sign-in, and never inside the
  // token — save it now or the account is nameless for good.
  const name = [credential.fullName?.givenName, credential.fullName?.familyName]
    .filter(Boolean)
    .join(' ');
  if (name) {
    const { data } = await supabase.auth.updateUser({ data: { full_name: name } });
    // The creators row was created from the token before the name arrived.
    if (data.user) await supabase.from('creators').update({ name }).eq('user_id', data.user.id);
  }
  return true;
}
