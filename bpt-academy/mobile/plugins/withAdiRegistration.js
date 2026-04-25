const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withAdiRegistration = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const assetsDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'assets'
      );
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }
      const dest = path.join(assetsDir, 'adi-registration.properties');
      fs.writeFileSync(dest, 'DGCF7EA4VJ6AKAAAAAAAAAAAAA', 'utf8');
      console.log('[withAdiRegistration] wrote adi-registration.properties to', dest);
      return config;
    },
  ]);
};

module.exports = withAdiRegistration;
