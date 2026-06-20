export const metadata = { title: 'Contact us' };

export default function Contact() {
  return (
    <main className="sp-main">
      <div className="sp-shell">
        <a className="sp-back" href="/help">← Back to Help</a>
        <h1 className="sp-h1">Contact us</h1>
        <p className="sp-sub">
          We’re a small team and we read every message. Most queries are answered
          within 2–3 working days.
        </p>

        <div className="sp-contact-card">
          <h3 style={{ color: '#fff', marginBottom: 6 }}>📧 General &amp; account support</h3>
          <p style={{ color: 'rgba(255,255,255,0.78)', margin: 0 }}>
            <a href="mailto:support@volpair.com">support@volpair.com</a>
          </p>
        </div>

        <div className="sp-contact-card">
          <h3 style={{ color: '#fff', marginBottom: 6 }}>🛡️ Safety &amp; reporting</h3>
          <p style={{ color: 'rgba(255,255,255,0.78)', margin: 0 }}>
            To report a user, use the in-app report tool (their profile → “⋯” →
            Report). For urgent safety concerns, email{' '}
            <a href="mailto:support@volpair.com">support@volpair.com</a> with “SAFETY”
            in the subject. If you’re in immediate danger, contact your local
            emergency services.
          </p>
        </div>

        <div className="sp-contact-card">
          <h3 style={{ color: '#fff', marginBottom: 6 }}>🔒 Privacy &amp; data requests</h3>
          <p style={{ color: 'rgba(255,255,255,0.78)', margin: 0 }}>
            To access or delete your data, email{' '}
            <a href="mailto:support@volpair.com">support@volpair.com</a>. See our{' '}
            <a href="/legal/privacy">Privacy Policy</a> for your rights.
          </p>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13.5, marginTop: 24 }}>
          volpair is operated by volpair Ltd, a company registered in the United Kingdom.
        </p>
      </div>
    </main>
  );
}
