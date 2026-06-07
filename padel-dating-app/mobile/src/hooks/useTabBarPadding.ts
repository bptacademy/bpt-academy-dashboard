import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Pill sits 24px from screen bottom.
// Content padding = pill height + gap below pill + small gap above pill + safe area inset.
// Total static reduced by 15% from original 94px → 80px
const PILL_HEIGHT = 66;
const PILL_BOTTOM = 12; // was 24, reduced
const CONTENT_GAP = 2;  // was 4, reduced

export function useTabBarPadding() {
  const insets = useSafeAreaInsets();
  return PILL_HEIGHT + PILL_BOTTOM + CONTENT_GAP + insets.bottom;
}
