import { View, Text, StyleSheet, Linking, Alert } from 'react-native';
import Constants from 'expo-constants';
import { Colors } from '@/constants/Colors';
import { SettingsScreen, Section } from '@/components/settings/SettingsScreen';
import { ActionRow, InfoRow } from '@/components/settings/Fields';

const SUPPORT_EMAIL = 'hello@crezo.studio';
const SUPPORT_WHATSAPP = '917871468369';

export default function SupportScreen() {
  async function open(url: string, fallback: string) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error('unsupported');
      await Linking.openURL(url);
    } catch {
      Alert.alert('Couldn’t open that', fallback);
    }
  }

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const runtime = Constants.expoConfig?.sdkVersion ?? 'unknown';

  return (
    <SettingsScreen
      title="Help & support"
      subtitle="Something broken, or an idea for what Crezo should do next?"
    >
      <Section label="Get in touch">
        <ActionRow
          icon="logo-whatsapp"
          label="WhatsApp us"
          description="Usually the fastest way to reach a human."
          onPress={() =>
            open(
              `whatsapp://send?phone=${SUPPORT_WHATSAPP}`,
              `Message ${SUPPORT_WHATSAPP} on WhatsApp.`,
            )
          }
        />
        <ActionRow
          icon="mail-outline"
          label="Email support"
          description={SUPPORT_EMAIL}
          onPress={() =>
            open(
              `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Crezo support')}`,
              `Write to ${SUPPORT_EMAIL}.`,
            )
          }
        />
        <ActionRow
          icon="bug-outline"
          label="Report a bug"
          description="Tell us what you were doing when it broke."
          onPress={() =>
            open(
              `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
                `Bug report — Crezo ${version}`,
              )}&body=${encodeURIComponent(
                `\n\n---\nApp version: ${version}\nExpo SDK: ${runtime}\n`,
              )}`,
              `Write to ${SUPPORT_EMAIL}.`,
            )
          }
        />
      </Section>

      <Section label="About">
        <InfoRow icon="phone-portrait-outline" label="App version" value={version} />
        <InfoRow icon="layers-outline" label="Expo SDK" value={runtime} />
        <ActionRow
          icon="globe-outline"
          label="crezo.studio"
          onPress={() => open('https://crezo.studio', 'Visit crezo.studio in your browser.')}
        />
      </Section>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Built for Indian creators. Rupees, GST, and UPI — not an afterthought.
        </Text>
      </View>
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  footer: { paddingVertical: 12, alignItems: 'center' },
  footerText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: 'rgba(193, 198, 215, 0.45)',
    textAlign: 'center',
    lineHeight: 18,
  },
});
