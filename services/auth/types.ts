/**
 * Auth Domain — Service Interface
 *
 * Microservice boundary: Auth & Identity
 * Owns: user registration, login, session management
 */

export interface AuthService {
  isConfigured(): boolean;

  signUp(email: string, password: string): Promise<{ error: Error | null }>;
  signIn(email: string, password: string): Promise<{ error: Error | null }>;
  signInWithGoogle(redirectTo: string): Promise<{ error: Error | null }>;
  sendOtp(phone: string): Promise<{ error: Error | null }>;
  verifyOtp(phone: string, token: string): Promise<{ error: Error | null }>;
  signOut(): Promise<void>;

  getSession(): Promise<AuthSession | null>;
  onAuthStateChange(
    callback: (event: string, session: AuthSession | null) => void
  ): { unsubscribe: () => void };
}

export type AuthSession = {
  user: AuthUser;
};

export type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};
