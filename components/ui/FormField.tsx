import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

/**
 * A labelled form field, shared by every form so labels can't drift apart.
 * `optional` adds a quiet "(optional)" after the label: lighter, lowercase
 * and smaller, so it reads as a hint rather than part of the label.
 */
export function Field({
  label,
  optional = false,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {optional && <Text style={styles.optional}> (optional)</Text>}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 10 },
  label: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  optional: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: Colors.outline,
    letterSpacing: 0,
    textTransform: 'none',
  },
});
