module.exports = {
  apps: [
    // Metro bundler — LAN mode, hostname set to ngrok domain so QR/URL is correct
    {
      name: 'bpt-academy',
      cwd: '/Users/iamfabiandavid/.openclaw/workspace/bpt-academy/mobile',
      script: 'npx',
      args: 'expo start --lan',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 5000,
      env: {
        NODE_ENV: 'development',
        REACT_NATIVE_PACKAGER_HOSTNAME: 'bpt-academy.ngrok.app',
      },
    },
    // ngrok v3 — stable tunnel from bpt-academy.ngrok.app → localhost:8081
    {
      name: 'bpt-ngrok',
      script: '/opt/homebrew/bin/ngrok',
      args: 'http --domain=bpt-academy.ngrok.app 8081',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      restart_delay: 3000,
    },
  ],
};
