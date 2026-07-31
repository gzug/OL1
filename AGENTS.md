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

## Commits and removals

- Every commit carries an `Agent:` trailer (`claude-code`, `codex`, `gemini`, `none`). The author
  field does not survive a squash merge; a trailer does.
- Removing a stated rule, constraint, or product decision needs an entry in `docs/decisions/`.
  The commit message says what changed; the entry says why the previous answer stopped being right.
- A rule worth having is a check. Guards have no environment-variable escape hatch — an exemption
  belongs in a diff someone can review.
- Before believing a new guard, feed it a known violation and watch it go red. An empty baseline
  and a blind gate look identical.
