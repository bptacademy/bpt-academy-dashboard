export const metadata = {
  title: 'Privacy Policy – BPT Academy',
  description: 'Privacy Policy for BPT Academy Limited',
};

const LAST_UPDATED = '11 April 2026';

const SECTIONS = [
  {
    heading: '1. Who We Are',
    body: 'BPT Academy Limited ("BPT Academy", "we", "us", "our") is a private limited company registered in England and Wales (Company No. 16487239). Registered office: 12 Lakeside Rise, Manchester, England, M9 8QD.\n\nFor all data protection enquiries: office@bptacademy.uk',
  },
  {
    heading: '2. Our Commitment',
    body: 'We are committed to protecting your privacy. This Policy explains what personal data we collect, why we collect it, and your rights under UK data protection law, including the UK GDPR and the Data Protection Act 2018.\n\nBy using our Platform you confirm that you have read and understood this policy.',
  },
  {
    heading: '3. What Personal Data We Collect',
    body: 'Account & Identity: Full name, date of birth, email address, phone number, profile photo, city of residence, and user role.\n\nJunior / Child Accounts: Where a parent registers on behalf of a child, we collect the child\'s name and date of birth only. All child accounts are created and managed by a parent or guardian.\n\nSporting & Performance: Padel skill level, division, previous experience, attendance, training progress, coaching notes, and rankings.\n\nPayment Records: Payment amounts, dates, and programme. We do not store card details or bank account information.\n\nCommunications: In-app messages, announcements, and notifications.\n\nMedia: Training videos (hosted via Mux) and profile photographs.\n\nTechnical Data: Device type, OS, app usage logs, and push notification tokens.',
  },
  {
    heading: '4. Why We Process Your Data',
    body: 'We process your data to:\n\n• Create and manage your account (contract)\n• Deliver coaching programmes and track progress (contract)\n• Process payments and maintain financial records (contract / legal obligation)\n• Send service notifications (contract / legitimate interests)\n• Safeguard children and verify parental consent (legal obligation)\n• Improve the Platform (legitimate interests)\n• Comply with legal obligations',
  },
  {
    heading: '5. How Long We Keep Your Data',
    body: 'Account & identity data: duration of account + 2 years\nPayment records: 7 years (UK tax law)\nPerformance data: duration of account + 1 year\nMessages: 2 years from date\nChild account data: until age 18, or 1 year after closure\nTechnical data: 12 months rolling\n\nAfter the applicable period, data is securely deleted or anonymised.',
  },
  {
    heading: '6. Who Has Access to Your Data',
    body: 'Access is strictly limited to:\n\n• Super Administrators — authorised BPT Academy personnel for operational and safeguarding purposes\n• Coaches — only data for students enrolled in their programmes\n• Parents / Guardians — only their linked child\'s profile and progress\n\nWe do not sell your personal data to any third party.',
  },
  {
    heading: '7. Third-Party Service Providers',
    body: 'We use trusted technology providers to operate the Platform:\n\n• Supabase — database & authentication (EU)\n• Stripe Payments UK Ltd — payment processing (UK/EU)\n• Mux, Inc. — video hosting (USA, SCCs apply)\n• Resend — transactional email (USA, SCCs apply)\n• Expo Inc. — mobile app & push notifications (USA, SCCs apply)\n\nAll providers operate under binding data processing agreements.',
  },
  {
    heading: '8. Data Security',
    body: 'We implement appropriate technical and organisational measures including:\n\n• Encryption in transit (TLS/HTTPS)\n• Encrypted data storage\n• Role-based access controls\n• Row-level database security\n• Regular security reviews\n\nIf you suspect unauthorised access to your account, contact office@bptacademy.uk immediately.',
  },
  {
    heading: '9. Children\'s Privacy',
    body: 'Children under 18 may only use the Platform through an account created and managed by a parent or guardian. We collect minimal data about children — only name and date of birth.\n\nParents have the right to access, correct, and request deletion of their child\'s data at any time.\n\nWe do not knowingly collect personal data directly from children under 13.',
  },
  {
    heading: '10. Your Rights Under UK GDPR',
    body: 'You have the right to:\n\n• Access — request a copy of your personal data\n• Rectification — correct inaccurate or incomplete data\n• Erasure — request deletion in certain circumstances\n• Restrict processing — limit how we use your data\n• Data portability — receive your data in a structured format\n• Object — to processing based on legitimate interests\n\nTo exercise any right, contact office@bptacademy.uk. We will respond within 30 days.\n\nYou may also lodge a complaint with the ICO at ico.org.uk or on 0303 123 1113.',
  },
  {
    heading: '11. Changes to This Policy',
    body: 'We may update this policy from time to time. When we make material changes, we will notify you via the Platform or by email. Continued use following notification constitutes acceptance of the updated policy.',
  },
  {
    heading: '12. Contact Us',
    body: 'BPT Academy Limited\nEmail: office@bptacademy.uk\n12 Lakeside Rise, Manchester, England, M9 8QD\nCompany No. 16487239',
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500">BPT Academy Limited · Company No. 16487239 · Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="space-y-6">
          {SECTIONS.map((s) => (
            <div key={s.heading} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-3">{s.heading}</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} BPT Academy Limited. All rights reserved.
        </div>
      </div>
    </main>
  );
}
