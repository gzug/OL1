# 0011 — Reading a report automatically waits for the phone

**Status:** accepted, 2026-08-20
**Supersedes nothing. Sits beside `0010`.**

## What the owner decided

He asked for a frictionless uploader: photograph a lab report, have it read, have the units handled
whatever country the laboratory is in, no typing. Then, on being shown what each route would cost,
he settled it himself:

> *"For me the upload is a lot more important on the apps later on than now. So maybe we just keep
> what we have in terms of the upload and remember to execute on it later when we finalize the app."*

So: **the lab screen stays manual entry for now.** Automatic reading is deferred to the phone, not
abandoned, and this note is the reminder.

## Why the reasoning is right

Photographing a report is a phone gesture. On a laptop the same act is uploading a file you already
have, and the friction being removed barely exists there. The feature is worth most in exactly the
place it cannot yet run.

## What it would have cost, and why that mattered

Reading a report takes three steps: getting text off the page, finding the markers, and reading the
units beside them. The second and third are built (below). The first has only three routes, and
each collides with something already decided:

- **A vision model.** Best result — a photo, a scan, any layout, any language. It uses the same
  `EXPO_PUBLIC_GEMINI_API_KEY` that `0010` deliberately leaves unset. Turning it on for reading
  while the coaches stay off is possible — one key, two features, gated separately — but it makes
  the key live and metered.
- **On-device OCR.** Legacy's route (`services/ocrService.ts`, ML Kit). No key, no cost, nothing
  leaves the device — and it is Android-native, so it needs the Expo build that has not been made.
- **PDF text.** Works today with no model, but only for a digital PDF, and fails on a photo or a
  scan. A dependency for half the cases.

**When the phone exists, the choice gets easier rather than harder**: on-device OCR needs no key, no
quota and no network, which is the right shape for a page of somebody's blood results.

## What is already built, and is not wasted

- **`src/application/labs/units.ts`** — every clinical conversion, defined once. A German panel
  reports albumin in `g/L`, creatinine in `µmol/L` and glucose in `mmol/L`; typed raw those are out
  by ten, 88.4 and 18.
- **`src/application/labs/parseReport.ts`** — finds the nine markers in report text, in German and
  English, and **reads the unit printed beside each value rather than assuming one**. Legacy assumed
  a default and said so in a comment; that assumption makes an ordinary albumin read ten times too
  high, and the age built on it wrong in a way that looks reasonable.
- The **Verification Gate** on the lab screen, which the owner confirmed he wants kept when the
  reading is automatic: *"keep the check"*. Pre-filled numbers glanced at and approved is not
  friction; a misread value nobody saw is.

Text in, findings out — so whichever route supplies the text later, the rest is done.

## The trigger

**When the app runs on the OnePlus.** At that point: port Legacy's `ocrService.ts`, feed its text to
`parseReport`, pre-fill the review table, and leave the gate exactly where it is.
