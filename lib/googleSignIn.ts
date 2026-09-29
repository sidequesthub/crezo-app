import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * iOS OAuth client in Google Cloud project macro-resolver-310707. Not a
 * secret — it ships in the binary. Supabase's Google provider lists it under
 * Client IDs so it accepts ID tokens minted for this audience.
 */
const IOS_CLIENT_ID =
  '54775582157-rskti2i43p73f21ncojpol86kdsdp2uj.apps.googleusercontent.com';

/**
 * Native sign-in needs the RNGoogleSignin module, which exists only in our own
 * builds. Expo Go and Android fall back to the Supabase web OAuth flow.
 */
export function canUseNativeGoogleSignIn(): boolean {
  return (
    Platform.OS === 'ios' &&
    Constants.executionEnvironment !== ExecutionEnvironment.StoreClient
  );
}

/** Shows Google's native sheet. Returns the ID token, or null if cancelled. */
export async function getGoogleIdToken(): Promise<string | null> {
  // Required lazily: importing at module scope crashes Expo Go, which lacks the native module.
  const { GoogleSignin, isSuccessResponse } =
    require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');

  GoogleSignin.configure({ iosClientId: IOS_CLIENT_ID });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return null;
  if (!response.data.idToken) throw new Error('Google returned no ID token');
  return response.data.idToken;
}
