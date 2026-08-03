# OL1

**New here? Read [`START-HERE.md`](START-HERE.md) first.** It is the plain-language version of this
page and takes five minutes.

Fresh Android-first, iOS-ready rebuild with a fixture-only web preview. This repository is at
bootstrap status plus two mockup screens: it proves platform configuration and minimal native
boundaries, and it renders a Home screen and a Digital Twin screen for layout review. Nothing
behind those two screens is wired up, and that is deliberate.

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

`npm run web` opens the mockup screens in a browser. It is the only way to see them without Android
Studio or a device, and it needs neither. Development on a device starts with `npm start`. Generated
`android/` and `ios/` directories are not versioned.

## Working here to two

Both owners have write access and work in parallel. Three habits, in full in `AGENTS.md`:

- A draft pull request opens on the **first** commit of a piece of work, not the last. The open-PR
  list is how each of you sees what the other is on; there is no status file by design.
- Two open pull requests never change the same file.
- `npm run check` green — all six stages — before anything is called done.

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
- `src/ui/mockup/`: the Home and Digital Twin mockups, their geometry, and their fixtures
- `tests/`: configuration and contract tests
- `docs/product-spec.md`: confirmed, open, and rejected product foundations
- `docs/decisions/`: why an earlier answer stopped being right

The Legacy repository — `github.com/gzug/01-One-L1fe` — is a knowledge base and may be read freely.
It is a reference, not product truth: the product comes from `docs/product-spec.md`.

## Design

`src/ui/theme/` holds the design system, ported from Legacy: brand green `#31796D`, a light and a
dark set, Manrope for the interface and Fraunces for hero moments. Components read colours through
`useTheme()` and everything else from the token exports — nothing hardcodes a colour.
