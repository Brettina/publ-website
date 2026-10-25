---
name: legal-check
description: Scans this website (a German book publisher's static site) for legal-compliance risk under current EU and German law, before a new or changed feature ships. Trigger this proactively — not only when explicitly asked for a "legal check" — any time work touches pricing or discounts, payments or checkout, collecting any personal/customer data, cookies or tracking/analytics, accessibility, or consumer-facing legal text (Impressum, Widerruf, Datenschutz, AGB). Also trigger on direct requests like "ist das rechtlich okay", "legal check", "Rechtsrisiko prüfen", "scan for compliance issues", or similar. Always searches the web for the CURRENT state of the relevant law rather than relying on built-in knowledge, because the whole point is catching law that changed since the last scan.
---

# Legal compliance scan (EU/DE)

## Why this exists

This site deliberately sits in a specific legal position: it sells books
without being a "real" live-payment Onlineshop (see `DOCUMENTATION.md`,
section "Rechtsstatus des Webshops"), and it handles Buchpreisbindung
(German book price fixing) very deliberately (see `DOCUMENTATION.md`,
section "Buchpreisbindung"). Both of those positions are easy to
accidentally break with an innocuous-looking feature — a new button, a
new form field, a new embed — months after the original reasoning was
worked out and forgotten. This skill's job is to catch that before it
ships, and to keep itself current, because German/EU digital-commerce law
changes often enough that a scan from a year ago can no longer be trusted
(a concrete example: the Barrierefreiheitsstärkungsgesetz, Germany's
digital accessibility law, only became binding for many online businesses
in June 2025 — a site built before that date needs a deliberate check
against it, not just copy of what used to be true).

Two things this skill does NOT do: it does not change code, and it does
not replace a real lawyer for anything genuinely high-stakes. It flags
risk with reasoning and sources so the user (or Claude in a follow-up
turn) can decide what to do about it.

## Step 1 — figure out which mode you're in

Read `LEGAL_SCAN_LOG.md` at the repo root.

- **No entries yet, or the user explicitly asks for a "full"/"baseline"
  scan** → **full mode**: check the whole site against every relevant
  legal area listed below.
- **At least one entry exists, and this run was triggered by a specific
  new/changed feature** → **delta mode**: don't redo the full historical
  review. Instead, for each legal area that's actually relevant to what
  changed, search specifically for what's changed in the LAW itself since
  the most recent log entry's date (new statutes, amendments, relevant
  court rulings — e.g. BGH decisions on the Buttonlösung, new
  Aufsichtsbehörde guidance on cookies/consent, DSGVO enforcement
  trends), and separately check whether the new feature itself complies
  with the law as it already stood. Both matter: a feature can violate a
  rule that was always there just as easily as it can be caught out by a
  rule that's brand new.

Either way, start by understanding what's actually changing. Read the
relevant diff/files, or ask what the new feature does if it's not
obvious from context, before deciding which of the legal areas below
even apply — don't burn a web search on Barrierefreiheit for a change
that only touched backend pricing logic, for instance.

## Step 2 — the relevant legal areas

For full mode, go through all of these. For delta mode, only the ones
plausibly touched by the change (most changes only touch one or two).
For every area you check, **actually search the web for its current
state** — don't answer from memory. Use the current year in search
queries. A couple of good query patterns: "<Gesetz/Thema> aktuelle
Rechtslage <year>", "<Gesetz> Änderung <year>", "<specific question> BGB
Urteil <year>".

- **Buchpreisbindungsgesetz** (DE) / vergleichbares Gesetz (AT) — fixed
  book prices, the Mängelexemplar/Werkstattexemplar exception, no
  disguised discounting. Cross-check against `DOCUMENTATION.md`
  "Buchpreisbindung" and the memory files `project_buchpreisbindung_*`
  for what's already been decided — you're checking for NEW drift, not
  re-litigating settled decisions, unless the law itself changed.
