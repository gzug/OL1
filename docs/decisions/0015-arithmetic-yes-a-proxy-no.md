# 0015 — Arithmetic yes, a proxy no

**Status:** accepted, 2026-08-22
**Answers a request from the owner. Delivers one half and refuses the other.**

## What was asked

On 2026-08-20 the owner asked for derived metrics from a blood panel, easiest first, and named
three: **eGFR**, **cholesterol balance**, and **insulin resistance**.

eGFR shipped the same day — `src/application/labs/egfr.ts`, CKD-EPI 2021, verified against published
calculators before it was written. Cholesterol balance ships with this note. **Insulin resistance
does not, and will not from a standard panel.**

## Why insulin resistance is refused

The measured version needs **fasting insulin**, which no ordinary panel carries and OL1 does not
collect. What people build instead is the **triglyceride-to-HDL ratio**, and from the data OL1
already holds it would be one division away.

Checked before building rather than after — the lesson `0012` cost:

- **It fails outright in African-American women.** Not "is less accurate": the association does not
  hold. A person in that group would be shown a number that means nothing about them.
- **There are no universally accepted cutoffs** for it, or for most surrogate markers of insulin
  resistance.
- **It is ethnicity- and sex-dependent**, and the published work asks for thresholds stratified by
  both before it is used.

**OL1 does not collect ethnicity, deliberately.** So the app could not know whether the number it
was showing applied to the person reading it — and a number that is silently invalid for some
readers is worse than no number, because nothing on the screen distinguishes them.

This is `0012` again in a different marker. There, the failure was extrapolating a regression below
the data it was fitted on. Here it would be applying a proxy to populations it was never valid for.
Both look like arithmetic and are not.

## The line this draws

**Compute what is arithmetic. Refuse what is a proxy.**

- Non-HDL cholesterol is `total − HDL`. No cohort, no coefficient, no cutoff, no population it fails
  in. It is worth showing because a report prints the two halves and leaves the subtraction to be
  done in somebody's head.
- The total-to-HDL ratio is one division, and laboratories usually print it themselves.

Neither needs the apparatus PhenoAge needs — a range instead of a point, a floor under CRP, a driver
list structurally incapable of carrying a number. Subtraction does not have those failure modes, and
dressing it in them would be its own dishonesty.

## What is NOT claimed

No reference range is applied and no value is called good or bad. The laboratory printed its ranges
on the report; what this adds is the number, not an opinion of it.

## If insulin resistance is wanted later

Collect **fasting insulin** and compute HOMA-IR from it and glucose. That is a real measurement
rather than a stand-in, it needs no ethnicity to interpret, and it is a panel field away — the panel
already holds seventeen markers and adding an eighteenth is `EXTRA_MARKERS` plus a parser rule.

The refusal here is of the SHORTCUT, not of the metric.
