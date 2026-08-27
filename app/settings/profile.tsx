import { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { SettingsScreen, Section } from '@/components/settings/SettingsScreen';
import { LabelledInput, SaveButton } from '@/components/settings/Fields';
import { getProfile, updateProfile, type CreatorProfile } from '@/lib/profile';

export default function EditProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [niche, setNiche] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProfile()
      .then((p) => {
        if (!p) return;
        setProfile(p);
        setName(p.name ?? '');
        setBio(p.bio ?? '');
        setNiche(p.niche ?? '');
        setEmail(p.email ?? '');
        setAddress(p.address ?? '');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load'));
  }, []);

  async function save() {
    if (!name.trim()) {
      setError('Your name can’t be empty.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        name: name.trim(),
        bio: bio.trim() || null,
        niche: niche.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
      setSaving(false);
    }
  }

  if (!profile && !error) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SettingsScreen
      title="Edit profile"
      subtitle="This is what brands see on your media kit and invoices."
      footer={<SaveButton label="Save changes" onPress={save} saving={saving} />}
    >
      <Section>
        <LabelledInput
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          autoCapitalize="words"
        />
        <LabelledInput
          label="Niche"
          value={niche}
          onChangeText={setNiche}
          placeholder="e.g. Fashion & lifestyle"
          hint="Helps brands understand your category at a glance."
        />
        <LabelledInput
          label="Bio"
          value={bio}
          onChangeText={setBio}
          placeholder="A line or two about what you make"
          multiline
        />
        <LabelledInput
          label="Billing address"
          value={address}
          onChangeText={setAddress}
          placeholder={'Street\nCity, State  PIN'}
          multiline
          hint="Appears on your invoices."
        />
        <LabelledInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          hint="Used on invoices. You sign in with your phone number."
        />
        <LabelledInput
          label="Phone"
          value={profile?.phone ?? 'Not set'}
          editable={false}
          hint="This is your sign-in identity and can’t be changed here."
        />
      </Section>

      {error && <Text style={styles.error}>{error}</Text>}
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  error: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
  },
});
