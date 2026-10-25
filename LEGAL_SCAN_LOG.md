# Rechtlicher Scan-Log

Dünner, datierter Index: wann wurde zuletzt geprüft, im welchem Modus
(voll/delta), was geprüft und was gefunden. Die eigentlichen Details zu
jedem Fund stehen in `DOCUMENTATION.md` (Abschnitte "Buchpreisbindung",
"Rechtsstatus des Webshops" usw.) — hier nur die Kurzfassung, damit die
`.claude/skills/legal-check`-Skill weiß, wann der letzte Scan war und wo
sie die letzte Delta-Grenze ziehen muss.

Neuester Eintrag zuerst.

<!-- Neue Einträge hier oben einfügen, Format:

## YYYY-MM-DD — Modus (voll/delta) — Anlass
- Geprüfte Bereiche: ...
- Ergebnis: ...
- Quellen: ...

-->

## 2026-10-25 — voll — erster Baseline-Scan nach Einrichtung der Skill

- Geprüfte Bereiche: Buchpreisbindung, Fernabsatzrecht/Buttonlösung,
  DSGVO/TTDSG (Cookies + localStorage), Impressumspflicht,
  Widerrufsrecht, Barrierefreiheitsstärkungsgesetz (BFSG), EU DSA/DMA.
- Ergebnis:
  - 🟡 Impressum listet nur E-Mail als Kontaktweg — rechtlich fragil,
    Empfehlung: bestehendes Kontaktformular dort verlinken/erwähnen.
    **Umgesetzt** (noch am selben Tag): `/regulation/imprint/` verlinkt
    jetzt zusätzlich auf `/#contact`.
  - 🟡 BFSG: Kleinstunternehmen-Ausnahme gilt nur für
    Dienstleistungen, nicht für die hier verkauften Produkte (Bücher/
    Merch). Vermutlich Übergangsfrist bis 2030 (Produkte/Dienstleistungen
    vor dem 28.06.2025 am Markt) — nicht dringend, aber vor 2030 aktiv
    prüfen (Alt-Texte, Tastaturbedienbarkeit, Kontraste, Formulare).
  - 🔵 Buchpreisbindung: Referentenentwurf (Okt. 2024) zur Verschärfung
    bei Online-Vermittlungsplattformen — Verabschiedungsstatus unklar
    (Stand Lobbyregister Juni 2026). Zielt auf Vermittlungsplattformen,
    nicht auf Direktverkauf eines Verlags — vermutlich nicht einschlägig,
    beim nächsten Scan Status erneut prüfen.
  - 🟢 Keine Tracking-/Analytics-Skripte im Code gefunden — Aussagen auf
    Cookie-/Datenschutzseite sind faktisch korrekt. Kleinigkeit:
    Cookie-Seite erwähnt nur "Cookies", nicht explizit "lokaler
    Speicher" (localStorage/Warenkorb) — kosmetisch, keine Pflicht, da
    inhaltlich ohnehin durch die "technisch notwendig"-Ausnahme gedeckt
    (DSK-Leitfaden 2024 bestätigt das für Warenkörbe ausdrücklich).
  - 🟢 Fernabsatzrecht/Buttonlösung-Positionierung weiterhin sauber
    (bereits am selben Tag im Rahmen der SumUp-Integration geprüft).
    Widerrufsbelehrung vollständig, folgt Standardmuster.
  - ⚪ EU DSA/DMA: nicht einschlägig bei dieser Seitengröße.
- Quellen:
  - [E-Mail-Pflichtangabe im Impressum – e-recht24.de](https://www.e-recht24.de/news/haftunginhalte/7641-impressumspflicht-e-mail-adresse-oder-kontaktformular-im-impressum.html)
  - [Barrierefreiheitsstärkungsgesetz – IHK Karlsruhe](https://www.ihk.de/karlsruhe/fachthemen/recht/internetrecht/fallback1433495812828/bfsg-6348406)
  - [BFSG Kleinstunternehmen-Ausnahme – IHK Bonn](https://www.ihk-bonn.de/fileadmin/dokumente/Downloads/Recht_und_Steuern/Recht_Allgemein/Barrierefreiheitsstaerkungsgesetz.pdf)
  - [Cookie-Banner-Pflicht nach TTDSG/TDDDG – nexvyra.de](https://nexvyra.de/fakten/cookie-banner-ttdsg.html)
  - [Änderung des Buchpreisbindungsgesetzes – Bitkom](https://www.bitkom.org/Bitkom/Publikationen/Aenderung-des-Buchpreisbindungsgesetzes)
