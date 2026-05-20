module.exports = {
  apps: [
    {
      name: 'bpt-academy',
      cwd: '/Users/iamfabiandavid/.openclaw/workspace/bpt-academy/mobile',
      script: 'node_modules/.bin/expo',
      args: 'start --port 8083 --lan',
      env: {
        EXPO_TOKEN: 'Pk854f_PODIEEYxcbc3UtdflghEbc695TKhV5P1y',
        REACT_NATIVE_PACKAGER_HOSTNAME: 'bpt-academy.ngrok.app',
        EXPO_PACKAGER_PROXY_URL: 'https://bpt-academy.ngrok.app',
        EXPO_NO_DOCTOR: '1',
      },
    },
  ],
};
