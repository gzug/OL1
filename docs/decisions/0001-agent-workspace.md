# 0001 — Agent workspace: checks in the repository, not rules in prose

Date: 2026-07-31

## What changed

CI now runs on every branch. Three things that were prose, absent, or untested became checks:
why a change removed something, which agent produced a commit, and whether the secret/PHI scanner
still works. `check` stopped being an `&&` chain.

## Why the previous answer stopped being right

Four failures, all evidenced:

1. **CI only ran on pull requests and pushes to `main`.** The repository has never had a pull
   request, so `origin/codex/concept-lab-preview` — four commits of product thinking — has never
   had a check run against it.
2. **`13625ef` deleted 594 lines** from the concept lab under the message "refactor: simplify
   concept lab experience", with an empty body. Among the deleted lines: an experiment stop
   condition, "a private record of useful, inconclusive, and negative results", and "no conclusions
   yet — intentionally". Nothing records why.
3. **Agent authorship is unprovable.** All five commits are git-authored `gzug`, with no trailers.
   The predecessor repository does record it, in `%an` — which a squash merge overwrites, so on
   `main` that attribution is already gone.
4. **The secret/PHI scanner had no test**, while being second to last in an `&&` chain — the gate
   least likely to have run. The predecessor hit exactly this: a cosmetic gate stayed red for days
   and the secret-leak scan behind it never ran.

The general rule the predecessor proves: **prose does not enforce anything.** Its contract states
twice that a pre-push hook re-runs two gates on `ALLOW_MAIN_PUSH=1`. That string appears in those
two sentences and nowhere else in the repository — no hook is versioned, `core.hooksPath` is
empty. The rule was real, believed, and never ran. So: if it is a rule, it is a check, and the
check lives in CI where every vendor's agent hits it — not in a Claude-only hook.

## What this costs

- The rationale check is per-commit, not per-pull-request, because the cumulative diff of
  `codex/concept-lab-preview` reads `+107/-0` — the 594 deletions are invisible at branch level.
  Per-commit means a branch that deletes and then restores still gets asked.
- The 200-line deletion threshold is a guess. Tuning it is expected; say so in a new entry.
- Trailers are enforced at the merge gate, so a branch that forgot them needs an amend or a
  rebase. A `commit-msg` hook would catch it earlier — deliberately not built until this is
  actually annoying.
- Running every check instead of stopping at the first failure is slower on a red branch. That is
  the trade: a check that did not run must never look like a check that passed.

## Deliberately not built

Per-directory instruction files, `CODEOWNERS`, issue templates, a checkpoint or memory file, a
UI↔data contract, Claude-specific hooks or skills. Each was considered and each lacked a failure
to point at. Two have a named trigger:

- **A launch-checklist gate for permissive flags** — the predecessor shipped
  `SCOPE_DEV_MODE = true`, selecting the permissive branch of a clinical safety boundary, while six
  documents stated the opposite and no test asserted its value. Nothing like it exists here yet;
  build the gate the first time a boolean gates a safety behaviour.
- **Path-scoped `.claude/rules/`** — build one the first time a rule is both area-specific and not
  expressible as a check.
