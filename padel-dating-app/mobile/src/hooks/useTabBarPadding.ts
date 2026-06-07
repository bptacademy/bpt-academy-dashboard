import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Pill sits 24px from screen bottom.
// Content padding = pill height + gap below pill + small gap above pill + safe area inset.
const PILL_HEIGHT = 66;
const PILL_BOTTOM = 24;
const CONTENT_GAP = 4; // 5px reduced by 15%

export function useTabBarPadding() {
  const insets = useSafeAreaInsets();
  return PILL_HEIGHT + PILL_BOTTOM + CONTENT_GAP + insets.bottom;
}
