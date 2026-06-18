export const metadata = {
  title: 'volpair',
  // Keep volpair.app out of Google for now — mirrors volpair.com's setting.
  // Renders: <meta name="robots" content="noindex, nofollow">
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#0D1B2A' }}>{children}</body>
    </html>
  );
}
