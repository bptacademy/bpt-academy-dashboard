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
    body: 'BPT Academy Limited ("BPT Academy") is registered in England and Wales (Company No. 16487239). Registered office: 12 Lakeside Rise, Manchester, England, M9 8QD.\n\nContact: office@bptacademy.uk\n\nThese Terms govern your access to the BPT Academy Platform and all Services we provide.',
  },
  {
    heading: '2. Acceptance of Terms',
    body: 'By registering an account or purchasing Services, you confirm that:\n\n• You have read and agree to these Terms\n• You are at least 18 years old, or a parent/guardian acting on behalf of a child\n• You have the legal capacity to enter a binding agreement\n\nIf you do not agree, you must not use the Platform.',
  },
  {
    heading: '3. Account Registration',
    body: 'You must provide accurate, current information and keep it up to date. You are responsible for all activity under your account and must notify us immediately of any unauthorised access.\n\nWhere you register on behalf of a child under 18, you confirm you are their parent or legal guardian and accept full responsibility for their use of the Platform.',
  },
  {
    heading: '4. Our Services',
    body: 'BPT Academy offers padel coaching programmes across Amateur (Beginner, Intermediate, Advanced), Semi-Pro, Pro, Juniors Amateur, Juniors Pro, and Young Talents divisions.\n\nWe also offer private lessons on a per-session basis. Programme availability, schedules, pricing, and capacity are subject to change at our discretion.\n\nThe Platform provides training videos, progress tracking, messaging, session scheduling, and tournament information as a convenience, subject to availability.',
  },
  {
    heading: '5. Enrolment and Waiting Lists',
    body: 'Enrolment in a programme is a binding agreement to participate and pay for that monthly cycle. Places are not guaranteed until confirmed and payment received.\n\nWaiting list positions are allocated in registration order. BPT Academy does not guarantee conversion of a waiting list place to enrolment.\n\nFor monthly programmes, you will be notified of the deadline to confirm your place for the following month. Failure to confirm by the deadline may result in your place being offered elsewhere.',
  },
  {
    heading: '6. Fees and Payment',
    body: 'All fees are in GBP and inclusive of VAT where applicable. Payment is due in advance of programme commencement or session delivery.\n\nWe accept card payment (via Stripe) and bank transfer. We do not store card or bank account details.\n\nYour place is not confirmed until payment is received and verified. We may introduce recurring automatic payments in the future — we will give advance notice and obtain your consent before any recurring charge is applied.',
  },
  {
    heading: '7. Cancellations and Refunds',
    body: 'PRIVATE LESSONS\nYou may cancel and receive a full refund provided you give at least 48 hours\' notice before the scheduled session. Cancellations within 48 hours are non-refundable.\n\nGROUP PROGRAMMES\nOnce a monthly group programme has commenced, no refunds will be issued for that cycle regardless of attendance.\n\nCANCELLATION BEFORE START\nCancellations before a programme commences may be eligible for a full or partial refund at our discretion.\n\nCANCELLATION BY BPT ACADEMY\nIf we cancel a session, we will notify you promptly and provide a credit or refund for undelivered sessions. We are not liable for additional costs (e.g. travel) you incur.\n\nTo request a refund, contact office@bptacademy.uk. Eligible refunds are processed within 10 working days.',
  },
  {
    heading: '8. Conduct and Acceptable Use',
    body: 'You agree to:\n• Treat all coaches, staff, and participants with respect\n• Follow all reasonable instructions from BPT Academy staff\n• Not engage in bullying, harassment, or discrimination\n• Not attempt to disrupt or gain unauthorised access to the Platform\n\nYou must not use the Platform for any unlawful purpose, upload harmful content, impersonate others, or share your login credentials.\n\nBPT Academy may suspend or terminate your account and remove you from programmes, without refund, for serious or persistent breach of these Terms.',
  },
  {
    heading: '9. Health, Safety, and Physical Activity',
    body: 'By participating, you confirm you are medically fit for physical sporting activity. If you have any medical condition, injury, or disability that may affect safe participation, you must inform us before taking part.\n\nPhysical sporting activity carries inherent risks of injury. You accept that your participation is at your own risk.\n\nBPT Academy holds appropriate public liability insurance. We strongly recommend all participants obtain their own personal accident insurance.\n\nIn the event of injury, inform the coach or a BPT Academy staff member immediately.',
  },
  {
    heading: '10. Intellectual Property',
    body: 'All content on the Platform — including training videos, programme materials, the BPT Academy name and logo, text, graphics, and software — is owned by or licensed to BPT Academy Limited.\n\nYou may not copy, reproduce, distribute, or create derivative works from any Platform content without our prior written consent.',
  },
  {
    heading: '11. Limitation of Liability',
    body: 'BPT Academy is not liable for any indirect, incidental, consequential, or punitive loss or damage.\n\nOur total aggregate liability to you shall not exceed the total fees paid by you to BPT Academy in the 12 months preceding the event giving rise to the claim.\n\nNothing in these Terms excludes liability for death or personal injury caused by our negligence, fraud, or any other liability that cannot be limited under English law.\n\nYour statutory rights as a consumer under the Consumer Rights Act 2015 are not affected.',
  },
  {
    heading: '12. Termination',
    body: 'You may close your account at any time by contacting office@bptacademy.uk. Closing your account does not entitle you to a refund of fees already paid.\n\nWe may suspend or terminate your account if you breach these Terms, if required by law, or if we cease to operate the Platform.',
  },
  {
    heading: '13. Governing Law',
    body: 'These Terms are governed by the law of England and Wales. The courts of England and Wales have exclusive jurisdiction.\n\nBefore commencing legal proceedings, we encourage you to contact us at office@bptacademy.uk to resolve any dispute informally.',
  },
  {
    heading: '14. Changes to These Terms',
    body: 'We may update these Terms at any time. We will notify you of material changes via the Platform or by email at least 14 days before they take effect. Continued use of the Platform after the effective date constitutes acceptance.',
  },
  {
    heading: '15. Contact',
    body: 'BPT Academy Limited\nEmail: office@bptacademy.uk\n12 Lakeside Rise, Manchester, England, M9 8QD\nCompany No. 16487239',
  },
];

export default function TermsOfServiceScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />

      <BackHeader title="Terms of Service" />
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
