# Product specification

Section headings were `Bestätigt` / `Offen` / `Verworfen` until 2026-08-03. They are English now
because the owner asked for English, and because this is the document he reads to check that the
product being built is the product he asked for.

## Confirmed — platform

- OL1 is initially an Android-first application.
- The first reference and physical test device is a OnePlus 13R.
- Compatible modern Android phones remain supported; OL1 is not device-specific.
- iOS is considered from bootstrap and may later be tested by three to four people.
- Android and iOS share one Expo, React Native, and TypeScript codebase.
- Web is a fixture-only visual and interaction preview.
- Web does not prove native data, permissions, builds, or device behavior.
- The existing application, data, identifiers, signing, builds, and infrastructure remain unchanged.
- `com.onel1fe.mobile` is reserved only as a possible later Android production upgrade path.

## Confirmed — structure

Settled 2026-07-31, revised 2026-08-03 where the owner's answers replaced an earlier one. The
reversals are argued in `docs/decisions/0005-the-hub-model.md`.

- Two primary screens: Home (an orbit) and Digital Twin (a scroll).
- Home: hubs in an orbit around a centre.
- BioAge/PhenoAge is a slow drift number that moves when new bloodwork arrives. Not a daily score.
- Running and completed tests live in the Digital Twin with the ledger, not on Home. A test is
  visually dead for most of its length; the centre cannot carry a static element.
- Daily Focus never competes with a running test. It either carries that test's ask for today, or
  it is disqualified and the next candidate takes its place.
- Daily Focus may repeat inside the Digital Twin alongside the insights.
- The user selects domains and coaches, never models. Model choice stays automatic and invisible.

## Confirmed — hubs

Settled 2026-08-03. **Reverses** the earlier line "tapping a hub opens that hub's own state; chat is
one step further in, never the front door" — a hub now opens two things, and one of them is chat.

- **A hub opens two doors: its coach, and its cockpit.** Neither is the front door to the other.
- **The cockpit is that hub's overview** — the domain's own data across yesterday, the week, and
  further back. Every hub has one. Sleep's cockpit shows sleep; Nutrition's shows meals.
- **Every hub has exactly one coach.** Two hubs also hold other hubs: Exercise holds the coaches per
  exercise type — running, gym, cycling, swimming, golf — and Medical condition holds Labs.
- **Hubs are data, not code.** The user creates one from the `+` on the ring, or from inside a hub.
  Both are the same act and use the same flow; a nested hub is a hub with a parent.
- **The ring is Exercise, Nutrition, Medical condition, Resilience, Sleep, the Open Table, and a
  `+`** — settled 2026-08-19 when the owner re-drew it. Four things changed at once:
  - Activity became **Exercise**, its id included.
  - **Medical condition** is new, and **Labs sits inside it** — everything built for panels still
    routes through the hub id `labs`.
  - **Body was retired.** Its weigh-ins moved into Nutrition; its resting heart rate belongs to
    Resilience, which already reads it.
  - **Running and Gym stay inside Exercise**, considered for the ring and deliberately kept out, so
    Exercise remains the honest total of everything the user moves.
- **Seven is what ships, not a ceiling.** This line said "seven hubs at most" until 2026-08-19; the
  owner then asked for a `+` on the ring, which a hard cap would make a button that works once.
  Nineteen is where the geometry stops being readable, and that is a drawing limit rather than a
  product one. Coaches nested inside a hub sit outside the count.
- **The `+` is a place on the ring but not a hub.** It has no coach, no cockpit and no route; it
  opens the creation flow, and it always sits last so added hubs land before it.
- **A new hub starts with a coach and a place to log by hand.** Connecting a data source or
  uploading a file is always offered and never required. A hub reading nothing says so plainly.
- The creation flow asks its questions the way creating a project in Claude does.
- **The orbit grows and shrinks with the hub count**: circles re-space evenly and get smaller as
  hubs are added. Placement must keep clear of the centre stack at every count.

## Confirmed — the centre and the Digital Twin

