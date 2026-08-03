# Start here

You are the second person on this project. This file exists so your first session does not go into
figuring out what the first one did. It is written for someone who does not read code.

Read this once. After that, `AGENTS.md` is the file that matters, and this one can be ignored.

## What OL1 is

An Android health app for one person. All health data lives on the phone in a small local database —
there is no server we run, and nothing is stored in the cloud. iOS is kept possible but is not
built. The website you can open in a browser is **not** the product; it is a preview that renders
the same screens so we can look at them without a phone.

## What already stands

- The app builds, the checks run, and everything on `main` is green.
- Two screens exist as **mockups**: a Home screen and a Digital Twin screen. Nothing behind them
  works — no data, no buttons that do anything real. They exist so we can judge the layout.
- Home is a ring of six hubs (Activity, Nutrition, Body, Mind, Labs, Sleep) around a centre that
  holds three things: a slow-moving biological-age number, one insight of the week, and one focus
  for today. A control called **Open Table** highlights the hubs so you can pick several, and opens
  one chat that covers all the ones you picked.
- The Digital Twin is a scroll: who you are, the test currently running, insights, finished tests,
  and a ledger of everything that happened.
- No health data is stored yet. The database has exactly one placeholder table.

## See it in 5 minutes

```sh
npm ci
npm run web
```

That opens the preview in your browser. `npm ci` only has to run the first time, and after someone
changes the dependencies.

To check that everything is still healthy before you hand work over:

```sh
npm run check
```

It runs six things and tells you which passed. All six have to be green. It takes about a minute.
You do not need Android Studio or a phone for any of this.

## Where you could pick up

Three real options. Pick one and say so in a draft pull request, so the other person sees it.

1. **Judge the two mockup screens.** Open the preview and answer three questions: does the centre
   of the Home screen read as *state* or as a dashboard? Does Open Table make it obvious you are
   picking topics, not settings? Is the order of the Digital Twin scroll right? Anything you decide
   goes into `docs/product-spec.md` under "Bestätigt" or "Verworfen".
2. **What a hub looks like when you tap it.** Right now tapping a hub opens a placeholder. We
   decided the front door of a hub is that hub's own state, and chat is one step further in — but
   nobody has designed what that state actually shows. This is open and unclaimed.
3. **The first real data.** Before the very first health measurement gets saved, a handful of
   details have to be captured with it, because they can never be added afterwards — when the
   measurement happened versus when we found out about it, which timezone, and whether it came from
   the phone's health app or was typed in by hand. Getting this wrong is one of the few mistakes
   here that cannot be undone. Do not start this one alone; it is worth a conversation first.

## Working next to each other without collisions

Three habits, and the full version lives in `AGENTS.md`:

- **Open a draft pull request with your first commit**, not when you are finished. The list of open
  pull requests is how the other person sees what you are on. There is no status file, on purpose —
  a file someone has to update by hand is wrong the moment they forget.
- **Two open pull requests never change the same file.** If you need a file that someone else's open
  pull request touches, wait for theirs to land. This is the rule that stops the two of you undoing
  each other's work.
- **`npm run check` green before you call anything done.** Not "it looked fine".

To see what is happening right now, do not read a document — run:

```sh
git fetch origin main && git log --oneline origin/main -5
```

and look at the open pull requests on GitHub. Those two are always true. A document can go stale.

## Where the rules actually live

| File | What it holds |
| --- | --- |
| `AGENTS.md` | The whole operating contract. Every agent reads it. If something here disagrees with it, it wins. |
| `docs/product-spec.md` | What is settled, what is still open, what we rejected. |
| `docs/decisions/` | Why an earlier answer stopped being right. Written when we remove or reverse something. |
| `README.md` | Setup, variants, folder layout. |

Your coding agent reads `AGENTS.md` automatically. You do not have to paste rules into it.
