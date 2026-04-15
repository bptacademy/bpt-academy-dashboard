import * as Font from 'expo-font';
import { useEffect, useState } from 'react';

export function useBPTFonts() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Font.loadAsync({
      'TTOctosquaresCond-Light': require('../../assets/fonts/TTOctosquaresCond-Light.ttf'),
      'TTOctosquaresCond-Bold':  require('../../assets/fonts/TTOctosquaresCond-Bold.ttf'),
      'TTOctosquares-Light':     require('../../assets/fonts/TTOctosquares-Light.ttf'),
    }).then(() => setLoaded(true)).catch(() => setLoaded(true));
  }, []);

  return loaded;
}
