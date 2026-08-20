# 0010 — The coaches stay off, and that is the finished state for now

**Status:** accepted, 2026-08-20
**Supersedes nothing. Extends `0006`.**

## Confirmed by the owner, 2026-08-20

This note was written before he had said it, which is worth admitting: it inferred the decision from
the fact that nothing had changed, and an inference recorded as a decision is how a repository comes
to believe something nobody chose. Asked directly the same day, he settled it in his own words:

> *"Let's first set up the structure and everything before making the coaches and the chat usable."*

So it is a decision now rather than an assumption. What follows was right about the substance; it
was only missing the person who gets to make the call.

## What this settles

`EXPO_PUBLIC_GEMINI_API_KEY` has no value, in Vercel or anywhere else. **That is deliberate and it
is not outstanding work.** The frame of the app is what is being built; nobody is using the chat.
The line the bar shows — *"The coaches are not switched on yet. Everything else here works; answers
do not."* — is the intended state, and `docs/product-spec.md` already asks for exactly it: the bar
is wired to a real model from the first version and shows a plainly-worded not-configured state
until its key exists.

`0006` established that a failure must never wear a success's clothes. This note records the other
half: one of those failure states is, for now, the steady state, and it is allowed to be.

## Why this note exists at all

Because the absence had no explanation attached, and an unexplained gap reads as a job someone
forgot. Every fresh session read `geminiAdapter.ts`, found a key slot with nothing in it, and
escalated it as an action item for the owner — correctly, given what the repo told it. The same
paragraph came back session after session, and the answer never changed.

That is the failure this note fixes. Not the missing key: the missing sentence.

The one trace that did exist made it worse. `src/ui/chat/messages.ts` used to say *"the key is not
in Vercel yet"*, which is a to-do wearing a comment's clothes. It now points here.

Absent evidence and deleted evidence look identical — the reason `docs/decisions/` exists. A
deliberate absence and a forgotten one look identical too, which is the reason for this one.

## What it costs

The chat cannot answer. Everything reachable without it — the orbit, the hubs and their cockpits,
the Digital Twin, logging a meal or a session, the labs upload — works and is unaffected. The wiring
behind the bar is complete and tested; it is waiting on a value, not on code.

## Switching them on, when that is wanted

Configuration, not code. The value goes wherever the build runs, because Expo's babel transform
inlines `process.env.EXPO_PUBLIC_*` at build time:

- **Web preview** — Vercel → Settings → Environment Variables, **then redeploy.** An existing
  deployment will not pick it up: the value is baked in when the bundle is built. This is the single
  most likely thing to get wrong.
- **Android** — expo.dev → Environment Variables. **Never `eas.json`**: a key committed there trips
  the Google-key pattern in `scripts/sensitive-patterns.ts`, correctly.
- **Local** — a `.env` file, already gitignored. `.env.example` names the variable.

In Google Cloud, on the key itself:

- **Restrict it to the Generative Language API.** This is the restriction that earns its keep.
- **Set no application restriction.** A key accepts exactly one type and none of them fits here.
  *HTTP referrer* is browser-only, and would break the browser too: `vercel.json` sends
  `Referrer-Policy: no-referrer`, which strips the `Referer` header from the very `fetch` the adapter
  makes, so Google would see a request with no referrer and refuse it. *Android app* verification
  relies on headers Google's client libraries send and a raw `fetch` does not. Either one produces a
  403 that looks like a broken key and costs a session to diagnose.
- **Confirm the quota cap.** With no application restriction it is the ceiling that matters.

Two conditions to re-check at that moment, because both are true today and neither is obvious:

- **The production URL answers without a login.** Vercel's protection on this project covers preview
  URLs, not the production domain. A key shipped in the bundle is readable by anyone who opens the
  page. `noindex` keeps it out of search; it is not access control.
- **Billing on the Google project should be confirmed healthy.** A delinquent account disables the
  API and returns 403, which the app renders as *"The coaches turned the question away. This is a
  setup problem, not something you did."* — a different sentence from the not-configured one, and
  the first thing to check if it appears.

You are done when a coach answers a real question on the deployed site. Not when the variable is
saved.
