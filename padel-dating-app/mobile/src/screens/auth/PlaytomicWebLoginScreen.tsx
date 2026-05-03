import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, Linking, AppState, TextInput, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../lib/theme';

// Lazy-load native modules — not compiled into Expo Go
let WebView: any = null;
try { WebView = require('react-native-webview').WebView; } catch (_) {}

const PLAYTOMIC_URL = 'https://app.playtomic.io/login';
const PROFILE_URL = 'https://app.playtomic.io/app_tabs/profile';
const USER_AGENT =
  'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36';

// Domains that must open in the system browser
// Google, Apple AND Facebook all block OAuth inside WebViews
const EXTERNAL_DOMAINS = [
  'accounts.google.com',
  'appleid.apple.com',
  'facebook.com',
  'm.facebook.com',
  'www.facebook.com',
  'connect.facebook.net',
  'staticxx.facebook.com',
];

function shouldOpenExternally(url: string): boolean {
  try {
    const parsed = new URL(url);
    return EXTERNAL_DOMAINS.some(d => parsed.hostname.includes(d));
  } catch (_) {
    return false;
  }
}

function extractUserIdFromUrl(url: string): string | null {
  try {
    // Match ?user_id=123 or /users/123 patterns
    const qsMatch = url.match(/[?&]user_id=(\d+)/);
    if (qsMatch) return qsMatch[1];
    const pathMatch = url.match(/\/users\/(\d+)/);
    if (pathMatch) return pathMatch[1];
    return null;
  } catch (_) {
    return null;
  }
}

// Injected after page load — tries multiple strategies to find the Playtomic user ID:
// 1. URL query string / path
// 2. localStorage tokens
// 3. DOM (profile link href)
const DETECT_USER_JS = `
(function() {
  try {
    // Strategy 1: URL
    const url = window.location.href;
    const qsMatch = url.match(/[?&]user_id=(\\d+)/);
    const pathMatch = url.match(/\\/users\\/(\\d+)/);
    const userId = (qsMatch && qsMatch[1]) || (pathMatch && pathMatch[1]);
    if (userId) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'userId', userId }));
      return;
    }

    // Strategy 2: localStorage — Playtomic stores JWT after login
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      const val = localStorage.getItem(key);
      if (!val) continue;
      try {
        const parsed = JSON.parse(val);
        // Look for user_id or userId in any stored object
        const uid = parsed.user_id || parsed.userId || parsed.id;
        if (uid && String(uid).match(/^\\d+$/)) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'userId', userId: String(uid) }));
          return;
        }
        // Also try decoding JWT payload
        if (parsed.access_token || parsed.token) {
          const jwt = parsed.access_token || parsed.token;
          const parts = jwt.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            const jwtUid = payload.user_id || payload.sub || payload.userId;
            if (jwtUid) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'userId', userId: String(jwtUid) }));
              return;
            }
          }
        }
      } catch (_) {}
    }

    // Strategy 3: DOM — look for profile link containing user ID
    const profileLinks = document.querySelectorAll('a[href*="/users/"]');
    for (const link of profileLinks) {
      const href = link.getAttribute('href') || '';
      const m = href.match(/\\/users\\/(\\d+)/);
      if (m) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'userId', userId: m[1] }));
        return;
      }
    }

    // Not found — report current URL so we can debug
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'notFound', url: window.location.href }));
  } catch(e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', msg: String(e) }));
  }
  true;
})();
`;

