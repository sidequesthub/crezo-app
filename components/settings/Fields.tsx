import { View, Text, TextInput, StyleSheet, Pressable, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';

export function LabelledInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  hint,
  autoCapitalize = 'sentences',
  keyboardType,
  multiline,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  placeholder?: string;
  error?: string | null;
  hint?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'phone-pad';
  multiline?: boolean;
  editable?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(193, 198, 215, 0.4)"
        style={[
          styles.input,
          multiline && styles.textarea,
          !editable && styles.inputDisabled,
          error ? styles.inputError : null,
        ]}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : undefined}
        editable={editable}
      />
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function ToggleRow({
  icon,
  label,
  description,
  value,
  onValueChange,
  disabled,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.row, disabled && { opacity: 0.55 }]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={Colors.onSurface} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        {description && <Text style={styles.rowDesc}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: Colors.surfaceContainerHighest, true: Colors.primaryContainer }}
        thumbColor={Colors.onSurface}
      />
    </View>
  );
}

export function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={Colors.onSurface} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function ActionRow({
  icon,
  label,
  description,
  onPress,
  tint = Colors.onSurface,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  description?: string;
  onPress: () => void;
  tint?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, { color: tint }]}>{label}</Text>
        {description && <Text style={styles.rowDesc}>{description}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.onSurfaceVariant} />
    </Pressable>
  );
}

export function SaveButton({
  label,
  onPress,
  saving,
}: {
  label: string;
  onPress: () => void;
  saving?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={saving} style={styles.save}>
      <LinearGradient
        colors={['#ADC6FF', '#4B8EFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.saveBg}
      >
        <Text style={styles.saveText}>{saving ? 'Saving…' : label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: 7 },
  label: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
    color: Colors.onSurface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputDisabled: { color: Colors.onSurfaceVariant },
  inputError: { borderColor: Colors.error },
  textarea: { minHeight: 92, paddingTop: 14 },
  error: { fontFamily: 'Manrope_500Medium', fontSize: 11, color: Colors.error },
  hint: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  rowPressed: { backgroundColor: Colors.surfaceContainerHigh },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerHigh,
  },
  rowBody: { flex: 1, gap: 2 },
  rowLabel: { fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: Colors.onSurface },
  rowDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    lineHeight: 16,
  },
  rowValue: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    maxWidth: '45%',
  },

  save: { borderRadius: 16, overflow: 'hidden' },
  saveBg: { paddingVertical: 16, alignItems: 'center' },
  saveText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    color: Colors.onPrimaryContainer,
  },
});
