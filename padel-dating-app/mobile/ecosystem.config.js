module.exports = {
  apps: [
    {
      name: 'volpair',
      cwd: '/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile',
      script: 'npx',
      args: 'expo start --tunnel --port 8082',
      env: {
        EXPO_TUNNEL_SUBDOMAIN: 'volpair',
        NGROK_AUTHTOKEN: '3BftKaqkXBCmqqH6zH5fr7ziyeL_2sY31pCDdWD97jSQokCEu',
      },
      watch: false,
      autorestart: true,
      max_restarts: 5,
    },
  ],
};