Settled 2026-08-03. **Reverses** "the Open Table opens from the center".

- **The centre of the orbit is the Digital Twin** — the core idea of the app. It says so: the centre
  carries the words "Digital Twin" and nothing else.
- **Every hub is drawn connected to it**, always, not only while choosing coaches. One twin, fed by
  every domain, is the claim the orbit exists to make.
- Tapping the centre opens the Twin: PhenoAge, and **which data feeds it** — genomics, blood work,
  microbiome, wearable.
- **The drift number is not on Home.** It leads the Twin instead, where the sources that produce it
  are named directly underneath. A number in the middle of the ring made the centre a readout; the
  twin is not a readout.
- The weekly insight and the daily focus stay on Home, between the ring and the chat bar.

## Confirmed — chat

Settled 2026-08-03. **Reverses** "chat is one step further in, never the front door". Widened the
same day by the owner's answers, argued in `docs/decisions/0006-one-chat-surface.md`.

- **A persistent chat bar sits at the bottom of Home**, under the orbit. It is the quick way into
  general chat, and the bottom of Home carries the bar and nothing else.
- **Chat opens with no coach at all** — a general assistant that answers anything. A coach is
  something the user adds, not a gate they pass through first.
- **A selector inside the bar opens the coaches.** The user taps coaches to include or exclude them,
  then sends. That act is what builds an Open Table, and it works mid-conversation as well as before
  one starts.
- **At most five coaches sit at one table.** More voices in one answer stop being a conversation.
- **The Open Table is an option on the ring, among the hubs**, and it leads to the same bar. One
  chat surface, reached two ways — never two chats.
- **A conversation is kept.** It survives closing the app, and earlier conversations can be reopened.
- **The chat is a way to put data into a hub**, not only a way to ask about one: a photo stored as a
  meal, a sentence stored as an activity. Anything it captures is shown back and confirmed before it
  is written.
- **Photos, videos, files and voice notes can be sent into the chat.** What is sent is not kept: the
  conversation records that a photo was sent, its name and its size, never the photo itself. Argued
  in `docs/decisions/0007-attachments-keep-nothing.md`.
- One attachment goes with one message, and about 15MB is the most that fits in a single send.
- The bar is wired to a real model from the first version, and shows a plainly-worded
  not-configured state until its key exists.
- Fixture numbers come from the same sources Legacy used, and Legacy's own synthetic demo data is
  the source for the preview. Nothing is invented freehand and nothing comes from a real person.

## Open

- Where the morning brief and the evening resume arrive. The owner narrowed the whole generated
  message layer to those two on 2026-08-19 and did not say where they land; the Open Table is the
  standing recommendation. Both need real wearable data before they can be honest.
- Whether hub selection weights the answer or restricts what the coach may use.
- Whether the centre number shows its own uncertainty, and the final name for the Open Table.
- What a user-created hub may connect to, beyond manual entry and file upload.
- Final health metrics and permissions beyond the bootstrap steps smoke test.
- iOS HealthKit implementation and test distribution.
- Legacy data migration or a deliberate clean start.
- Production cutover, signing, store distribution, and EAS Update.
- File import, background work, telemetry, and external integrations.
- Whether a sent photo should be viewable again later, which needs a media store rather than a
  column — see `0007`.

## Rejected

- Treating Legacy code or documentation as current product truth.
- Forking, importing, or copying Legacy history into OL1.
- A production variant during bootstrap.
- Native data access directly from screens or routes.
- Using web preview as native or device evidence.
- A user-facing model picker anywhere in the app, including settings.
- A hub overview that is a score page. A cockpit shows the domain's data; it never grades it.
- **A hub whose front door is an empty chat.** A hub opens its coach and its cockpit, and the coach
  door carries the hub. Narrowed on 2026-08-03: this never meant chat itself must arrive
  pre-addressed. Home's bar opens with no coach on purpose — a general assistant you can ask
  anything is the owner's answer, and it is not the empty box this line rejects.
- A fixed set of hubs that only the developers can extend.