- **Fernabsatzrecht / Buttonlösung** (§ 312j BGB, Art. 246a/246c EGBGB) —
  this site's checkout is an intentional email-request flow designed to
  stay outside the automated-ordering-process trigger for the
  Buttonlösung (see `DOCUMENTATION.md` "Rechtsstatus des Webshops" and
  memory `project_payment_legal_positioning`). The check here is whether
  anything new still respects that boundary (does the live cart/checkout
  trigger a payment or a binding order by itself?), not whether the site
  meets full Onlineshop-button requirements — it's explicitly not trying
  to.
- **DSGVO/GDPR + TTDSG** — any new data collection (forms, fields),
  cookies, analytics, third-party embeds (fonts, maps, videos, payment
  widgets) need a legal basis and, where relevant, consent + a
  Datenschutzerklärung update. Check `/regulation/privacy/`.
- **Impressumspflicht** (TMG/DDG) and **Widerrufsrecht** — is
  `/regulation/imprint/` and `/regulation/withdrawal/` still accurate and
  complete for what the site currently does.
- **Barrierefreiheitsstärkungsgesetz (BFSG)** — German digital
  accessibility law, binding for many e-commerce/digital-service
  businesses since June 2025. Specifically worth checking: does it apply
  at this site's scale, and if so, do interactive features (forms, the
  checkout modal, the morphology tool, image alt text, color contrast,
  keyboard navigation) hold up. This is the area most likely to have
  shifted since this project's older code was written, so don't skip it
  even if nothing about the current feature looks accessibility-related.
- **EU-level digital rules** (DSA, DMA, etc.) — sanity-check whether
  anything applies at this site's scale (a single-person publisher); it's
  fine to conclude "not applicable" but say why, don't silently skip it.
- **Anything else that turns up** — if a search surfaces a newly relevant
  law or ruling that isn't in this list, treat that as a real finding,
  not noise. If it looks like something that'll keep mattering on future
  runs (not a one-off), say so explicitly in the chat report and suggest
  adding it to this checklist as its own bullet — don't edit this file
  yourself. What counts as a permanent check here should go through a
  deliberate decision each time, not drift quietly from one run's
  judgment call.

## Step 3 — compare against the actual site

For each area you're checking, read the relevant live files (the checkout
form in `webpages/webshop/index.html`, the regulation pages under
`/regulation/`, cookie/consent code, any new form, etc.) rather than
reasoning about it in the abstract. A law can be satisfied in principle
and still violated by a specific implementation detail.

## Step 4 — report findings

In chat, directly to the user:

- Lead with anything genuinely risky, then lower-severity items, then
  "checked, no issue found."
- For each finding: what law/rule, what's at risk concretely, and what
  you'd recommend (without just doing it — this skill reports, it
  doesn't fix).
- Say plainly which areas you checked, which you skipped as not
  applicable to this change, and why — the next run (and the user) needs
  to trust that "not mentioned" means "checked and fine," not "forgotten."

## Step 5 — write it down

1. Append a new entry at the top of `LEGAL_SCAN_LOG.md`, following the
   format already in that file: date, mode (voll/delta), what triggered
   it, which areas were checked, a one-line summary of findings, sources.
2. For anything substantive (a real finding, a confirmed decision, a
   newly-settled legal position), add or extend a section in
   `DOCUMENTATION.md` in the same style as the existing "Buchpreisbindung"
   and "Rechtsstatus des Webshops" sections — German, direct, explains
   the *why* and the *how to apply*, so a future read of the code doesn't
   rediscover the same reasoning from scratch. Don't duplicate what's
   already documented; extend or correct it.
3. If a finding meaningfully changes or adds to what's already in this
   project's persistent memory (the `project_buchpreisbindung_*` and
   `project_payment_legal_positioning` memory files, or warrants a new
   one), update that too — that's what carries this reasoning into future
   sessions, not just this one.

Sources matter here more than in most tasks — always carry forward the
URLs from your web searches into both the chat report and the
`LEGAL_SCAN_LOG.md`/`DOCUMENTATION.md` entries, so a later read can judge
how current and how authoritative the finding actually was.
