module.exports = {
  apps: [
    {
      name: 'bpt-academy',
      cwd: '/Users/iamfabiandavid/.openclaw/workspace/bpt-academy/mobile',
      script: 'npx',
      args: 'expo start --tunnel',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 5000,
      env: {
        NODE_ENV: 'development',
        EXPO_TUNNEL_SUBDOMAIN: 'bpt-academy',
      },
    },
  ],
};
