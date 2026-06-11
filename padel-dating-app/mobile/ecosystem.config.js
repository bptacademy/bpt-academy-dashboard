module.exports = {
  apps: [
    {
      name: 'volpair',
      cwd: '/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile',
      script: 'npx',
      args: 'expo start --port 8082',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 5000,
      env: {
        NODE_ENV: 'development',
        REACT_NATIVE_PACKAGER_HOSTNAME: 'volpair.ngrok.app',
        EXPO_PACKAGER_PROXY_URL: 'https://volpair.ngrok.app',
      },
    },
    {
      name: 'volpair-tunnel',
      cwd: '/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile',
      script: '/opt/homebrew/bin/ngrok',
      args: 'http --url=volpair.ngrok.app 8082',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      restart_delay: 5000,
    },
  ],
};
