/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pre-launch: tell Google not to index volpair.app yet (matches volpair.com).
  // Applies to every route, including static files like /reset-password.html.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
