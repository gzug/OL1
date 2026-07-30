# OL1

Fresh Android-first, iOS-ready rebuild with a fixture-only web preview. This repository is at
bootstrap status: it proves platform configuration and minimal native boundaries, not product
features.

## Requirements

- Node 22.13.1
- npm 10.9.x
- Android Studio/JDK 17 for local Android builds
- Xcode 26.4+ for local iOS builds, or EAS Build for the configured simulator proof

## Setup and checks

```sh
npm ci
npm run doctor
npm run check
npm run prebuild:android
npm run prebuild:ios
```

Development starts with `npm start`; the fixture-only web preview starts with `npm run web`.
Generated `android/` and `ios/` directories are not versioned.

## Variants

| Variant | Visible name | Android package | iOS bundle |
| --- | --- | --- | --- |
| development | One L1fe Dev | `com.onel1fe.mobile.dev` | `com.onel1fe.mobile.dev` |
| preview | One L1fe Preview | `com.onel1fe.mobile.preview` | `com.onel1fe.mobile.preview` |

`APP_VARIANT` is fail-closed and accepts only `development` or `preview`. No production profile
exists.

## Structure

- `src/app/`: neutral internal compatibility surface
- `src/application/`: use-case boundary consumed by routes
- `src/core/`: platform-neutral contracts
- `src/infrastructure/health/`: Android Health Connect, iOS unavailable, web fixtures
- `src/infrastructure/storage/`: native SQLite and web in-memory storage
- `tests/`: configuration and contract tests
- `docs/product-spec.md`: confirmed, open, and rejected product foundations

The Legacy repository is a controlled reference only. It is not product truth and may be inspected
only with explicit authorization.
