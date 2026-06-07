import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, Linking, AppState, TextInput, Alert, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, fonts } from '../../lib/theme';

// Lazy-load native modules — not compiled into Expo Go
let WebView: any = null;
try { WebView = require('react-native-webview').WebView; } catch (_) {}

const PLAYTOMIC_URL = 'https://app.playtomic.io/login';
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
    const qsMatch = url.match(/[?&]user_id=(\d+)/);
    if (qsMatch) return qsMatch[1];
    const pathMatch = url.match(/\/users\/(\d+)/);
    if (pathMatch) return pathMatch[1];
    return null;
  } catch (_) {
    return null;
  }
}

// Injected on every page load — scans URL + localStorage + DOM
const DETECT_USER_JS = `
(function() {
  try {
    const url = window.location.href;
    const qsMatch = url.match(/[?&]user_id=(\\d+)/);
    const pathMatch = url.match(/\\/users\\/(\\d+)/);
    const userId = (qsMatch && qsMatch[1]) || (pathMatch && pathMatch[1]);
    if (userId) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'userId', userId }));
      return;
    }
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      const val = localStorage.getItem(key);
      if (!val) continue;
      try {
        const parsed = JSON.parse(val);
        const uid = parsed.user_id || parsed.userId || parsed.id;
        if (uid && String(uid).match(/^\\d+$/)) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'userId', userId: String(uid) }));
          return;
        }
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
    const profileLinks = document.querySelectorAll('a[href*="/users/"]');
    for (const link of profileLinks) {
      const href = link.getAttribute('href') || '';
      const m = href.match(/\\/users\\/(\\d+)/);
      if (m) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'userId', userId: m[1] }));
        return;
      }
    }
  } catch(e) {}
  true;
})();
`;

// ─── Manual entry screen ──────────────────────────────────────────────────────
// Shown after returning from Facebook/Google/Apple in system browser.
// WebView cookies ≠ system browser cookies — cross-sandbox session is impossible.
// The cleanest UX: guide the user to find their Playtomic ID themselves.

