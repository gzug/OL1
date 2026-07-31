# Product specification

## Bestätigt

- OL1 is initially an Android-first application.
- The first reference and physical test device is a OnePlus 13R.
- Compatible modern Android phones remain supported; OL1 is not device-specific.
- iOS is considered from bootstrap and may later be tested by three to four people.
- Android and iOS share one Expo, React Native, and TypeScript codebase.
- Web is a fixture-only visual and interaction preview.
- Web does not prove native data, permissions, builds, or device behavior.
- The existing application, data, identifiers, signing, builds, and infrastructure remain unchanged.
- `com.onel1fe.mobile` is reserved only as a possible later Android production upgrade path.

## Bestätigt — structure

Settled 2026-07-31. The first build is a visual overview of both screens; nothing behind them works yet.

- Two primary screens: Home (an orbit) and Digital Twin (a scroll).
- Home: six hubs in an orbit around a center holding BioAge/PhenoAge, Weekly Insight, and Daily Focus.
- BioAge/PhenoAge is a slow drift number that moves when new bloodwork arrives. Not a daily score.
- Tapping a hub opens that hub's own state. Chat is one step further in, never the front door.
- Running and completed tests live in the Digital Twin with the ledger, not on Home. A test is
  visually dead for most of its length; the center cannot carry a static element.
- Daily Focus never competes with a running test. It either carries that test's ask for today, or
  it is disqualified and the next candidate takes its place.
- Daily Focus may repeat inside the Digital Twin alongside the insights.
- The Open Table opens from the center, highlights the hubs for selection, and opens one chat
  carrying every hub the user selected. The name is provisional.
- The user selects domains, never models. Model choice stays automatic and invisible.

## Offen

- What a hub's own state shows, and what each hub does beyond opening chat.
- Whether hub selection weights the answer or restricts what the coach may use.
- Whether domain selection is per-conversation or a longer-running context ("marathon block").
- Whether the center number shows its own uncertainty, and the final name for the Open Table.
- Final health metrics and permissions beyond the bootstrap steps smoke test.
- iOS HealthKit implementation and test distribution.
- Legacy data migration or a deliberate clean start.
- Production cutover, signing, store distribution, and EAS Update.
- AI, file import, background work, telemetry, and external integrations.

## Verworfen

- Treating Legacy code or documentation as current product truth.
- Forking, importing, or copying Legacy history into OL1.
- A production variant during bootstrap.
- Native data access directly from screens or routes.
- Using web preview as native or device evidence.
- A user-facing model picker anywhere in the app, including settings.
- A hub overview that is a score page, and a hub whose front door is an empty chat.
