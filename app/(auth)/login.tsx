import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/ui';
import { colors, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const { signIn, signUp, supabaseConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!supabaseConfigured) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Supabase not configured</Text>
        <Text style={styles.hint}>
          Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your environment, or
          use the app without auth (mock data).
        </Text>
        <Button
          title="Continue with demo data"
          onPress={() => router.replace('/(tabs)')}
          variant="primary"
        />
      </View>
    );
  }

  async function handleSubmit() {
    setMessage(null);
    if (!email.trim() || !password) {
      setMessage('Enter email and password');
      return;
    }
    setSubmitting(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const { error } = await fn(email.trim(), password);
    setSubmitting(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.replace('/(tabs)');
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.logo}>Crezo</Text>
        <Text style={styles.subtitle}>Sign in to sync your data</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.on_surface_variant}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.on_surface_variant}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {message && <Text style={styles.error}>{message}</Text>}

        <Button
          title={mode === 'signin' ? 'Sign in' : 'Create account'}
          onPress={handleSubmit}
          variant="primary"
          disabled={submitting}
        />

        <Pressable
          onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          style={styles.switchMode}
        >
          <Text style={styles.switchText}>
            {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </Text>
        </Pressable>

        <Pressable style={styles.skip} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.skipText}>Skip (demo mode)</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  scroll: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 80,
    gap: 16,
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 16,
    backgroundColor: colors.surface,
  },
  title: { ...typography.headline_lg, color: colors.on_surface },
  hint: { ...typography.body_md, color: colors.on_surface_variant },
  logo: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 32,
    fontStyle: 'italic',
    color: colors.primary,
    marginBottom: 8,
  },
  subtitle: { ...typography.body_md, color: colors.on_surface_variant },
  field: { gap: 8 },
  label: { ...typography.label_md, color: colors.on_surface_variant },
  input: {
    ...typography.body_md,
    color: colors.on_surface,
    backgroundColor: colors.surface_container_low,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(65, 71, 85, 0.2)',
  },
  error: { ...typography.body_sm, color: colors.error },
  switchMode: { alignItems: 'center', marginTop: 8 },
  switchText: { ...typography.body_md, color: colors.primary },
  skip: { alignItems: 'center', marginTop: 24 },
  skipText: { ...typography.label_sm, color: colors.on_surface_variant },
});
