import type { ConfigContext, ExpoConfig } from 'expo/config';

export const APP_VARIANTS = {
  development: {
    androidPackage: 'com.onel1fe.mobile.dev',
    bundleIdentifier: 'com.onel1fe.mobile.dev',
    environmentLabel: 'DEV',
    name: 'One L1fe Dev',
    scheme: 'ol1-dev',
  },
  preview: {
    androidPackage: 'com.onel1fe.mobile.preview',
    bundleIdentifier: 'com.onel1fe.mobile.preview',
    environmentLabel: 'PREVIEW',
    name: 'One L1fe Preview',
    scheme: 'ol1-preview',
  },
} as const;

export type AppVariant = keyof typeof APP_VARIANTS;

export function requireAppVariant(value = process.env.APP_VARIANT): AppVariant {
  if (value !== 'development' && value !== 'preview') {
    throw new Error(
      'APP_VARIANT must be explicitly set to "development" or "preview".',
    );
  }
  return value;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const appVariant = requireAppVariant();
  const variant = APP_VARIANTS[appVariant];

  return {
    ...config,
    name: variant.name,
    slug: 'OL1',
    owner: 'kafadon',
    version: '0.1.0',
    orientation: 'portrait',
    scheme: variant.scheme,
    ios: {
      ...config.ios,
      bundleIdentifier: variant.bundleIdentifier,
      infoPlist: {
        ...config.ios?.infoPlist,
        ITSAppUsesNonExemptEncryption: false,
      },
      supportsTablet: false,
    },
    android: {
      ...config.android,
      package: variant.androidPackage,
      permissions: ['android.permission.health.READ_STEPS'],
    },
    web: {
      ...config.web,
      bundler: 'metro',
      output: 'static',
    },
    plugins: [
      'expo-router',
      'expo-health-connect',
      [
        'expo-build-properties',
        {
          android: {
            minSdkVersion: 28,
          },
        },
      ],
      'expo-sqlite',
    ],
    experiments: {
      ...config.experiments,
      typedRoutes: true,
    },
    extra: {
      ...config.extra,
      appVariant,
      environmentLabel: variant.environmentLabel,
      eas: {
        projectId: 'be9ee55c-2477-43f9-86ab-02d23007f773',
      },
    },
  };
};
