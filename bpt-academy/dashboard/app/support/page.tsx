export const metadata = {
  title: 'Support – BPT Academy',
  description: 'Get help with BPT Academy',
};

export default function SupportPage() {
  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      background: '#f9fafb',
      minHeight: '100vh',
      margin: 0,
      padding: 0,
    }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 4 }}>Support</h1>
        <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: 40 }}>
          BPT Academy — British Padel Training Academy
        </p>

        <div style={{
          background: '#fff', border: '1px solid #e5e7eb',
          borderRadius: 12, padding: 24, marginBottom: 16,
        }}>
          <span style={{
            display: 'inline-block', background: '#3B82F6', color: '#fff',
            fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px',
            borderRadius: 20, marginBottom: 16,
          }}>
            Contact Us
          </span>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 10px' }}>Email Support</h2>
          <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.7, margin: '0 0 10px' }}>
            For help with your account, app issues, or any questions, please contact us at:
          </p>
          <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.7, margin: '0 0 10px' }}>
            <a href="mailto:hello@bptacademy.uk" style={{ color: '#3B82F6', textDecoration: 'none' }}>
              hello@bptacademy.uk
            </a>
          </p>
          <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.7, margin: 0 }}>
            We aim to respond within 1 business day.
          </p>
        </div>

        <div style={{
          background: '#fff', border: '1px solid #e5e7eb',
          borderRadius: 12, padding: 24, marginBottom: 16,
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 10px' }}>Account Issues</h2>
          <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.7, margin: '0 0 10px' }}>
            If you are having trouble signing in or need to reset your password, use the{' '}
            <strong>Forgot Password</strong> option on the login screen of the app.
          </p>
          <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.7, margin: 0 }}>
            For account deletion requests, please use the <strong>Delete Account</strong> option
            in your Profile screen within the app.
          </p>
        </div>

        <div style={{
          background: '#fff', border: '1px solid #e5e7eb',
          borderRadius: 12, padding: 24, marginBottom: 16,
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 10px' }}>Technical Problems</h2>
          <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.7, margin: '0 0 10px' }}>
            If the app is not working as expected, try the following:
          </p>
          <ul style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.9, paddingLeft: 18, margin: '0 0 10px' }}>
            <li>Close and reopen the app</li>
            <li>Check your internet connection</li>
            <li>Update to the latest version from the App Store or Google Play</li>
          </ul>
          <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.7, margin: 0 }}>
            If the issue persists, email us at{' '}
            <a href="mailto:hello@bptacademy.uk" style={{ color: '#3B82F6', textDecoration: 'none' }}>
              hello@bptacademy.uk
            </a>{' '}
            with a description of the problem and your device type.
          </p>
        </div>

        <div style={{
          background: '#fff', border: '1px solid #e5e7eb',
          borderRadius: 12, padding: 24, marginBottom: 16,
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 10px' }}>Privacy &amp; Legal</h2>
          <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.7, margin: 0 }}>
            View our{' '}
            <a href="/privacy" style={{ color: '#3B82F6', textDecoration: 'none' }}>Privacy Policy</a>
            {' '}for information on how we handle your data.
          </p>
        </div>

        <footer style={{ textAlign: 'center', fontSize: '0.75rem', color: '#9ca3af', marginTop: 40 }}>
          © 2026 BPT Academy ·{' '}
          <a href="https://app.bptacademy.uk" style={{ color: '#9ca3af' }}>app.bptacademy.uk</a>
        </footer>
      </div>
    </div>
  );
}
