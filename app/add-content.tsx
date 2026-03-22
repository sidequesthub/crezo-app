import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { colors, typography } from '@/constants/theme';

export default function AddContentScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Content Slot</Text>
      <Text style={styles.placeholder}>Form coming soon — connect API</Text>
      <Button title="Cancel" onPress={() => router.back()} variant="tertiary" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: colors.surface, gap: 16 },
  title: { ...typography.headline_lg, color: colors.on_surface },
  placeholder: { ...typography.body_md, color: colors.on_surface_variant },
});
