import { LegalPage } from '../../ui';

export const metadata = { title: 'Complaints & Dispute Resolution' };

export default function Complaints() {
  return (
    <LegalPage title="Complaints & Dispute Resolution" updated="20 June 2026">
      <p>
        We want volpair to be a safe, fair place. If something’s gone wrong, please
        tell us — most issues are resolved quickly.
      </p>

      <h2>1. How to complain</h2>
      <p>
        Email <a href="mailto:support@volpair.com">support@volpair.com</a> with a
        clear description of the issue and any relevant details (for example,
        screenshots or the username involved). For complaints about another user’s
        behaviour, please also use the in-app report tool (their profile → “⋯” →
        Report).
      </p>

      <h2>2. What happens next</h2>
      <ul>
        <li>We aim to acknowledge complaints within <strong>2–3 working days</strong>.</li>
        <li>We’ll investigate and aim to give you a full response within <strong>30 days</strong>; if we need longer, we’ll tell you why.</li>
        <li>For reports about content or conduct, we may remove content, warn, suspend, or ban accounts in line with our <a href="/legal/community-guidelines">Community Guidelines</a>.</li>
      </ul>

      <h2>3. Appeals</h2>
      <p>
        If you disagree with a moderation decision about your account, you can ask us
        to review it by replying to our decision email. We’ll take a fresh look and
        respond.
      </p>

      <h2>4. Illegal content &amp; safety</h2>
      <p>
        We treat reports of illegal content and serious safety concerns as a
        priority and cooperate with law enforcement where appropriate. If you or
        someone else is in immediate danger, contact your local emergency services
        first.
      </p>

      <h2>5. Billing complaints</h2>
      <p>
        Payments are processed by Apple and Google. For refunds or billing disputes,
        please also contact them directly (see our{' '}
        <a href="/legal/subscription-terms">Subscription &amp; Refund Terms</a>).
      </p>

      <h2>6. Further options</h2>
      <p>
        If we can’t resolve your complaint and you’re a consumer, you may have the
        right to refer certain disputes to alternative dispute resolution or the
        relevant ombudsman, and you can raise data-protection concerns with the UK
        Information Commissioner’s Office (ICO) at ico.org.uk.
      </p>

      <h2>7. Contact</h2>
      <p>
        volpair Ltd — <a href="mailto:support@volpair.com">support@volpair.com</a>.
      </p>
    </LegalPage>
  );
}
