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
      restart_delay: 5000,      // wait 5s before restarting on crash
      max_restarts: 10,         // stop trying after 10 rapid crashes
      min_uptime: '30s',        // only count as crashed if dies within 30s
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
};
