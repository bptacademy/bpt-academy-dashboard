import { HELP_CATEGORIES } from './helpContent';

export const metadata = { title: 'Help Centre' };

export default function HelpHome() {
  return (
    <main className="sp-main">
      <div className="sp-shell">
        <h1 className="sp-h1">How can we help?</h1>
        <p className="sp-sub">
          Find answers about your account, matching, safety and subscriptions.
          Still stuck? <a href="/contact">Contact us</a>.
        </p>

        <div className="sp-grid">
          {HELP_CATEGORIES.map((c) => (
            <a key={c.slug} className="sp-card" href={`/help/${c.slug}`}>
              <div className="sp-card-emoji">{c.emoji}</div>
              <div className="sp-card-title">{c.title}</div>
              <div className="sp-card-desc">{c.desc}</div>
            </a>
          ))}
        </div>

        <h2 style={{ color: '#fff', fontSize: 19, fontWeight: 700, margin: '40px 0 14px' }}>
          Safety &amp; legal
        </h2>
        <div className="sp-grid">
          <a className="sp-card" href="/safety">
            <div className="sp-card-emoji">🛡️</div>
            <div className="sp-card-title">Safety Centre</div>
            <div className="sp-card-desc">Staying safe on and off the court.</div>
          </a>
          <a className="sp-card" href="/legal/community-guidelines">
            <div className="sp-card-emoji">📋</div>
            <div className="sp-card-title">Community Guidelines</div>
            <div className="sp-card-desc">The rules everyone agrees to follow.</div>
          </a>
          <a className="sp-card" href="/legal/privacy">
            <div className="sp-card-emoji">🔒</div>
            <div className="sp-card-title">Privacy Policy</div>
            <div className="sp-card-desc">How we handle your data.</div>
          </a>
          <a className="sp-card" href="/legal/terms">
            <div className="sp-card-emoji">📄</div>
            <div className="sp-card-title">Terms of Service</div>
            <div className="sp-card-desc">The agreement for using volpair.</div>
          </a>
        </div>
      </div>
    </main>
  );
}
