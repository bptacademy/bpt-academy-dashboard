'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Stage = 'loading' | 'form' | 'success' | 'invalid';

export default function ResetPasswordPage() {
  const [stage, setStage]       = useState<Stage>('loading');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    // Supabase puts the tokens in the URL fragment after redirecting here:
    // https://app.bptacademy.uk/reset-password#access_token=...&type=recovery
    const hash   = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken  = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type         = params.get('type');

    if (type === 'recovery' && accessToken && refreshToken) {
      // Establish the recovery session so we can call updateUser
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) {
            setStage('invalid');
          } else {
            setStage('form');
          }
        });
    } else {
      setStage('invalid');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setStage('success');
    }
  };

  return (
    <div style={s.root}>
      <div style={s.card}>
        <div style={s.logo}>BPT ACADEMY</div>
        <div style={s.sub}>British Padel Academy</div>

        {stage === 'loading' && (
          <p style={s.msg}>Verifying your link…</p>
        )}

        {stage === 'invalid' && (
          <>
            <div style={s.iconWrap}>❌</div>
            <h2 style={s.heading}>Link expired</h2>
            <p style={s.msg}>
              This password reset link is invalid or has expired.
              <br />Please request a new one from the app.
            </p>
          </>
        )}

        {stage === 'form' && (
          <>
            <div style={s.iconWrap}>🔒</div>
            <h2 style={s.heading}>Choose a new password</h2>
            <p style={s.msg}>Enter your new password below.</p>
            <form onSubmit={handleSubmit} style={s.form}>
              <label style={s.label}>New Password</label>
              <input
                type="password"
                style={s.input}
                placeholder="Minimum 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                required
              />
              <label style={s.label}>Confirm Password</label>
              <input
                type="password"
                style={s.input}
                placeholder="Repeat your new password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
              />
              {error && <p style={s.error}>{error}</p>}
              <button type="submit" style={s.btn} disabled={loading}>
                {loading ? 'Saving…' : 'Save New Password'}
              </button>
            </form>
          </>
        )}

        {stage === 'success' && (
          <>
            <div style={s.iconWrap}>✅</div>
            <h2 style={s.heading}>Password updated!</h2>
            <p style={s.msg}>
              Your password has been changed successfully.
              <br />You can now log in to the BPT Academy app with your new password.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0B1628',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    padding: '24px 16px',
  },
  card: {
    background: 'rgba(17,30,51,0.90)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 20,
    padding: '40px 32px',
    width: '100%',
    maxWidth: 420,
    textAlign: 'center',
  },
  logo: {
    fontSize: 20,
    fontWeight: 800,
    color: '#F0F6FC',
    letterSpacing: 3,
    marginBottom: 4,
  },
  sub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 3,
    textTransform: 'uppercase' as const,
    marginBottom: 32,
  },
  iconWrap: {
    fontSize: 44,
    marginBottom: 12,
  },
  heading: {
    fontSize: 22,
    fontWeight: 800,
    color: '#F0F6FC',
    margin: '0 0 8px',
  },
  msg: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 1.6,
    margin: '0 0 24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 0,
    textAlign: 'left' as const,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#F0F6FC',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    width: '100%',
    padding: '13px 14px',
    fontSize: 15,
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 10,
    color: '#F0F6FC',
    marginBottom: 16,
    boxSizing: 'border-box' as const,
    outline: 'none',
  },
  error: {
    color: '#F87171',
    fontSize: 13,
    margin: '0 0 12px',
  },
  btn: {
    width: '100%',
    padding: '14px',
    background: '#3B82F6',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 4,
  },
};
