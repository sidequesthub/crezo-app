import { Ionicons } from '@expo/vector-icons';
import { Image, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, typography } from '@/constants/theme';
import { useCreatorData } from '@/hooks/useCreatorData';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
}

export function AppHeader({ title, subtitle, showLogo = true }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const { creator } = useCreatorData();
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= 768;
  const avatarUrl = creator?.avatar_url;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: isWideWeb ? 24 : insets.top + 12,
        },
      ]}
    >
      <View style={styles.left}>
        <View style={styles.avatar}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons
                name="person"
                size={18}
                color={colors.on_surface_variant}
              />
            </View>
          )}
        </View>
        <View>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          {title && <Text style={styles.title}>{title}</Text>}
        </View>
      </View>
      {showLogo && !isWideWeb && (
        <View style={styles.right}>
          <Text style={styles.logo}>Crezo</Text>
        </View>
      )}
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
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface_container_high,
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
    letterSpacing: -1,
    color: colors.on_surface,
  },
});
