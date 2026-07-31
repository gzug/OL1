# Decisions

Short notes on why something was removed. Not a log of everything, and not a policy — a prompt at
the moment you still remember the reason.

**Write one when a change removes a lot** (more than 200 lines from a single file). CI asks for it
and hands you the filename to copy.

Adding things needs nothing. Removing does, because a deleted reason is invisible: to the next
person and to the next agent, absent evidence and deleted evidence look identical.

The commit message says what changed. The note says why the previous answer stopped being right.
"refactor: simplify X" is not a reason.

## How

```sh
cp docs/decisions/TEMPLATE.md docs/decisions/0002-short-slug.md
```

Four digits, next free number, lowercase slug. Keep it to a few sentences — a paragraph you would
say out loud is better than a page nobody finishes.

## What this gate is and is not

Both owners approve their own pull requests, so this gate is opened by the same person it
constrains. That is fine and intended. It is a reminder at the right moment, not an approval step,
and it is worth having for exactly that.

If it fires on something harmless, the fix is to raise the threshold in
`scripts/change-rationale.ts` — in a diff someone can see. Never add a way around it.
