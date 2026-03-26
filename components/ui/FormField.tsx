import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { colors, typography } from '@/constants/theme';

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string | null;
}

export function FormField({ label, error, style, ...rest }: FormFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={colors.on_surface_variant}
        {...rest}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    ...typography.label_md,
    color: colors.on_surface_variant,
  },
  input: {
    ...typography.body_md,
    color: colors.on_surface,
    backgroundColor: colors.surface_container_low,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(65, 71, 85, 0.2)',
  },
  inputError: {
    borderColor: colors.error,
  },
  error: {
    ...typography.label_sm,
    color: colors.error,
  },
});
