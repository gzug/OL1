import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type ThemeColors } from './tokens';

export type ThemeMode = 'dark' | 'light' | 'system';

type ThemeContextValue = {
  colors: ThemeColors;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Light is the default, matching Legacy: the product opens on warm paper, and that is the look the
 * owners recognise as theirs.
 *
 * The chosen mode is NOT persisted yet, and that is deliberate rather than unfinished. Legacy used
 * AsyncStorage; this repository has no key-value store at all — `StorageAdapter` exposes only
 * `initialize()`, over a health schema guarded by an additive-only migration test. Growing that
 * schema to remember one enum, before any screen can even change it, buys nothing. Persistence
 * lands with the settings surface that needs it.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const systemScheme = useColorScheme();

  const setMode = useCallback((next: ThemeMode) => setModeState(next), []);

  // `useColorScheme` can be null before the OS reports one; light is the fallback either way.
  const resolved = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const isDark = resolved === 'dark';

  const value = useMemo<ThemeContextValue>(
    () => ({ colors: isDark ? darkColors : lightColors, isDark, mode, setMode }),
    [isDark, mode, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === null) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return context;
}
