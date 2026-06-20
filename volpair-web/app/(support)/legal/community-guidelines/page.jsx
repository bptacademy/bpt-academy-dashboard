import { LegalPage } from '../../ui';

export const metadata = { title: 'Community Guidelines' };

export default function CommunityGuidelines() {
  return (
    <LegalPage title="Community Guidelines" updated="20 June 2026">
      <p>
        volpair is a community of padel players looking to connect — to play, and
        sometimes to date. These guidelines keep it welcoming, respectful and safe.
        They form part of our <a href="/legal/terms">Terms of Service</a>. Breaking
        them can lead to content removal, suspension, or a permanent ban, and
        serious or illegal behaviour may be reported to the authorities.
      </p>

      <h2>Be respectful</h2>
      <ul>
        <li>Treat others how you’d want to be treated, on court and in chat.</li>
        <li>No harassment, bullying, threats, or repeated unwanted contact.</li>
        <li>No hate speech or discrimination based on race, ethnicity, religion, disability, gender, sexual orientation, or any other protected characteristic.</li>
      </ul>

      <h2>Be real</h2>
      <ul>
        <li>Be yourself — use recent photos that are actually of you.</li>
        <li>No impersonation, fake profiles, or catfishing.</li>
        <li>You must be 18 or over. Profiles suggesting a user is under 18 will be removed.</li>
      </ul>

      <h2>Keep it appropriate</h2>
      <ul>
        <li>No nudity or sexually explicit photos or content.</li>
        <li>No sharing of anyone’s private or intimate images without their consent — ever.</li>
        <li>No graphic violence, self-harm content, or anything that endangers others.</li>
      </ul>

      <h2>No exploitation or harm</h2>
      <ul>
        <li>Zero tolerance for any content or behaviour involving minors.</li>
        <li>No human trafficking, sexual services, or exploitation.</li>
        <li>No promoting illegal activity, drugs, or weapons.</li>
      </ul>

      <h2>Don’t use volpair to sell or scam</h2>
      <ul>
        <li>No spam, advertising, fundraising, or commercial solicitation.</li>
        <li>Never ask for or send money. Romance scams are a serious harm — report them.</li>
        <li>No phishing or attempts to take users off-platform to defraud them.</li>
      </ul>

      <h2>Play fair with the platform</h2>
      <ul>
        <li>One account per person.</li>
        <li>Don’t scrape data, automate activity, or attempt to break our security.</li>
        <li>Don’t evade bans by creating new accounts.</li>
      </ul>

      <h2>Reporting</h2>
      <p>
        If you see something that breaks these rules, report it from the user’s
        profile (“⋯” → Report) or email{' '}
        <a href="mailto:support@volpair.com">support@volpair.com</a>. Reports are
        confidential. We review reports and take action where appropriate, and we
        cooperate with law enforcement on illegal content. See our{' '}
        <a href="/safety">Safety Centre</a> for staying safe.
      </p>
    </LegalPage>
  );
}
