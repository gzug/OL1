# Start here

You are not the first person on this project. This file exists so your first session does not go
into working out what the others did. It is written for someone who does not read code.

Read this once. After that, `AGENTS.md` is the file that matters, and this one can be ignored.

## What One L1fe is

An Android health app for one person. All health data lives on the phone in a local database — there
is no server, no account, and nothing is sent anywhere. iOS is kept possible but is not built. The
website you can open in a browser is **not** the product; it is a preview that renders the same
screens so we can look at them without a phone.

"OL1" is the repository, the branch prefix and the storage keys. The product is called One L1fe, and
every string a person reads says so — there is a guard that fails the build if that slips.

## What actually works

Enough that the honest summary is now "most of it, for one person, with the coaches switched off".

- **A real store.** Meals, sessions, weigh-ins, blood panels, goals, notes and conversations are
  saved and read back. SQLite on a phone, `localStorage` on the web preview.
- **The first minute.** `/welcome` asks six screens of questions and every answer is written for
  real. Anybody can walk it again.
- **Home** is a ring of hubs around a Digital Twin, with a chat bar underneath and a drawer of
  earlier conversations behind the word **Chats**, top-left.
- **A biological age that is calculated, not typed.** Add a blood panel and the Levine PhenoAge
  number on the Twin moves. `/bio-age-method` shows exactly which values it used.
- **The Digital Twin** draws a body whose muscles tint by what you logged, over a ledger of
  everything that has happened.
- **Hubs are yours.** Create one from the `+`, put one away, bring it back. Nothing is ever deleted.
- **Settings** — eleven rows in three groups at `/settings`, reached from the gear in the drawer.
- **Strava history** imports from a CSV export.

## What is deliberately switched off or not built

Knowing which is which saves a session. **The first one is not a defect and must never be raised as
outstanding work.**

- **The coaches do not answer.** The Gemini key is deliberately unset, and the not-configured line
  you see is intended. `docs/decisions/0010` settles it.
- **No accounts, no server, no subscription.** Settings shows where they will live, marked *Not yet*.
- **Nothing is sent to you.** No notifications, no email.
- **Dark mode is unreachable.** The palette exists and nothing can switch to it.
- **A photographed lab report cannot be read.** Panels are typed in. `docs/decisions/0011`.

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

It runs nine things and tells you which passed. All nine have to be green. It takes about a minute.
You do not need Android Studio or a phone for any of this.

**Two things about the checks that will otherwise cost you an hour.** CI runs twice per commit: the
**push** run builds your branch alone, and only the **pull_request** run reflects what actually
merges. If one passes and the other fails, the break is not yours. And a green check is not a
review — open the deployed screen before calling anything done. Every screen here has shipped a
defect that no gate could see.

## Where you could pick up

Real options, none of them claimed. Say which one in a draft pull request so the others see.

1. **Give One L1fe somewhere to keep a preference.** There is no key-value store at all, which is
   why dark mode cannot be switched on and why the Appearance row does not exist. Small, unblocks a
   thing the owner asked for, and it would render half the design system for the first time. Needs
   the owner's go-ahead first, because it touches the database schema.
2. **Tell the coaches who they are talking to.** The biggest hole in the product: a person's year of
   birth, height and goals reach **no coach at all**, and the general chat on Home is told it knows
   nothing about them. One file, and one very careful paragraph inside it — read
   `docs/decisions/0013` before touching the wording.
3. **Let somebody take their data out.** The one thing worth having from the previous app's settings
   that is not a claim with nothing behind it.

## Working next to each other without collisions

Three habits, and the full version lives in `AGENTS.md`:

- **Open a draft pull request with your first commit**, not when you are finished. The list of open
  pull requests is how the others see what you are on. There is no status file, on purpose — a file
  someone has to update by hand is wrong the moment they forget.
- **Two open pull requests never change the same file.** If you need a file that someone else's open
  pull request touches, wait for theirs to land.
- **Sessions share one `.git`.** Branch into a worktree rather than fighting over `HEAD`.

To see what is happening right now, do not read a document — run:

```sh
git fetch origin main && git log --oneline origin/main -5
```

and look at the open pull requests on GitHub. Those two are always true. A document can go stale —
this one did, for about three weeks, which is why it now says what is switched off as carefully as
it says what works.

## Where the rules actually live

| File | What it holds |
| --- | --- |
| `AGENTS.md` | The whole operating contract. Every agent reads it. If something here disagrees with it, it wins. |
| `docs/product-spec.md` | What is settled, what is still open, what we rejected. |
| `docs/decisions/` | Why an earlier answer stopped being right. Written when we remove or reverse something. |
| `README.md` | Setup, variants, folder layout. |

Your coding agent reads `AGENTS.md` automatically. You do not have to paste rules into it.
