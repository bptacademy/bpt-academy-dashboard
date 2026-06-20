export const metadata = { title: 'Safety Centre' };

export default function Safety() {
  return (
    <main className="sp-main">
      <div className="sp-shell">
        <a className="sp-back" href="/help">← Back to Help</a>
        <h1 className="sp-h1">Safety Centre</h1>
        <p className="sp-sub">
          volpair is built around meeting up to play padel. A few simple habits
          keep it fun and safe — on and off the court.
        </p>

        <div className="sp-prose">
          <h2>Before you meet</h2>
          <ul>
            <li><strong>Meet in public.</strong> The padel club or a busy café is ideal for a first meet.</li>
            <li><strong>Tell a friend.</strong> Share who you’re meeting, where, and when.</li>
            <li><strong>Sort your own transport.</strong> Arrive and leave independently.</li>
            <li><strong>Take your time.</strong> Get to know someone through chat before meeting — there’s no rush.</li>
          </ul>

          <h2>Protect yourself online</h2>
          <ul>
            <li><strong>Never send money</strong> or share financial details with someone you’ve met on volpair, however convincing the story. This is the most common scam.</li>
            <li><strong>Keep personal details private</strong> — home address, workplace and financial information — until you’ve built trust.</li>
            <li><strong>Be wary of anyone who won’t meet to play</strong>, pushes to move off volpair immediately, or whose story doesn’t add up.</li>
          </ul>

          <h2>Block &amp; report</h2>
          <p>
            If someone makes you uncomfortable, you can block and report them from
            their profile (“⋯” menu). Blocking is instant and they’re never told.
            Reports are confidential and reviewed by our team — see{' '}
            <a href="/help/safety-reporting">Safety &amp; reporting</a>.
          </p>

          <h2>Consent &amp; respect</h2>
          <p>
            volpair is for respectful, consensual connections between adults (18+).
            Harassment, threats, hate, nudity, or sharing someone’s private images
            without consent are never allowed and may be reported to the
            authorities. See our <a href="/legal/community-guidelines">Community Guidelines</a>.
          </p>

          <h2>If you need support</h2>
          <p>If you’re affected by abuse or assault, you’re not alone. In the UK:</p>
          <ul>
            <li><strong>Emergency:</strong> call 999 if you’re in immediate danger.</li>
            <li><strong>Samaritans</strong> (24/7 emotional support): 116 123.</li>
            <li><strong>National Domestic Abuse Helpline:</strong> 0808 2000 247.</li>
            <li><strong>Rape Crisis (England &amp; Wales):</strong> 0808 500 2222.</li>
          </ul>
          <p>
            Outside the UK, please contact your local emergency services and
            support organisations.
          </p>

          <hr />
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14 }}>
            To report a serious or illegal concern about volpair, email{' '}
            <a href="mailto:support@volpair.com">support@volpair.com</a>.
          </p>
        </div>
      </div>
    </main>
  );
}
