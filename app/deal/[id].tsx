import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, Linking } from 'react-native';

import { CurrencyDisplay } from '@/components/ui';
import { colors, typography } from '@/constants/theme';
import { mockDeals } from '@/lib/mock-data';

export default function DealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const deal = mockDeals.find((d) => d.id === id);

  if (!deal) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Deal not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{deal.title}</Text>
      <Text style={styles.brand}>{deal.brand?.name}</Text>
      <CurrencyDisplay amount={deal.value_inr} size="lg" variant="primary" />
      <View style={styles.statusRow}>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{deal.status.replace('_', ' ')}</Text>
      </View>
      {deal.brand?.whatsapp && (
        <Text
          style={styles.link}
          onPress={() => Linking.openURL(`https://wa.me/${deal.brand!.whatsapp!.replace(/\D/g, '')}`)}
        >
          Open WhatsApp
        </Text>
      )}
      {deal.deliverables && deal.deliverables.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deliverables</Text>
          {deal.deliverables.map((d) => (
            <View key={d.id} style={styles.deliverableRow}>
              <Text style={styles.deliverableTitle}>{d.title || d.type}</Text>
              <Text style={styles.deliverableStatus}>{d.status}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 24, gap: 16 },
  title: { ...typography.headline_lg, color: colors.on_surface },
  brand: { ...typography.body_md, color: colors.on_surface_variant },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { ...typography.label_md, color: colors.on_surface_variant },
  value: { ...typography.body_md, color: colors.on_surface },
  link: { ...typography.body_md, color: colors.primary },
  error: { ...typography.body_md, color: colors.error },
  section: { marginTop: 24, gap: 12 },
  sectionTitle: { ...typography.headline_sm, color: colors.on_surface },
  deliverableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: colors.surface_container_low,
    borderRadius: 8,
  },
  deliverableTitle: { ...typography.body_md, color: colors.on_surface },
  deliverableStatus: { ...typography.label_sm, color: colors.on_surface_variant },
});
