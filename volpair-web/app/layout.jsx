import './globals.css';

export const metadata = {
  // Low-key title, matching volpair.com.
  title: '.',
  // Keep volpair.app out of Google for now — mirrors volpair.com's setting.
  // Renders: <meta name="robots" content="noindex, nofollow">
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
