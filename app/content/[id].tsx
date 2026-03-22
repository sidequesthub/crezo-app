import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/constants/theme';
import { mockContentSlots } from '@/lib/mock-data';

export default function ContentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const slot = mockContentSlots.find((s) => s.id === id);

  if (!slot) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Content not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{slot.title}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.label}>Platform</Text>
        <Text style={styles.value}>{slot.platform.replace('_', ' ')}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{slot.status}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.label}>Scheduled</Text>
        <Text style={styles.value}>
          {new Date(slot.scheduled_date).toLocaleDateString('en-IN')}
        </Text>
      </View>
      {slot.notes && (
        <Text style={styles.notes}>{slot.notes}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 24, gap: 16 },
  title: { ...typography.headline_lg, color: colors.on_surface },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { ...typography.label_md, color: colors.on_surface_variant },
  value: { ...typography.body_md, color: colors.on_surface },
  notes: { ...typography.body_md, color: colors.on_surface_variant, marginTop: 8 },
  error: { ...typography.body_md, color: colors.error },
});
