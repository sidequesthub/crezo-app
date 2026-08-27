import { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { SettingsScreen, Section } from '@/components/settings/SettingsScreen';
import { LabelledInput, SaveButton } from '@/components/settings/Fields';
import { getProfile, updateProfile, validators, type CreatorProfile } from '@/lib/profile';

export default function PaymentSettingsScreen() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [upi, setUpi] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [bankName, setBankName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProfile()
      .then((p: CreatorProfile | null) => {
        if (p) {
          setGstin(p.gst_number ?? '');
          setPan(p.pan_number ?? '');
          setUpi(p.upi_id ?? '');
          setAccountNumber(p.bank_account_number ?? '');
          setIfsc(p.bank_ifsc ?? '');
          setBankName(p.bank_name ?? '');
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load'))
      .finally(() => setLoaded(true));
  }, []);

  const errors = {
    gstin: validators.gstin(gstin),
    pan: validators.pan(pan),
    upi: validators.upi(upi),
    ifsc: validators.ifsc(ifsc),
  };

  async function save() {
    if (Object.values(errors).some(Boolean)) {
      setError('Fix the highlighted fields before saving.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        gst_number: gstin.trim().toUpperCase() || null,
        pan_number: pan.trim().toUpperCase() || null,
        upi_id: upi.trim() || null,
        bank_account_number: accountNumber.trim() || null,
        bank_ifsc: ifsc.trim().toUpperCase() || null,
        bank_name: bankName.trim() || null,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SettingsScreen
      title="Payment & GST"
      subtitle="These details go straight onto your invoices, so brands can pay you without asking twice."
      footer={<SaveButton label="Save details" onPress={save} saving={saving} />}
    >
      <Section label="Tax">
        <LabelledInput
          label="GSTIN"
          value={gstin}
          onChangeText={setGstin}
          placeholder="27ABCDE1234F1Z5"
          autoCapitalize="characters"
          error={errors.gstin}
          hint="Only needed once you cross the ₹20L turnover threshold."
        />
        <LabelledInput
          label="PAN"
          value={pan}
          onChangeText={setPan}
          placeholder="ABCDE1234F"
          autoCapitalize="characters"
          error={errors.pan}
          hint="Brands need this for TDS deduction."
        />
      </Section>

      <Section label="Getting paid">
        <LabelledInput
          label="UPI ID"
          value={upi}
          onChangeText={setUpi}
          placeholder="yourname@upi"
          autoCapitalize="none"
          error={errors.upi}
          hint="Most Indian brands pay by UPI or NEFT."
        />
        <LabelledInput
          label="Bank account number"
          value={accountNumber}
          onChangeText={setAccountNumber}
          placeholder="0000 0000 0000"
          keyboardType="number-pad"
        />
        <LabelledInput
          label="IFSC"
          value={ifsc}
          onChangeText={setIfsc}
          placeholder="HDFC0001234"
          autoCapitalize="characters"
          error={errors.ifsc}
        />
        <LabelledInput
          label="Bank name"
          value={bankName}
          onChangeText={setBankName}
          placeholder="HDFC Bank"
          autoCapitalize="words"
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
