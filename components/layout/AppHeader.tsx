/**
 * Glass nav bar — Obsidian Flux design
 */

import { Image } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, typography } from '@/constants/theme';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
}

export function AppHeader({ title, subtitle, showLogo = true }: AppHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 12,
        },
      ]}
    >
      <View style={styles.left}>
        <View style={styles.avatar}>
          <Image
            source={{ uri: 'https://i.pravatar.cc/100' }}
            style={styles.avatarImage}
          />
        </View>
        <View>
          {subtitle && (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}
          {title && (
            <Text style={styles.title}>{title}</Text>
          )}
        </View>
      </View>
      <View style={styles.right}>
        <Text style={styles.logo}>Crezo</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: 'rgba(19, 19, 19, 0.6)',
    // @ts-expect-error - backdrop blur exists
    backdropFilter: 'blur(20px)',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(173, 198, 255, 0.2)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  subtitle: {
    ...typography.label_sm,
    color: colors.on_surface_variant,
  },
  title: {
    ...typography.headline_md,
    color: colors.on_surface,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 24,
    fontStyle: 'italic',
    letterSpacing: -0.5,
    color: colors.primary,
  },
});
