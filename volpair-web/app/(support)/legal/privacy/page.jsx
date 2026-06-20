import { LegalPage } from '../../ui';

export const metadata = { title: 'Privacy Policy' };

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="20 June 2026">
      <p>
        This Privacy Policy explains how volpair Ltd (“volpair”, “we”, “us”) — the
        data controller — collects and uses your personal data when you use the
        volpair app and website. We comply with the UK GDPR and the Data Protection
        Act 2018. Questions? Email{' '}
        <a href="mailto:support@volpair.com">support@volpair.com</a>.
      </p>

      <h2>1. Data we collect</h2>
      <ul>
        <li><strong>Account &amp; profile:</strong> name, email, date of birth, gender, city, photos, bio, padel level and play style, and the optional “More about you” details (job, height, interests, prompts, etc.).</li>
        <li><strong>Location:</strong> approximate device location to show you nearby players, when you grant permission.</li>
        <li><strong>Activity:</strong> Volleys, Connects, matches, messages (Serves), and how you use features.</li>
        <li><strong>Linked platforms:</strong> if you connect a booking platform (e.g. Playtomic), your padel level and match history.</li>
        <li><strong>Device &amp; technical:</strong> device type, app version, push token, and basic diagnostic data.</li>
        <li><strong>Payments:</strong> subscription status. Card details are handled by Apple/Google — we do not see or store them.</li>
      </ul>

      <h2>2. How and why we use it (lawful bases)</h2>
      <ul>
        <li><strong>To provide the Service</strong> — matching, messaging, profiles (performance of our contract with you).</li>
        <li><strong>Safety &amp; moderation</strong> — preventing abuse, reviewing reports, enforcing our rules (legitimate interests; legal obligation).</li>
        <li><strong>Location-based discovery</strong> — showing nearby players (your consent, which you can withdraw).</li>
        <li><strong>Communications</strong> — service messages and notifications (contract / legitimate interests); marketing only with your consent.</li>
        <li><strong>Improving volpair</strong> — analytics and reliability (legitimate interests).</li>
        <li><strong>Legal compliance</strong> — meeting our legal and regulatory obligations.</li>
      </ul>

      <h2>3. Who we share it with</h2>
      <p>We do not sell your personal data. We share it only with providers that help us run volpair, under contract, including:</p>
      <ul>
        <li><strong>Supabase</strong> — database, authentication and storage hosting;</li>
        <li><strong>Expo</strong> — push notification delivery;</li>
        <li><strong>Resend</strong> — transactional email;</li>
        <li><strong>Apple / Google</strong> — app distribution and payments;</li>
        <li><strong>Google Maps/Places</strong> — location and club search.</li>
      </ul>
      <p>We may also disclose data where required by law, to protect users, or in connection with a business transfer.</p>

      <h2>4. International transfers</h2>
      <p>
        Some providers may process data outside the UK. Where they do, we rely on
        appropriate safeguards (such as UK adequacy decisions or standard
        contractual clauses) to protect your data.
      </p>

      <h2>5. How long we keep it</h2>
      <p>
        We keep your data while your account is active. If you delete your account,
        we delete or anonymise your personal data, except where we must keep limited
        records to meet legal obligations, resolve disputes, or enforce our Terms.
      </p>

      <h2>6. Your rights</h2>
      <p>Under UK data protection law you can:</p>
      <ul>
        <li>access a copy of your data;</li>
        <li>correct inaccurate data;</li>
        <li>delete your data (“right to erasure”);</li>
        <li>restrict or object to certain processing;</li>
        <li>request portability of data you provided;</li>
        <li>withdraw consent (e.g. location) at any time.</li>
      </ul>
      <p>
        To exercise these rights, email{' '}
        <a href="mailto:support@volpair.com">support@volpair.com</a>. We’ll respond
        within one month. You can also delete your account in-app at any time. If
        you’re unhappy with how we handle your data, you can complain to the UK
        Information Commissioner’s Office (ICO) at ico.org.uk.
      </p>

      <h2>7. Children</h2>
      <p>
        volpair is strictly for adults aged 18 and over. We do not knowingly collect
        data from anyone under 18, and will delete such accounts if discovered.
      </p>

      <h2>8. Security</h2>
      <p>
        We use technical and organisational measures to protect your data,
        including access controls and encryption in transit. No system is perfectly
        secure, so we cannot guarantee absolute security.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update this policy. We’ll notify you of material changes in the app
        or by email, and update the date above.
      </p>

      <h2>10. Contact</h2>
      <p>
        volpair Ltd — <a href="mailto:support@volpair.com">support@volpair.com</a>.
      </p>
    </LegalPage>
  );
}
