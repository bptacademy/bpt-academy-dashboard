import './globals.css';

export const metadata = {
  metadataBase: new URL('https://volpair.com'),
  title: 'volpair — Every rally starts with a match',
  description:
    'The padel dating app. Meet someone for a match, a partner, or a spark. Join the waitlist.',
  // Pre-launch: keep out of search until we flip it at launch.
  robots: { index: false, follow: false },
  openGraph: {
    title: 'volpair — Every rally starts with a match',
    description: 'The padel dating app. Meet someone for a match, a partner, or a spark.',
    url: 'https://volpair.com',
    siteName: 'volpair',
    type: 'website',
  },
};

export const viewport = {
  themeColor: '#0d0020',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
