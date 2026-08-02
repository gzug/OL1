import {
  Fraunces_300Light,
  Fraunces_500Medium,
  Fraunces_500Medium_Italic,
} from '@expo-google-fonts/fraunces';
import {
  Manrope_200ExtraLight,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ThemeProvider, useTheme } from '@/ui/theme';

/**
 * The brand aliases are indirection on purpose: components ask for `fontFamily.body`, never for
 * Manrope. Swapping the typeface later is then this file plus one token, not every StyleSheet.
 *
 * Manrope carries the interface; Fraunces is the editorial serif, reserved for hero moments.
 */
const FONTS = {
  BrandBody: Manrope_400Regular,
  BrandDisplay: Manrope_200ExtraLight,
  BrandHeading: Manrope_600SemiBold,
  BrandMedium: Manrope_500Medium,
  BrandSemiBold: Manrope_600SemiBold,
  BrandSerif: Fraunces_500Medium,
  BrandSerifItalic: Fraunces_500Medium_Italic,
  BrandSerifLight: Fraunces_300Light,
  BrandStrong: Manrope_700Bold,
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONTS);

  // Hold the splash rather than paint one frame in the system font and reflow into the brand one.
  // `fontError` still releases it: a missing font is a degraded screen, not a blank app.
  if (!fontsLoaded && fontError === null) {
    return null;
  }

  return (
    <ThemeProvider>
      <ThemedStack />
    </ThemeProvider>
  );
}

function ThemedStack() {
  const { colors } = useTheme();

  return (
    <>
      <StatusBar style={colors.statusBar === 'dark' ? 'dark' : 'light'} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerShown: false,
        }}
      />
    </>
  );
}