export default function PlaytomicWebLoginScreen({ route, navigation }: any) {
  const { onSuccess } = route.params as { onSuccess: (userId: string) => void };
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [detected, setDetected] = useState(false);
  const [showReturnBanner, setShowReturnBanner] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualId, setManualId] = useState('');
  const [retrying, setRetrying] = useState(false);
  const didComplete = useRef(false);
  const webViewRef = useRef<any>(null);
  const openedExternalRef = useRef(false);

  // When app comes back to foreground after system browser OAuth, reload WebView
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && openedExternalRef.current && !didComplete.current) {
        // Small delay to let the browser finish closing
        setTimeout(() => {
          setShowReturnBanner(true);
        }, 500);
      }
    });
    return () => sub.remove();
  }, []);

  const handleSuccess = useCallback((userId: string) => {
    if (didComplete.current) return;
    didComplete.current = true;
    setDetected(true);
    onSuccess(userId);
    setTimeout(() => navigation.goBack(), 800);
  }, [onSuccess, navigation]);

  const handleNavChange = (navState: any) => {
    if (didComplete.current) return;
    const userId = extractUserIdFromUrl(navState.url ?? '');
    if (userId) handleSuccess(userId);
  };

  const handleMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'userId' && msg.userId) {
        handleSuccess(msg.userId);
      }
      // 'notFound' or 'error' — silently ignore, user can tap banner
    } catch (_) {}
  };

  // Tap "Logged in?" — navigate to profile page and inject detection script
  const handleReturnFromBrowser = () => {
    setRetrying(true);
    setLoading(true);
    // Navigate to Playtomic profile — if logged in, this will load with user context
    webViewRef.current?.injectJavaScript(
      `window.location.href = '${PROFILE_URL}'; true;`
    );
    // After navigation settles, run detection
    setTimeout(() => {
      webViewRef.current?.injectJavaScript(DETECT_USER_JS);
      setRetrying(false);
    }, 3000);
  };

  const handleShouldStartLoad = (request: any) => {
    const url: string = request.url ?? '';
    if (shouldOpenExternally(url)) {
      Linking.openURL(url).catch(() => {});
      openedExternalRef.current = true;
      // Show banner immediately — don't wait for AppState (race condition)
      setTimeout(() => setShowReturnBanner(true), 1000);
      return false;
    }
    return true;
  };

  const handleLoadEnd = () => {
    setLoading(false);
    // Run detection on every page load — catches cases where user is already logged in
    webViewRef.current?.injectJavaScript(DETECT_USER_JS);
  };

  const handleManualSubmit = () => {
    const clean = manualId.trim();
    if (!clean.match(/^\d+$/)) {
      Alert.alert('Invalid ID', 'Your Playtomic user ID should be a number (e.g. 123456).');
      return;
    }
    handleSuccess(clean);
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

      {/* Return banner — shown after external OAuth (Facebook/Google/Apple) */}
      {showReturnBanner && !detected && (
        <TouchableOpacity
          style={styles.returnBanner}
          onPress={handleReturnFromBrowser}
          activeOpacity={0.85}
        >
          {retrying
            ? <ActivityIndicator color={theme.bg} size="small" />
            : <Text style={styles.returnBannerText}>✅ Logged in on Facebook? Tap here to continue →</Text>
          }
        </TouchableOpacity>
      )}

      {/* Manual ID fallback — shown after 2 failed attempts */}
      {showManualEntry && !detected && (
        <View style={styles.manualEntry}>
          <Text style={styles.manualLabel}>Can't detect your account?</Text>
          <Text style={styles.manualSub}>
            Open Playtomic in Safari, go to your Profile, copy the number from the URL and paste it below.
          </Text>
          <View style={styles.manualRow}>
            <TextInput
              style={styles.manualInput}
              value={manualId}
              onChangeText={setManualId}
              placeholder="e.g. 123456"
              placeholderTextColor={theme.textDim}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={handleManualSubmit}
            />
            <TouchableOpacity style={styles.manualBtn} onPress={handleManualSubmit}>
              <Text style={styles.manualBtnText}>Go</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: PLAYTOMIC_URL }}
        userAgent={USER_AGENT}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={handleMessage}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={handleLoadEnd}
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
          <Text style={styles.detectedText}>Connected!</Text>
          <Text style={styles.detectedSub}>Importing your match history…</Text>
        </View>
      )}

      {/* Show manual entry option after banner has been shown a while */}
      {showReturnBanner && !detected && !showManualEntry && (
        <TouchableOpacity
          style={styles.manualEntryLink}
          onPress={() => setShowManualEntry(true)}
        >
          <Text style={styles.manualEntryLinkText}>Still not working? Enter ID manually</Text>
        </TouchableOpacity>
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
    paddingVertical: 14, paddingHorizontal: 20,
    alignItems: 'center', minHeight: 48, justifyContent: 'center',
  },
  returnBannerText: { color: '#0D1B2A', fontWeight: '800', fontSize: 14, textAlign: 'center' },

  manualEntry: {
    backgroundColor: theme.bgCard, padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border,
    gap: 8,
  },
  manualLabel: { fontSize: 14, fontWeight: '700', color: theme.textPrimary },
  manualSub: { fontSize: 12, color: theme.textMuted, lineHeight: 18 },
  manualRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4 },
  manualInput: {
    flex: 1, backgroundColor: theme.bgDeep, borderRadius: 10, borderWidth: 1,
    borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: theme.textPrimary,
  },
  manualBtn: {
    backgroundColor: theme.primary, borderRadius: 10,
    paddingHorizontal: 18, paddingVertical: 10,
  },
  manualBtnText: { color: theme.bg, fontWeight: '800', fontSize: 14 },

  manualEntryLink: {
    position: 'absolute', bottom: 16, alignSelf: 'center',
    backgroundColor: theme.bgCard, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: theme.border,
  },
  manualEntryLinkText: { fontSize: 13, color: theme.textMuted },

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
