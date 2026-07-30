# Product specification

## Confirmed

- OL1 is initially an Android-first application.
- The first reference and physical test device is a OnePlus 13R.
- Compatible modern Android phones remain supported; OL1 is not device-specific.
- iOS is considered from bootstrap and may later be tested by three to four people.
- Android and iOS share one Expo, React Native, and TypeScript codebase.
- Web is a fixture-only visual and interaction preview.
- Web does not prove native data, permissions, builds, or device behavior.
- Product, screen, and navigation structure remain undefined.
- The existing application, data, identifiers, signing, builds, and infrastructure remain unchanged.
- `com.onel1fe.mobile` is reserved only as a possible later Android production upgrade path.

## Open

- Product structure, screens, navigation, and user flows.
- Final health metrics and permissions beyond the bootstrap steps smoke test.
- iOS HealthKit implementation and test distribution.
- Legacy data migration or a deliberate clean start.
- Production cutover, signing, store distribution, and EAS Update.
- AI, file import, background work, telemetry, and external integrations.

## Rejected

- Treating Legacy code or documentation as current product truth.
- Forking, importing, or copying Legacy history into OL1.
- A production variant during bootstrap.
- Native data access directly from screens or routes.
- Using web preview as native or device evidence.
