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
      restart_delay: 8000,  // wait 8s before restarting — gives ngrok time to recover
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
};
