// Shared presentational pieces for the support & legal site.

export function Header() {
  return (
    <header className="sp-header">
      <div className="sp-header-inner">
        <a className="sp-brand" href="/help">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" />
          <span>volpair</span>
        </a>
        <nav className="sp-nav">
          <a href="/help">Help</a>
          <a href="/safety">Safety</a>
          <a href="/contact">Contact</a>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="sp-footer">
      <div className="sp-shell">
        <div className="sp-footer-cols">
          <div>
            <h4>Help</h4>
            <a href="/help/getting-started">Getting started</a>
            <a href="/help/account">Profile &amp; account</a>
            <a href="/help/matching">Matching &amp; discovery</a>
            <a href="/help/subscriptions">Subscriptions</a>
            <a href="/help/troubleshooting">Troubleshooting</a>
          </div>
          <div>
            <h4>Safety</h4>
            <a href="/safety">Safety Centre</a>
            <a href="/help/safety-reporting">Block &amp; report</a>
            <a href="/legal/community-guidelines">Community Guidelines</a>
          </div>
          <div>
            <h4>Legal</h4>
            <a href="/legal/terms">Terms of Service</a>
            <a href="/legal/privacy">Privacy Policy</a>
            <a href="/legal/cookies">Cookie Policy</a>
            <a href="/legal/subscription-terms">Subscription &amp; Refunds</a>
            <a href="/legal/complaints">Complaints</a>
          </div>
          <div>
            <h4>Contact</h4>
            <a href="mailto:support@volpair.com">support@volpair.com</a>
            <a href="/contact">Contact us</a>
          </div>
        </div>
        <p className="sp-footer-base">
          © {new Date().getFullYear()} volpair. volpair Ltd (UK). All rights reserved.
        </p>
      </div>
    </footer>
  );
}

// Wrapper for long-form legal pages.
export function LegalPage({ title, updated, children }) {
  return (
    <main className="sp-main">
      <div className="sp-shell">
        <a className="sp-back" href="/help">← Back to Help</a>
        <h1 className="sp-h1">{title}</h1>
        <p className="sp-updated">Last updated: {updated}</p>
        <div className="sp-note">
          This is a draft policy provided for transparency. If anything here is
          unclear, email <a href="mailto:support@volpair.com">support@volpair.com</a>.
        </div>
        <div className="sp-prose">{children}</div>
      </div>
    </main>
  );
}
