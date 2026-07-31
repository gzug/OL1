# AGENTS.md

## Sources of truth

Current source, tests, `README.md`, and `docs/product-spec.md` are authoritative. Legacy code and
history are not product truth.

## Commands

Use Node 22.13.1 and npm only.

```sh
npm ci
npm run doctor
npm run check
npm run prebuild:android
npm run prebuild:ios
```

## Definition of done

- The requested small scope is complete.
- Typecheck, lint, tests, boundary checks, sensitive-content scan, and web export pass.
- Native claims are separated into build, simulator, emulator, and physical-device evidence.
- The diff contains no generated native trees, secrets, PHI, or unrelated files.

## Operating rules

- Keep changes small; add no speculative abstractions or dependencies without a current need.
- Derive no product, screen, navigation, or data-model assumption from Legacy.
- Never commit secrets, PHI, keystores, signed builds, or real device data.
- Screens and routes never import SQLite, Health Connect, provider SDKs, or native infrastructure.
- Use CNG and reviewed config plugins; do not hand-edit generated `android/` or `ios/` files.
- Access Legacy only after explicit authorization.
- Document durable truths only. Do not add parallel checkpoint, session, memory, or skill systems.
- Both owners are non-developers. Say what changed and what it costs, in plain language.

## Working here

- Branch names start with whoever is driving: `don/<slug>`, and the agent's own name when it runs
  unattended (`claude/<slug>`). `main` takes pull requests only.
- Removing more than 200 lines from a file needs a short note in `docs/decisions/`. The commit
  message says what changed; the note says why the previous answer stopped being right.
- A rule worth having is a check. Guards have no environment-variable escape hatch — when one
  fires on something harmless, tune the guard in a visible diff.
- Before believing a new guard, feed it a known violation and watch it go red. An empty baseline
  and a blind gate look identical.
