# 0001 — Agent workspace: checks in the repository, settings for the rest

Date: 2026-07-31

## What changed

CI runs on every branch. `check` stopped being an `&&` chain. Two things that were untested or
absent became checks: whether a change removed a lot without saying why, and whether the
secret/PHI scanner still works.

The rest of the two-person workflow is repository settings, not files. Settings apply to every
vendor's agent and cannot drift from prose.

## Why the previous answer stopped being right

Three failures, all evidenced:

1. **CI only ran on pull requests and pushes to `main`.** The repository had never had a pull
   request, so `origin/codex/concept-lab-preview` — four commits of product thinking — had never
   had a check run against it.
2. **`13625ef` deleted 594 lines** from the concept lab under the message "refactor: simplify
   concept lab experience", with an empty body. Among the deleted lines: an experiment stop
   condition, "a private record of useful, inconclusive, and negative results", and "no
   conclusions yet — intentionally". Nothing records why.
3. **The secret/PHI scanner had no test**, while sitting second to last in an `&&` chain — the
   gate least likely to have run. The predecessor hit exactly this: a cosmetic gate stayed red for
   days and the secret-leak scan behind it never ran.

The general rule the predecessor proves: **prose enforces nothing.** Its contract states twice
that a pre-push hook re-runs two gates on `ALLOW_MAIN_PUSH=1`. That string appears in those two
sentences and nowhere else in the repository — no hook is versioned, `core.hooksPath` is empty.
The rule was real, believed, and never ran.

## Numbers we guessed

Recorded here so tuning them later is routine rather than a debate.

- **200 lines** — the single-file deletion that triggers a decision note. Chosen because `13625ef`
  deleted 594 and the largest legitimate deletion in this repository's history is far smaller. If
  it fires on ordinary work, raise it.
- **60 lines** — the combined cap on `AGENTS.md` + `CLAUDE.md`, currently at 53. Bloated
  instruction files get ignored rather than followed; the cap exists so growth is a visible
  decision.

Both live in code, both are one-line changes, both must move in a diff someone can see. Guards
never get an environment-variable bypass — the predecessor's `VALIDATE_EXPECT_RED` became the
masking bug it was added to route around.

## Considered and cut

- **A commit trailer naming the agent vendor.** Built, then removed before merge. Two scripts and
  a test suite wrote a field nothing downstream reads and no decision depends on — the same defect
  the predecessor review flagged in `focus_choice_log`: written, capped, never read. Half its
  purpose was that squash-merge destroys the author field; **rebase merge** fixes that directly —
  it lands each commit on `main` with its author intact and adds no merge nodes, so history stays
  readable at agent commit volume. **Which human** made a change is what matters now, and the
  author field already carries that.
- **A second trigger on the rationale check** — any deleted line in `AGENTS.md`, `README.md`, or
  `docs/product-spec.md`. It would have demanded a decision record for a fixed typo. A guard that
  goes red without cause gets routed around.
- Per-directory instruction files, `CODEOWNERS`, issue templates, a checkpoint or memory file, a
  UI↔data contract, Claude-specific hooks or skills, a local `commit-msg` hook. None had a failure
  to point at.

## Deferred, with the trigger named

- **A launch-checklist gate for permissive flags.** The predecessor shipped `SCOPE_DEV_MODE = true`
  — the permissive branch of a clinical safety boundary — while six documents stated the opposite
  and no test asserted its value. Nothing like it exists here yet and `requireAppVariant` already
  fails closed. Build the gate the first time a boolean gates a safety behaviour.
- **Path-scoped `.claude/rules/`.** Build one the first time a rule is both area-specific and not
  expressible as a check.
- **A required-reviewer rule.** With two people it is a bottleneck for no safety gain.

## What this costs

- Running every check instead of stopping at the first failure is slower on a red branch. That is
  the trade: a check that did not run must never look like a check that passed.
- The rationale check is opened by the same two people it constrains. It is a reminder, not an
  approval step, and is worth having as one.
- Rebase merge instead of squash means `main` carries every individual commit. Accepted: that is
  how authorship survives, and it is why squash merging is turned off. Merge commits stay enabled
  for the occasional case that genuinely wants one; rebase is the default.
