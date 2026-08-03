# 0007 — A photo is sent, not stored

Date: 2026-08-03

## What was removed or reversed

Nothing in `docs/product-spec.md` is reversed. This records a rule the spec does not state and that a
later change could undo without noticing it was ever a decision.

`ATTACHMENTS_NOTE` is removed — the line saying "photos, videos, files and voice notes are not wired
up yet", shown when `+` or the microphone was tapped. They are wired up.

## The rule

**An attachment's bytes exist for the length of one request and are then gone.** What is kept is a
reference: kind, name, size. The transcript shows "Photo · meal.png · 2.3 MB", not the photo.

Four places enforce it rather than one, because a rule with a single enforcement point is a rule
that survives until someone edits that point:

- `AttachmentRef` in `src/core/attachments.ts` has no `bytes` field to put them in.
- Migration 3 adds `attachment_json TEXT`, and `tests/storage-schema.test.ts` asserts the migration
  mentions no BLOB.
- `tests/attachments.test.ts` asserts `toRef` returns exactly three keys.
- Verified on the running preview: after sending a photo, `localStorage` held
  `{"kind":"image","name":"meal.png","sizeBytes":70}` and no base64 anywhere.

## Why

A photo of a meal is health data about a person. The alternative — keeping it so the transcript can
show a thumbnail on the next open — puts that photo in a browser's `localStorage` or a phone's chat
table, where it outlives the question it answered, in a place nobody chose and few would find. The
feature it buys is a thumbnail.

The same reasoning is already in the repository from the other direction: `0006` refused to persist
the *failure* copy because a stored sentence outlives its moment and changes meaning. This is that
argument applied to bytes, where the stakes are higher.

## What this costs

- **An earlier photo cannot be re-sent, and the model never sees it again.** `ChatRequest` carries
  an attachment for the current message only, and the comment on that field says why: history with
  attachments would look like context the model has and does not.
- **No thumbnails, ever, without reversing this.** If the owners want to see the photo they sent,
  that is a real request and it needs a real answer — a media store with its own lifetime and its
  own deletion, not a column quietly growing bytes.
- **A byte-for-byte handoff between two screens now exists in memory.** Home's bar persists the
  question and navigates; the bytes cannot travel that way, so `holdForHandoff` / `takeHeld` carry
  them across the one navigation. It is taken exactly once — asserted — so a reopened thread cannot
  re-send an old photo.

## Fifteen megabytes is a real ceiling, not a preference

Gemini's `generateContent` accepts roughly 20MB inline. Anything larger needs the **Files API**,
which is **not built**. So a longer video is refused with a sentence naming the limit, rather than
failing at send. That is the one part of "video" that is not finished, and it is named here rather
than left to be discovered.

## Two things `expo-audio` forced

- **Recording is built from `AudioModule.AudioRecorder` imperatively, not from `useAudioRecorder`.**
  The hook is the documented path and it is the wrong one here: a hook can only be called from a
  component, and components live in `src/ui/`, which may not import native modules. The guard now
  lists `expo-audio` for exactly this reason, and was watched going red against a probe file
  importing the hook into `src/ui/chat/`.
- **`setAudioModeAsync({ allowsRecording: true })` before recording, and `false` after.** Without the
  first, iOS produces a silent file — which is the worst failure available, because it looks like it
  worked. Without the second, later playback routes to the earpiece and sounds like broken volume.

## Not verified

**Every native path.** The camera, the media library, the document picker and the device microphone
are unverified: there is no device here, and CI runs the web export. What *was* driven end to end in
the browser: picking a real file, reading it, base64-encoding it, the composer chip, sending, the
transcript row, the request reaching the model, and the microphone's permission-denied path
rendering its sentence instead of hanging.

`toBase64` is written out rather than taken from a package — `btoa` is not in Hermes — and is tested
against Node's own encoder across every padding case and across the chunk boundary, which is where a
hand-rolled chunked encoder goes wrong.
