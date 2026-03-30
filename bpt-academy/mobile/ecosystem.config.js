module.exports = {
  apps: [
    // ── Expo dev server (LAN — stable, never crashes due to ngrok) ──
    {
      name: 'bpt-expo',
      cwd: '/Users/iamfabiandavid/.openclaw/workspace/bpt-academy/mobile',
      script: 'npx',
      args: 'expo start --lan',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
      },
    },

    // ── ngrok tunnel (independent process — static domain, never changes) ──
    {
      name: 'bpt-ngrok',
      script: '/opt/homebrew/bin/ngrok',
      args: 'http 8081 --domain=lizeth-wolframic-caressively.ngrok-free.dev --log stdout',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
    },
  ],
};
