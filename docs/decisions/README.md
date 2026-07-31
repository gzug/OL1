# Decisions

Numbered records of why something changed. Not a log of everything — the trigger is narrow:

**Write an entry when you remove or reverse a stated rule, constraint, or product decision.**

Adding things does not need one. Removing does, because a deleted reason is invisible: to the next
person, and to the next agent, absent evidence and deleted evidence look identical.

The commit message says what changed. The entry says why the previous answer stopped being right.
"refactor: simplify X" is not a reason.

## Format

`NNNN-short-slug.md`, four digits, next number wins. Keep it short:

```markdown
# NNNN — Title

Date: YYYY-MM-DD

## What changed

## Why the previous answer stopped being right

## What this costs
```

`scripts/check-change-rationale.ts` fails a pull request that removes a lot, or removes anything
from `AGENTS.md`, `CLAUDE.md`, `README.md`, or `docs/product-spec.md`, without adding an entry
here. There is no skip flag: writing the reason is the point, not a formality to route around.
