module.exports = {
  apps: [
    {
      name: 'volpair',
      cwd: '/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile',
      script: 'npx',
      args: 'expo start --tunnel --port 8082',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 5000,
      env: {
        NODE_ENV: 'development',
        EXPO_TUNNEL_SUBDOMAIN: 'volpair',
      },
    },
    {
      name: 'volpair-tunnel',
      script: 'ngrok',
      args: 'http --url=volpair.ngrok.app 8082',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      restart_delay: 3000,
    },
  ],
};
