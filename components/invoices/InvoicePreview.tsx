import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/Colors';
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
 * ends up in the file — no separate preview layout to drift out of sync.
 */
export function InvoicePreview({ visible, invoice, creator, onClose, onShare, sharing }: Props) {
  const [loading, setLoading] = useState(true);

  if (!invoice || !creator) return null;

  const number = invoice.invoice_number
    ? `INV-${String(invoice.invoice_number).padStart(4, '0')}`
    : 'Draft';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.iconButton}>
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
            // The invoice is a fixed-width document; let it scale to fit.
            scalesPageToFit
            showsVerticalScrollIndicator={false}
          />
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Pressable
            onPress={onShare}
            disabled={sharing}
            style={({ pressed }) => [styles.shareButton, pressed && { opacity: 0.85 }]}
          >
            {sharing ? (
              <ActivityIndicator color={Colors.onPrimaryContainer} />
            ) : (
              <>
                <Ionicons name="share-outline" size={18} color={Colors.onPrimaryContainer} />
                <Text style={styles.shareText}>Share as PDF</Text>
              </>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
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
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },

  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  shareText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: Colors.onPrimaryContainer,
  },
});
