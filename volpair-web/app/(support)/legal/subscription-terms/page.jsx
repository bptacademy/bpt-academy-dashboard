import { LegalPage } from '../../ui';

export const metadata = { title: 'Subscription & Refund Terms' };

export default function SubscriptionTerms() {
  return (
    <LegalPage title="Subscription & Refund Terms" updated="20 June 2026">
      <p>
        These Subscription &amp; Refund Terms apply to any paid subscription or
        purchase on volpair. They form part of our{' '}
        <a href="/legal/terms">Terms of Service</a>. volpair is free to download and
        use for core features; some optional features may be offered for a fee.
      </p>

      <h2>1. Billing through the app stores</h2>
      <p>
        All purchases are made through, and billed by, <strong>Apple’s App Store</strong>{' '}
        or <strong>Google Play</strong>, in line with their terms. Your subscription is
        charged to your Apple or Google account at confirmation of purchase. We do
        not receive or store your card details.
      </p>

      <h2>2. Auto-renewal</h2>
      <p>
        Subscriptions renew automatically at the end of each billing period (for
        example, monthly) at the then-current price, unless you cancel at least
        24 hours before the period ends. Your account is charged for renewal within
        24 hours of the end of the current period.
      </p>

      <h2>3. How to cancel</h2>
      <p>You can cancel anytime through your device — cancellation stops future renewals, and you keep premium features until the end of the period you’ve paid for:</p>
      <ul>
        <li><strong>iPhone/iPad:</strong> Settings → [your name] → Subscriptions → volpair → Cancel.</li>
        <li><strong>Android:</strong> Play Store → profile → Payments &amp; subscriptions → Subscriptions → volpair → Cancel.</li>
      </ul>
      <p>Deleting the app does not cancel a subscription — you must cancel as above.</p>

      <h2>4. Price changes</h2>
      <p>
        We may change subscription prices. Where required, we’ll give you advance
        notice and the chance to cancel before the new price applies. Price changes
        never affect a period you’ve already paid for.
      </p>

      <h2>5. Refunds</h2>
      <p>
        Because Apple and Google process payments, <strong>refund requests are
        handled by them</strong>, under their policies:
      </p>
      <ul>
        <li><strong>Apple:</strong> request a refund at reportaproblem.apple.com.</li>
        <li><strong>Google Play:</strong> request a refund via the Play Store or play.google.com.</li>
      </ul>

      <h2>6. Your consumer rights (UK/EU)</h2>
      <p>
        If you are a consumer, you may have a statutory right to cancel a purchase
        within 14 days under the Consumer Contracts Regulations 2013. However, for
        digital content and services, this right is lost once supply begins with
        your consent — and by purchasing and immediately accessing a paid feature,
        you ask us to begin supply right away and acknowledge you lose the 14-day
        cancellation right. This does not affect your other statutory rights,
        including remedies if a paid feature is faulty or not as described.
      </p>

      <h2>7. Changes to these terms</h2>
      <p>
        We may update these terms. Material changes will be notified in the app or by
        email, and the date above updated.
      </p>

      <h2>8. Contact</h2>
      <p>
        Questions about a subscription? Email{' '}
        <a href="mailto:support@volpair.com">support@volpair.com</a>. For payment or
        refund issues, contact Apple or Google directly as above.
      </p>
    </LegalPage>
  );
}
