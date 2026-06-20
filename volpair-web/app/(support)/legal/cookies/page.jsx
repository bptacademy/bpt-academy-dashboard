import { LegalPage } from '../../ui';

export const metadata = { title: 'Cookie Policy' };

export default function Cookies() {
  return (
    <LegalPage title="Cookie Policy" updated="20 June 2026">
      <p>
        This Cookie Policy explains how volpair Ltd uses cookies and similar
        technologies on our website (volpair.com and support.volpair.com) and,
        where relevant, in our app. It should be read with our{' '}
        <a href="/legal/privacy">Privacy Policy</a>.
      </p>

      <h2>1. What cookies are</h2>
      <p>
        Cookies are small text files stored on your device when you visit a website.
        Similar technologies (like local storage and SDK identifiers) work in a
        comparable way in apps. They help things work and help us understand usage.
      </p>

      <h2>2. The cookies we use</h2>
      <ul>
        <li><strong>Strictly necessary</strong> — required for the site to function and to keep it secure. These don’t need consent.</li>
        <li><strong>Functional</strong> — remember your preferences.</li>
        <li><strong>Analytics</strong> — help us understand how the site is used so we can improve it. These are only set with your consent where required.</li>
      </ul>
      <p>
        We do not use cookies to sell your data or for third-party advertising
        networks.
      </p>

      <h2>3. Managing cookies</h2>
      <p>
        Where consent is required, you can accept or reject non-essential cookies via
        our cookie banner. You can also control cookies through your browser settings
        — blocking some cookies may affect how the site works.
      </p>

      <h2>4. Changes</h2>
      <p>We may update this policy; the date above shows the latest version.</p>

      <h2>5. Contact</h2>
      <p>
        Questions? Email <a href="mailto:support@volpair.com">support@volpair.com</a>.
      </p>
    </LegalPage>
  );
}
