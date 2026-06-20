import './support.css';
import { Header, Footer } from './ui';

export const metadata = {
  title: { default: 'Help & Support · volpair', template: '%s · volpair' },
  description: 'Help, safety and legal information for volpair — the padel dating app.',
  robots: { index: false, follow: false }, // pre-launch; flip at launch
};

export default function SupportLayout({ children }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
