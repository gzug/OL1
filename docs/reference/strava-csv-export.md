# Reading a Strava CSV export

**Salvaged from Legacy `apps/mobile/scripts/genStravaDemoSeed.py` on 2026-08-21, before that file was
purged from its repository.** The script itself held a real person's training history and had to go;
this is the part worth keeping, and it contains no data.

The mapping below was **verified against a real German Strava export**, not read off documentation.
That is the whole value of it: two of these columns are traps that cost a day each to find.

## Getting the file, as a person does it

Strava does not offer this from the mobile app. It is on the website, and it arrives by email:

1. strava.com → your picture, top right → **Settings**
2. **My Account** → scroll to **Download or Delete Your Account**
3. **Get Started** → **Request your archive** under step 2 (*not* step 3, which deletes)
4. An email arrives with a ZIP, usually within a few hours. It can take a day.
5. Inside the ZIP: `activities.csv`

The archive holds far more than activities — GPS files, photos, messages, profile. **Only
`activities.csv` is wanted here**, and nothing else in it should be uploaded anywhere.

## The columns, 0-based

| Column | German header | Field |
| ---: | --- | --- |
| 0 | `Aktivitäts-ID` | id |
| 1 | `Aktivitätsdatum` | start — `DD.MM.YYYY, HH:MM:SS`, **local wall-clock, no timezone** |
| 2 | `Name der Aktivität` | name — free text, may contain commas and emoji |
| 3 | `Aktivitätsart` | type — a German label: `Lauf`, `Schwimmen`, `Training` |
| 16 | `Bewegungszeit` | moving time in seconds. Fully populated |
| 17 | `Distanz` (**the later one**) | metres, full precision |
| 31 | `Durchschnittliche HF` | average heart rate |
| 7 | `Max. Herzfrequenz` (**the earlier one**) | maximum heart rate |
| 34 | `Kalorien` | kcal, often empty |
| 85 | `Schritte insgesamt` | steps, empty for most non-step sports |

## The four traps

1. **There are two `Distanz` columns and only one is usable.** The early one (6) mixes kilometres
   and metres, uses a comma decimal, and has a thousands-dot trap on swims — `1.500` is a mile and
   a half or a metre and a half depending on the row. **Column 17 is unambiguous metres.**
2. **There are two max-heart-rate columns.** The earlier one (7) is the more complete.
3. **A naive split on commas destroys the file.** Dates and names are quoted and contain commas. A
   real CSV parser is mandatory.
4. **The timestamp has no timezone.** It is local wall-clock at the place the activity happened.
   Legacy's answer was to append `Z` and treat it as UTC, which is only correct because its data was
   all from one zone without DST. **That answer does not generalise** — for a real import, the date
   a person sees must come from the wall-clock string, and any instant derived from it is a guess
   until a timezone is known.

## Two more things Legacy learned

- **Duplicate rows are normal.** A watch and a phone both recording produce two entries for one
  session. Legacy deduped on `(local date, type, duration in seconds)`, which is a reasonable key:
  the same sport, the same length, the same day, twice, is one session recorded twice.
- **A short row is a broken row.** Rows with fewer columns than the highest index used were
  skipped rather than partially read.

## Why this route rather than the API

Strava's API needs OAuth and a client secret, and a secret cannot ship inside the app — that needs a
server, which OL1 does not have. The export needs none of it, works on any platform, and carries the
full history rather than a rate-limited window.

The owner also reports that what Strava writes to Health Connect is vague rather than
session-accurate, so the pipeline already planned for the phone does not remove the need for this.
