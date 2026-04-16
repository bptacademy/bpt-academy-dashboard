import React from 'react';
import { View, Text, ScrollView, StyleSheet, Image, Dimensions} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackHeader from '../../components/common/BackHeader';

const LAST_UPDATED = '11 April 2026';

interface Section {
  heading: string;
  body: string;
}

const SECTIONS: Section[] = [
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

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />

      <BackHeader title="Privacy Policy" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.metaCard}>
          <Text style={styles.companyName}>BPT Academy Limited</Text>
          <Text style={styles.companyDetail}>Company No. 16487239</Text>
          <Text style={styles.companyDetail}>Last updated: {LAST_UPDATED}</Text>
        </View>

        {SECTIONS.map((s) => (
          <View key={s.heading} style={styles.section}>
            <Text style={styles.heading}>{s.heading}</Text>
            <Text style={styles.body}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16 },

  metaCard: {
    backgroundColor: '#111827', borderRadius: 14, padding: 16, marginBottom: 20,
  },
  companyName: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  companyDetail: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 },

  section: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB',
  },
  heading: {
    fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 8,
  },
  body: {
    fontSize: 13, color: '#4B5563', lineHeight: 20,
  },
});
