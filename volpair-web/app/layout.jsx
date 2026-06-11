export const metadata = { title: 'volpair' };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#0D1B2A' }}>{children}</body>
    </html>
  );
}
