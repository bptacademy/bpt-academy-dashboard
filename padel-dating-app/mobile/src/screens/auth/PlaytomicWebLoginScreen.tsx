import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, Linking, AppState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../lib/theme';

// Lazy-load native modules — not compiled into Expo Go
let WebView: any = null;
try { WebView = require('react-native-webview').WebView; } catch (_) {}

const PLAYTOMIC_URL = 'https://app.playtomic.io/login';
const PROFILE_CHECK_URL = 'https://app.playtomic.io/app_tabs/profile';
const USER_AGENT =
  'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36';

// Domains that must open in the system browser (Google blocks WebView OAuth)
const EXTERNAL_DOMAINS = [
  'accounts.google.com',
  'appleid.apple.com',
];

function shouldOpenExternally(url: string): boolean {
  try {
    const parsed = new URL(url);
    return EXTERNAL_DOMAINS.some(d => parsed.hostname.includes(d));
  } catch (_) {
    return false;
  }
}

function extractUserId(url: string): string | null {
  try {
    const match = url.match(/[?&]user_id=(\d+)/);
    return match ? match[1] : null;
  } catch (_) {
    return null;
  }
}

// Injected after page load — reads user_id from Playtomic's page if already logged in
const CHECK_USER_ID_JS = `
(function() {
  try {
    const url = window.location.href;
    const match = url.match(/[?&]user_id=(\\d+)/);
    if (match) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'userId', userId: match[1] }));
    }
  } catch(e) {}
  true;
})();
`;

export default function PlaytomicWebLoginScreen({ route, navigation }: any) {
  const { onSuccess } = route.params as { onSuccess: (userId: string) => void };
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [detected, setDetected] = useState(false);
  const [showReturnBanner, setShowReturnBanner] = useState(false);
  const didComplete = useRef(false);
  const webViewRef = useRef<any>(null);
  const openedExternalRef = useRef(false);

  const handleSuccess = useCallback((userId: string) => {
    if (didComplete.current) return;
    didComplete.current = true;
    setDetected(true);
    onSuccess(userId);
    setTimeout(() => navigation.goBack(), 800);
  }, [onSuccess, navigation]);

  const handleNavChange = (navState: any) => {
    if (didComplete.current) return;
    const userId = extractUserId(navState.url ?? '');
    if (userId) handleSuccess(userId);
  };

  const handleMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'userId' && msg.userId) {
        handleSuccess(msg.userId);
      }
    } catch (_) {}
  };

  // When user comes back from system browser, reload the WebView to pick up the session
  const handleReturnFromBrowser = () => {
    setShowReturnBanner(false);
    setLoading(true);
    webViewRef.current?.injectJavaScript(`window.location.href = '${PROFILE_CHECK_URL}'; true;`);
  };

  const handleShouldStartLoad = (request: any) => {
    const url: string = request.url ?? '';
    if (shouldOpenExternally(url)) {
      Linking.openURL(url).catch(() => {});
      openedExternalRef.current = true;
      // Show "I've logged in" banner so user can come back
      setTimeout(() => setShowReturnBanner(true), 1500);
      return false;
    }
    return true;
  };

  if (!WebView) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Connect Playtomic</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.center}>
          <Text style={styles.unavailableIcon}>🔧</Text>
          <Text style={styles.unavailableTitle}>Requires a dev build</Text>
          <Text style={styles.unavailableText}>
            This feature uses native modules not included in Expo Go.{'\n'}
            Build the app with EAS to use Playtomic web login.
          </Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>← Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Connect Playtomic</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Banner shown after returning from Google/Apple in system browser */}
      {showReturnBanner && (
        <TouchableOpacity style={styles.returnBanner} onPress={handleReturnFromBrowser}>
          <Text style={styles.returnBannerText}>✅ Logged in? Tap here to continue →</Text>
        </TouchableOpacity>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: PLAYTOMIC_URL }}
        userAgent={USER_AGENT}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        style={styles.webview}
        javaScriptEnabled={true}
        injectedJavaScript={CHECK_USER_ID_JS}
        onMessage={handleMessage}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={handleNavChange}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      )}

      {detected && (
        <View style={styles.detectedOverlay}>
          <Text style={styles.detectedIcon}>✅</Text>
          <Text style={styles.detectedText}>Detected login!</Text>
          <Text style={styles.detectedSub}>Importing your data…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: theme.bg, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.bgCard, alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: theme.textSecondary, fontSize: 16, fontWeight: '700' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
  headerRight: { width: 36 },
  returnBanner: {
    backgroundColor: theme.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  returnBannerText: { color: '#0D1B2A', fontWeight: '800', fontSize: 14 },
  webview: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center',
  },
  detectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13,27,42,0.95)',
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  detectedIcon: { fontSize: 56 },
  detectedText: { fontSize: 22, fontWeight: '800', color: theme.textPrimary },
  detectedSub: { fontSize: 15, color: theme.primary },
  unavailableIcon: { fontSize: 48 },
  unavailableTitle: { fontSize: 20, fontWeight: '800', color: theme.textPrimary, textAlign: 'center' },
  unavailableText: { fontSize: 14, color: theme.textMuted, textAlign: 'center', lineHeight: 22 },
  backBtn: {
    marginTop: 8, backgroundColor: theme.bgCard, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12, borderWidth: 1, borderColor: theme.border,
  },
  backBtnText: { color: theme.primary, fontWeight: '700', fontSize: 15 },
});
