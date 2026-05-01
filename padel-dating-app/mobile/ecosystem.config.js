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
      },
    },
  ],
};
