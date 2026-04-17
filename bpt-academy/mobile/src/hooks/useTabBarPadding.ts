import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_HEIGHT } from '../navigation';

/**
 * Returns the correct bottom padding so content always ends
 * above the tab bar on every device and every role.
 * Use as: contentContainerStyle={{ paddingBottom: tabBarPadding }}
 */
export function useTabBarPadding(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + insets.bottom + 16;
}
