import { useEffect, useState } from 'react';
import { Text, StyleSheet, Linking, Alert, ActivityIndicator, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '@/constants/Colors';
import { SettingsScreen, Section } from '@/components/settings/SettingsScreen';
import { ActionRow } from '@/components/settings/Fields';
import { getFeedLinks, resetFeedLinks, type FeedLinks } from '@/lib/calendarFeed';

export default function CalendarSyncScreen() {
  const [feed, setFeed] = useState<FeedLinks | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getFeedLinks().then(setFeed).catch(() => setFailed(true));
  }, []);

  async function open(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Couldn’t open that', 'Copy the link instead and add it to your calendar.');
    }
  }

  async function copy() {
    if (!feed) return;
    await Clipboard.setStringAsync(feed.https);
    Alert.alert('Link copied', 'Add it to any calendar app as a subscription.');
  }

  function reset() {
    Alert.alert(
      'Reset calendar link?',
      'Calendars using the current link will stop updating. You’ll need to add the new one again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () =>
            resetFeedLinks()
              .then(setFeed)
              .catch(() => Alert.alert('Couldn’t reset', 'Try again in a moment.')),
        },
      ],
    );
  }

  return (
    <SettingsScreen
      title="Calendar sync"
      subtitle="See your content plan and deadlines next to everything else in your calendar."
    >
      {!feed && !failed && (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      )}
      {failed && <Text style={styles.note}>Couldn’t load your calendar link. Check your connection and try again.</Text>}

      {feed && (
        <>
          <Section label="Add to">
            <ActionRow
              icon="logo-google"
              label="Google Calendar"
              description="Opens Google Calendar to subscribe"
              onPress={() => open(feed.google)}
            />
            <ActionRow
              icon="calendar-outline"
              label="Apple Calendar"
              description="Adds it to the Calendar app on this phone"
              onPress={() => open(feed.webcal)}
            />
            <ActionRow
              icon="copy-outline"
              label="Copy link"
              description="For Outlook or any other calendar"
              onPress={copy}
            />
          </Section>

          {/* Set expectations: subscribed calendars refresh on the calendar
              app's schedule, not ours — Google's can lag by hours. */}
          <Text style={styles.note}>
            Your calendar shows what’s planned in Crezo. Changes can take a few hours to appear in
            Google Calendar; Apple Calendar is usually quicker.
          </Text>

          <Section label="Privacy">
            <ActionRow
              icon="refresh-outline"
              label="Reset link"
              description="Stops anyone with the old link from seeing your plan"
              tint={Colors.error}
              onPress={reset}
            />
          </Section>
        </>
      )}
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 32, alignItems: 'center' },
  note: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 19,
    color: Colors.onSurfaceVariant,
    paddingHorizontal: 4,
    marginTop: -4,
    marginBottom: 8,
  },
});
