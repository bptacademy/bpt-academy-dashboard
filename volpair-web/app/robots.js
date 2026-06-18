// Block all crawlers while volpair.app is pre-launch (matches volpair.com).
// Serves /robots.txt with a site-wide Disallow.
export default function robots() {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  };
}
