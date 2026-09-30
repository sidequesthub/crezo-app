import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
import { Type } from '@/constants/Typography';
import { invoiceHtml } from '@/lib/invoicePdf';
import type { Invoice } from '@/lib/invoices';
import type { CreatorProfile } from '@/lib/profile';

interface Props {
  visible: boolean;
  invoice: Invoice | null;
  creator: CreatorProfile | null;
  onClose: () => void;
  onShare: () => void;
  sharing?: boolean;
}

/**
 * Full-screen preview of the invoice.
 *
 * Renders the same HTML the PDF is generated from, so what's on screen is what
 * ends up in the file, with no separate preview layout to drift out of sync.
 *
 * Presented as an iOS page sheet: it starts below the status bar and can be
 * swiped down. The SafeAreaProvider inside the Modal matters: a Modal is its
 * own native root, and without it every inset reads 0, which put the close
 * button under the status bar where it couldn't be tapped.
 */
export function InvoicePreview({ visible, invoice, creator, onClose, onShare, sharing }: Props) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // Each opening starts fresh; otherwise a failed load stays failed.
  useEffect(() => {
    if (visible) {
      setLoading(true);
      setFailed(false);
    }
  }, [visible]);

  if (!invoice || !creator) return null;

  const number = invoice.invoice_number
    ? `INV-${String(invoice.invoice_number).padStart(4, '0')}`
    : 'Draft';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="Close preview"
          >
            <Ionicons name="close" size={22} color={Colors.onSurface} />
          </Pressable>
          <View style={styles.headerBody}>
            <Text style={styles.title}>{number}</Text>
            <Text style={styles.subtitle}>Preview</Text>
          </View>
          <View style={styles.iconButton} />
        </View>

        <View style={styles.sheet}>
          <WebView
            originWhitelist={['*']}
            source={{ html: invoiceHtml(invoice, creator) }}
            style={styles.webview}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setFailed(true);
            }}
            // The invoice is a fixed-width document; let it scale to fit.
            scalesPageToFit
            showsVerticalScrollIndicator={false}
          />
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          )}
          {failed && (
            <View style={styles.loadingOverlay}>
              <Text style={styles.failedText}>
                The preview couldn't load. You can still share the PDF.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Pressable
            onPress={onShare}
            disabled={sharing}
            style={({ pressed }) => [styles.share, pressed && { opacity: 0.85 }]}
          >
            <LinearGradient
              colors={[Colors.action, Colors.actionDim]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.shareBg}
            >
              {sharing ? (
                <ActivityIndicator color={Colors.onAction} />
              ) : (
                <>
                  <Ionicons name="share-outline" size={18} color={Colors.onAction} />
                  <Text style={styles.shareText}>Share as PDF</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
  },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerBody: { flex: 1, alignItems: 'center' },
  title: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: Colors.onSurface },
  subtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },

  // The paper sits on the dark app background, like a document on a desk.
  sheet: {
    flex: 1,
    marginHorizontal: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  webview: { flex: 1, backgroundColor: '#ffffff' },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },

  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  share: { borderRadius: 16, overflow: 'hidden' },
  shareBg: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  shareText: { ...Type.button, color: Colors.onAction },
  failedText: { ...Type.bodySmall, color: '#5f5f5f', textAlign: 'center', paddingHorizontal: 24 },
});
