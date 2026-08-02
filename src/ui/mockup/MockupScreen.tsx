import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/ui/theme';

import { MockupFrame } from './MockupFrame';

/**
 * Every mockup route was repeating the same safe-area wrapper, and each one had the background
 * colour written into it separately. Once the colour comes from the theme that repetition stops
 * being harmless — four copies is four chances for one screen to keep the old palette.
 */
export function MockupScreen({ children }: { children: ReactNode }) {
  const { colors } = useTheme();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <MockupFrame>{children}</MockupFrame>
    </SafeAreaView>
  );
}