function ManualEntryScreen({
  onSuccess, onBack,
}: { onSuccess: (userId: string) => void; onBack: () => void }) {
  const [step, setStep] = useState<'intro' | 'lookup' | 'enter'>('intro');
  const [userId, setUserId] = useState('');
  const [checking, setChecking] = useState(false);

  const handleVerifyAndSubmit = async () => {
    const clean = userId.trim();
    if (!clean.match(/^\d+$/)) {
      Alert.alert('Invalid ID', 'Your Playtomic user ID should be a number only (e.g. 123456).');
      return;
    }
    setChecking(true);
    try {
      // Verify the ID exists by hitting Playtomic's public profile endpoint
      const res = await fetch(`https://api.playtomic.io/v1/players/${clean}`, {
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        const name = data?.full_name || data?.name || `Player ${clean}`;
        Alert.alert(
          'Is this you?',
          `We found: ${name}\n\nPlaytomic ID: ${clean}`,
          [
            { text: 'No, try again', style: 'cancel', onPress: () => setChecking(false) },
            { text: 'Yes, that\'s me', onPress: () => onSuccess(clean) },
          ]
        );
      } else {
        // ID not found — submit anyway (Playtomic API may block without auth)
        onSuccess(clean);
      }
    } catch (_) {
      // Network error — submit optimistically
      onSuccess(clean);
    } finally {
      setChecking(false);
    }
  };

  return (
    <ScrollView
      style={styles.manualScreen}
      contentContainerStyle={styles.manualScreenContent}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity style={styles.manualBackBtn} onPress={onBack}>
        <Text style={styles.manualBackText}>← Back to login page</Text>
      </TouchableOpacity>

      {step === 'intro' && (
        <>
          <Text style={styles.manualIcon}>🔐</Text>
          <Text style={styles.manualTitle}>One more step</Text>
          <Text style={styles.manualBody}>
            You logged in with Facebook (or Google/Apple) in your browser. Because of how mobile security works, we need to link that account manually — it only takes 30 seconds.
          </Text>
          <Text style={styles.manualBody}>
            We just need your <Text style={{ color: theme.primary, fontFamily: fonts.bodyBold }}>Playtomic user ID</Text> — a number you can find in the app or website.
          </Text>

          <TouchableOpacity style={styles.manualPrimaryBtn} onPress={() => setStep('lookup')}>
            <Text style={styles.manualPrimaryBtnText}>Show me how to find it →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.manualSecondaryBtn} onPress={() => setStep('enter')}>
            <Text style={styles.manualSecondaryBtnText}>I already know my ID</Text>
          </TouchableOpacity>
        </>
      )}

      {step === 'lookup' && (
        <>
          <Text style={styles.manualTitle}>Find your Playtomic ID</Text>

          <View style={styles.stepBox}>
            <Text style={styles.stepNum}>1</Text>
            <Text style={styles.stepText}>Open <Text style={{ color: theme.primary, fontFamily: fonts.bodyBold }}>Playtomic</Text> in Safari or your browser</Text>
          </View>
          <View style={styles.stepBox}>
            <Text style={styles.stepNum}>2</Text>
            <Text style={styles.stepText}>Tap your profile photo → go to your profile page</Text>
          </View>
          <View style={styles.stepBox}>
            <Text style={styles.stepNum}>3</Text>
            <Text style={styles.stepText}>Look at the URL — it will contain a number like:{'\n'}<Text style={styles.urlExample}>playtomic.io/users/<Text style={{ color: theme.primary }}>123456</Text></Text></Text>
          </View>
          <View style={styles.stepBox}>
            <Text style={styles.stepNum}>4</Text>
            <Text style={styles.stepText}>Copy that number and come back here</Text>
          </View>

          <TouchableOpacity
            style={styles.manualPrimaryBtn}
            onPress={() => Linking.openURL('https://app.playtomic.io')}
          >
            <Text style={styles.manualPrimaryBtnText}>Open Playtomic →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.manualPrimaryBtn, { marginTop: 8, backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.primaryBorder }]} onPress={() => setStep('enter')}>
            <Text style={[styles.manualPrimaryBtnText, { color: theme.primary }]}>I have the number →</Text>
          </TouchableOpacity>
        </>
      )}

      {step === 'enter' && (
        <>
          <Text style={styles.manualTitle}>Enter your Playtomic ID</Text>
          <Text style={styles.manualBody}>
            Paste the number from your Playtomic profile URL.
          </Text>
          <TextInput
            style={styles.manualInput}
            value={userId}
            onChangeText={setUserId}
            placeholder="e.g. 123456"
            placeholderTextColor={theme.textDim}
            keyboardType="numeric"
            returnKeyType="done"
            onSubmitEditing={handleVerifyAndSubmit}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.manualPrimaryBtn, (!userId.trim() || checking) && { opacity: 0.5 }]}
            onPress={handleVerifyAndSubmit}
            disabled={!userId.trim() || checking}
          >
            {checking
              ? <ActivityIndicator color={theme.bg} size="small" />
              : <Text style={styles.manualPrimaryBtnText}>Connect account</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: 16 }} onPress={() => setStep('lookup')}>
            <Text style={styles.manualSecondaryBtnText}>← How do I find my ID?</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PlaytomicWebLoginScreen({ route, navigation }: any) {
  const { onSuccess } = route.params as { onSuccess: (userId: string) => void };
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [detected, setDetected] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const didComplete = useRef(false);
  const webViewRef = useRef<any>(null);
  const openedExternalRef = useRef(false);

  // When app returns to foreground after system browser, show manual flow
  // (cross-sandbox: WebView cookies ≠ system browser — can't detect session)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && openedExternalRef.current && !didComplete.current) {
        setTimeout(() => setShowManual(true), 600);
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
      if (msg.type === 'userId' && msg.userId) handleSuccess(msg.userId);
    } catch (_) {}
  };

  const handleShouldStartLoad = (request: any) => {
    const url: string = request.url ?? '';
    if (shouldOpenExternally(url)) {
      Linking.openURL(url).catch(() => {});
      openedExternalRef.current = true;
      return false;
    }
    return true;
  };

  const handleLoadEnd = () => {
    setLoading(false);
    webViewRef.current?.injectJavaScript(DETECT_USER_JS);
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

      {/* Manual flow — shown after returning from social OAuth in system browser */}
      {showManual && !detected ? (
        <ManualEntryScreen
          onSuccess={handleSuccess}
          onBack={() => setShowManual(false)}
        />
      ) : (
        <>
          <WebView
            ref={webViewRef}
            source={{ uri: PLAYTOMIC_URL }}
            userAgent={USER_AGENT}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            domStorageEnabled={true}
            style={styles.webview}
            javaScriptEnabled={true}
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
        </>
      )}

      {detected && (
        <View style={styles.detectedOverlay}>
          <Text style={styles.detectedIcon}>✅</Text>
          <Text style={styles.detectedText}>Connected!</Text>
          <Text style={styles.detectedSub}>Importing your match history…</Text>
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
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.bgCard, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: theme.textSecondary, fontSize: 16, fontFamily: fonts.bodyBold },
  headerTitle: { fontSize: 16, fontFamily: fonts.bodyBold, color: theme.textPrimary },
  headerRight: { width: 36 },
  webview: { flex: 1 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' },
  detectedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13,27,42,0.95)', alignItems: 'center', justifyContent: 'center', gap: 12 },
  detectedIcon: { fontSize: 56 },
  detectedText: { fontSize: 22, fontFamily: fonts.headlineBold, color: theme.textPrimary },
  detectedSub: { fontSize: 15, color: theme.primary, fontFamily: fonts.bodyLight },
  unavailableIcon: { fontSize: 48 },
  unavailableTitle: { fontSize: 20, fontFamily: fonts.headlineBold, color: theme.textPrimary, textAlign: 'center' },
  unavailableText: { fontSize: 14, color: theme.textMuted, textAlign: 'center', lineHeight: 22, fontFamily: fonts.bodyLight },
  backBtn: { marginTop: 8, backgroundColor: theme.bgCard, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, borderWidth: 1, borderColor: theme.border },
  backBtnText: { color: theme.primary, fontFamily: fonts.bodyBold, fontSize: 15 },

  // ── Manual entry screen ──
  manualScreen: { flex: 1, backgroundColor: theme.bg },
  manualScreenContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40, gap: 16 },
  manualBackBtn: { paddingVertical: 12 },
  manualBackText: { color: theme.textSecondary, fontSize: 14, fontFamily: fonts.bodyLight },
  manualIcon: { fontSize: 52, textAlign: 'center', marginBottom: 4 },
  manualTitle: { fontSize: 24, fontFamily: fonts.headlineBold, color: theme.textPrimary },
  manualBody: { fontSize: 14, color: theme.textSecondary, lineHeight: 22, fontFamily: fonts.bodyLight },
  stepBox: {
    flexDirection: 'row', gap: 14, alignItems: 'flex-start',
    backgroundColor: theme.bgCard, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: theme.border,
  },
  stepNum: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: theme.primaryDim, borderWidth: 1, borderColor: theme.primaryBorder,
    textAlign: 'center', lineHeight: 26,
    fontSize: 13, fontFamily: fonts.headlineBold, color: theme.primary,
  },
  stepText: { flex: 1, fontSize: 14, color: theme.textSecondary, lineHeight: 20, fontFamily: fonts.bodyLight },
  urlExample: { fontSize: 13, color: theme.textMuted, fontFamily: 'monospace' },
  manualInput: {
    backgroundColor: theme.bgCard, borderRadius: 14, borderWidth: 1, borderColor: theme.border,
    paddingHorizontal: 18, paddingVertical: 14,
    fontSize: 20, color: theme.textPrimary, fontFamily: fonts.bodyBold, letterSpacing: 2,
  },
  manualPrimaryBtn: {
    backgroundColor: theme.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  manualPrimaryBtnText: { color: '#05020E', fontSize: 15, fontFamily: fonts.headlineBold },
  manualSecondaryBtn: { alignItems: 'center', paddingVertical: 8 },
  manualSecondaryBtnText: { color: theme.textMuted, fontSize: 14, fontFamily: fonts.bodyLight },
});
