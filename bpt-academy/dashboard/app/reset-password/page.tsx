'use client';

import { useEffect, useState } from 'react';

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<'redirecting' | 'error'>('redirecting');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Supabase puts tokens in the URL fragment: #access_token=...&refresh_token=...&type=recovery
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken  = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type         = params.get('type');

    if (type === 'recovery' && accessToken && refreshToken) {
      // Deep link into the BPT Academy mobile app
      const fragment    = hash; // preserve full fragment
      const appLink     = `bptacademy://reset-password#${fragment}`;
      const expoLink    = `exp://bpt-academy.ngrok.app/--/reset-password#${fragment}`;

      // Attempt to open the production app immediately
      window.location.href = appLink;

      // After a short delay, if still on this page the app wasn't installed —
      // show manual fallback links
      setTimeout(() => {
        setStatus('error');
        setErrorMsg(
          `If the app didn't open automatically, tap one of the links below.`
        );
      }, 2500);
    } else {
      setStatus('error');
      setErrorMsg('This reset link is invalid or has expired. Please request a new one from the app.');
    }
  }, []);

  const hash = typeof window !== 'undefined' ? window.location.hash.substring(1) : '';
  const appLink  = `bptacademy://reset-password#${hash}`;
  const expoLink = `exp://bpt-academy.ngrok.app/--/reset-password#${hash}`;

  return (
    <div style={styles.root}>
      <div style={styles.box}>
        <div style={styles.logo}>BPT ACADEMY</div>
        <div style={styles.sub}>British Padel Academy</div>

        {status === 'redirecting' ? (
          <>
            <div style={styles.spinner} />
            <p style={styles.msg}>Opening the app…</p>
          </>
        ) : (
          <>
            <p style={styles.msg}>{errorMsg}</p>
            {hash.includes('type=recovery') && (
              <div style={styles.links}>
                <a href={appLink} style={styles.link}>
                  Open in BPT Academy app
                </a>
                <a href={expoLink} style={{ ...styles.link, ...styles.linkSecondary }}>
                  Open in Expo Go (testing)
                </a>
              </div>
            )}
          </>
        )}

        <p style={styles.hint}>
          Having trouble?{' '}
          <a href="mailto:hello@bptacademy.uk" style={styles.hintLink}>
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    margin: 0,
    padding: 0,
    background: '#0B1628',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  box: {
    textAlign: 'center',
    padding: '48px 32px',
    maxWidth: 420,
    width: '100%',
  },
  logo: {
    fontSize: 22,
    fontWeight: 800,
    color: '#F0F6FC',
    letterSpacing: 3,
    marginBottom: 6,
  },
  sub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 40,
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid rgba(255,255,255,0.1)',
    borderTop: '3px solid #3B82F6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto 24px',
  },
  msg: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 1.6,
    marginBottom: 24,
  },
  links: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginBottom: 32,
  },
  link: {
    display: 'block',
    background: '#3B82F6',
    color: '#FFFFFF',
    textDecoration: 'none',
    padding: '14px 24px',
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 15,
  },
  linkSecondary: {
    background: 'rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.6)',
  },
  hint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 16,
  },
  hintLink: {
    color: '#3B82F6',
  },
};
