# Projekt-Dokumentation: publish-Lohr Website

Diese Datei sammelt Design-Entscheidungen, Eigenheiten und Stolperfallen dieses
Projekts — geschrieben, damit sowohl Menschen als auch eine KI (Claude) beim
nächsten Mal schnell verstehen, **warum** etwas so gebaut ist, wie es gebaut
ist, bevor sie es "reparieren" oder ändern.

Diese Datei ist ein lebendes Dokument. Wenn du eine nicht-offensichtliche
Entscheidung triffst oder eine Falle findest, trag sie hier nach.

## Überblick

Statische Website ohne Build-Step im Browser: reines HTML/CSS/Vanilla-JS.
Inhalte kommen größtenteils aus JSON-Dateien unter `assets/`, die entweder
von Hand gepflegt oder von Node-Skripten unter `assets/tools/*.mjs`
generiert werden. Gehostet vermutlich über Cloudflare Pages (siehe
`functions/api/hipster-mail.js`).

## Wichtige Datenquellen — welche ist generiert, welche ist von Hand gepflegt?

Das ist die größte Falle im Projekt: **gleich aussehende Dateien haben
unterschiedliche "Herkunft"**. Bevor du eine JSON-Datei änderst, prüfe, ob
sie generiert wird — sonst überschreibt der nächste Skript-Lauf deine Änderung
(oder umgekehrt: du bearbeitest eine Datei, die eigentlich generiert werden
sollte, und wunderst dich, warum sich nichts synct).

| Datei | Herkunft | Generator |
|---|---|---|
| `assets/products.json` | **generiert** | `assets/tools/generate-products.mjs` (liest `assets/shop/<slug>/meta.json` + alle Bilder im Ordner) |
| `assets/work-index.json` | **von Hand gepflegt** | keiner — es gibt kein Skript dafür. Wenn sich `assets/work/<slug>/meta.json` ändert (z. B. Titel), muss `work-index.json` manuell nachgezogen werden. |
| `assets/blog-index.json`, `assets/projects-index.json`, `assets/activities-index.json` | generiert | `assets/tools/generate-indexes.mjs` |
| `assets/calendar/calendar-index.json` | **von Hand gepflegt** | keiner, absichtlich. Das ist die einzige Kalenderdatei; der Kalender auf der Startseite und die "Neues"-Galerie lesen genau diesen Pfad. |

**Historische Notiz:** Es gab früher zusätzlich `assets/calendar-index.json`
(Top-Level, leer, von `generate-indexes.mjs` erzeugt) und eine
`buildCalendarIndex()`-Funktion, die einzelne `*.json`-Dateien im Ordner
`assets/calendar/` zu dieser Top-Level-Datei zusammenführen sollte. Das war
nie an die eigentliche Kalender-UI angeschlossen — niemand hat diese Datei
je gelesen. Beides wurde entfernt (Datei gelöscht, Funktion aus dem
Generator entfernt), damit es nur noch die eine echte Quelle gibt:
`assets/calendar/calendar-index.json`.

## Design-Entscheidungen dieser Session

### Webshop: Merch in den Buchshop integriert statt neue "Hipster"-Seite gebaut

`assets/products.json` (Bademantel, Socken, T-Shirt) wurde von **keiner**
existierenden Seite angezeigt. Der Code dafür (`pages.json` + `site.js`
`renderStore()`) ist auf eine "hipster"-Seite ausgelegt
(`productsFromPages: ["hipster"]`), aber `/webpages/hipster/` existiert nicht
als echte Route. Gleichzeitig hatten die Produkte in `products.json` das Feld
`"page": "webshop"` — ein Mismatch, der dafür sorgte, dass selbst wenn man
`renderStore` irgendwo aufrufen würde, nichts passt.

Entscheidung (mit dem Nutzer abgestimmt): Merch-Produkte in die bestehende
Buchshop-Seite (`webpages/webshop/index.html`) integrieren, statt die fehlende
Hipster-Seite zu bauen. Der Buchshop lädt jetzt zusätzlich `products.json`
(`loadMerchProducts()`) und mischt Merch und Bücher in dieselbe
durchsuchbare/sortierbare Liste.

**Der `pages.json`/`site.js`-`renderStore()`-Pfad ist damit weiterhin toter
Code** — keine Seite im Repo hat `data-page="hipster"` (oder überhaupt ein
`data-page`-Attribut am `<body>`). Nicht angefasst, da außerhalb des
angefragten Scopes. Falls das später gebraucht wird: entweder eine echte
`/webpages/hipster/`-Seite bauen, die `data-page="hipster"` setzt und
`#header-slot`/`#footer-slot`/`initSite()` nutzt, oder den toten Code entfernen.

### Mehrere Bilder pro Produkt: Slider statt nur erstes Bild

`generate-products.mjs` wählte früher nur das alphabetisch erste Bild pro
Ordner (`pickFirstImage`). Das war der Hauptgrund, warum z. B. bei den Socken
nur ein Foto sichtbar war, obwohl 7 Fotos im Ordner lagen. Jetzt sammelt
`listImages()` alle Bilder und schreibt sie sortiert in ein `images[]`-Array
(zusätzlich zu `image` = erstes Bild, für Rückwärtskompatibilität mit
`site.js`, das nur `p.image` kennt).

Für die Anzeige gibt es eine kleine handgeschriebene Galerie-Komponente
(`buildGallery()` in `webpages/webshop/index.html`) — Pfeile, Punkte,
Touch-Swipe. Bewusst **keine externe Library**, um den Rest der Seite (kein
Build-Step, keine npm-Abhängigkeiten im Browser) konsistent zu halten.

### Preise: `meta.json` → `generate-products.mjs` → `products.json` → Webshop

Preise werden in `assets/shop/<slug>/meta.json` als `"price": <Zahl>` gepflegt,
vom Generator nach `products.json` übernommen und im Webshop automatisch
angezeigt — die bestehende Preis-Rendering-Logik (für Bücher mit
Print/E-Book-Preisen gebaut) funktioniert für einfache Merch-Preise ohne
Änderung, weil `getUnitPriceForVariant()` ohnehin auf `p.price` zurückfällt,
wenn keine Variante "e-book"/"digital" heißt.

### Kalender-Fotos: Datums-Ordner + manuelles `photos`-Array statt Auto-Scan

Für Event-Fotos wurde **kein** neuer Generator gebaut, der Ordner scannt
(wie es `generate-products.mjs` für Shop-Bilder tut). Stattdessen: Ordner
`img/kalender/<datum>/` angelegt (aktuell nur mit `.gitkeep`, da noch keine
echten Fotos existieren) und ein leeres `"photos": []`-Array pro Event in
`assets/calendar/calendar-index.json`. Sobald Fotos in einen Datums-Ordner
gelegt werden, müssen ihre Pfade **von Hand** ins `photos`-Array der
jeweiligen Kalender-Zeile eingetragen werden.

Warum nicht automatisch scannen? `calendar-index.json` (verschachtelt) ist
die einzige von Hand gepflegte Datei im ganzen Projekt, die *auch* durch ein
Skript ergänzt werden müsste — das hätte eine neue Merge-Logik gebraucht
(Ordner scannen, aber Titel/Notizen/Tags nicht überschreiben). Für den
aktuellen Umfang (ein paar Events, keine Fotos vorhanden) war das
Mehraufwand ohne sofortigen Nutzen. Falls das Fotovolumen wächst, lohnt sich
ein `generate-calendar-photos.mjs` nach demselben Muster wie
`generate-products.mjs`.

### "Neues"-Galerie auf der Startseite: fest 3 Werke + 1 vergangenes Event

Auf Wunsch begrenzt: die letzten 3 `work-index.json`-Einträge (nach
`updated` sortiert) plus das chronologisch nächstliegende **vergangene**
Kalender-Event (Datum ≤ heute) mit Titel/Notiz/erstem Foto als Cover. Klick
auf die Event-Karte öffnet **nicht** das Artikel-Modal (das für Werke gedacht
ist), sondern springt zum Kalender-Abschnitt und öffnet dort automatisch den
passenden Tag.

Technisch verbindet ein globaler Hook die beiden unabhängigen `<script>`-
Blöcke (Kalender-IIFE und Galerie-IIFE), die sonst keinen gemeinsamen Scope
haben: `window.publishLohrCalendar.goToDate(dateStr)` wird vom Kalender-Skript
gesetzt und von der Galerie aufgerufen.

**Bekannte Konsequenz:** Solange kein Event-Datum in der Vergangenheit liegt
(Stand dieser Session: alle 7 Termine liegen in der Zukunft), zeigt die
Galerie nur 3 Werke, keine Event-Karte. Das ist kein Bug, sondern Ergebnis
der "nur vergangene Events"-Logik.

### Header/Footer vereinheitlicht — drei verschiedene Marken-Identitäten gefunden

Beim Aufräumen der kaputten Nav-Links fiel auf: das Repo enthält Reste von
**drei verschiedenen historischen Marken-Konzepten**, übereinandergelagert:

1. *"Weichware Lohr"* — ein Multi-Persona-Freelancer-Konzept
   (Engineer/Hipster/Social worker/Consulting/Expert). Existiert nur noch in
   `pages.json` + den toten `site.js`-Funktionen (`renderStore`,
   `renderServices`, `renderTimeline`) + der alten Version von
   `assets/partials/header.html`. Keine einzige Seite hat das je benutzt.
2. *"Bettina Lohr, M.Sc."* — ein Personen-Portfolio-Konzept. Steckte im alten
   Header von `webpages/blog/index.html`, mit Links zu `/webpages/about/`,
   `/webpages/projects/`, `/webpages/leistungen/` — keine davon existiert.
3. *"publish-Lohr"* — das aktuell tatsächlich lebende Konzept (Bücher/Shop):
   `index.html`, `webpages/webshop/`, die Regulierungsseiten.

Nutzer-Entscheidung: Variante 3 ("publish-Lohr") ist die kanonische Marke.
Root-cause-Fix (statt nur Links zu flicken): `assets/partials/header.html`
und `assets/partials/footer.html` wurden auf die publish-Lohr-Identität mit
echten, existierenden Links umgeschrieben (Startseite/Blog/Webshop). Diese
Partials werden über `site.js` (`loadPartial()` in `initSharedLayout()`) in
`<div id="header-slot">`/`<div id="footer-slot">` geladen — diese Mechanik
gab es vorher schon im Code, wurde aber nirgends benutzt. Jetzt nutzen
`index.html`, `webpages/blog/index.html` und alle drei Regulierungsseiten
sie tatsächlich. `site.js` markiert nach dem Laden zusätzlich automatisch
den aktuellen Nav-Link mit `aria-current="page"` (Pfad-Abgleich in
`initSharedLayout()`), damit das nicht mehr pro Seite von Hand gepflegt
werden muss.

**Ausnahme: `webpages/webshop/index.html` bindet `site.js` bewusst NICHT
ein.** Die Seite deklariert selbst ein globales `const CONTACT_EMAIL = ...`
(und weitere Top-Level-Namen) außerhalb jeder Funktion. `site.js` deklariert
ebenfalls ein globales `const CONTACT_EMAIL`. Zwei `<script>`-Tags im
selben Dokument, die beide dasselbe `const`/`let` auf oberster Ebene
deklarieren, werfen im Browser einen `SyntaxError: Identifier ... has
already been declared` — das komplette zweite Skript (in diesem Fall
`site.js`) würde dann gar nicht laufen, lautlos, nur sichtbar in der
Browser-Konsole. Deshalb bekommt der Webshop Header/Footer **von Hand**
mit identischem Markup wie die Partials (inklusive dem Cart-Badge, den nur
diese Seite braucht) statt über `loadPartial()`. Falls der Webshop jemals
auf `site.js` umgestellt werden soll: erst `CONTACT_EMAIL` (und die anderen
Top-Level-Namen) dort umbenennen oder in eine IIFE packen.

**Beim Umbau gefundene Regression, direkt gefixt:** `index.html` hatte eine
Zeile `document.getElementById("year").textContent = ...` auf oberster Ebene
eines `<script>`-Blocks, die auf das alte, jetzt entfernte `<span
id="year">` im Footer zielte. Nach dem Footer-Umbau wäre das `null` gewesen
→ `TypeError`, der den gesamten Rest dieses Skript-Blocks (inkl. der
E-Mail-Verlinkung im Kontaktformular) stillschweigend abgebrochen hätte.
Entfernt, da `site.js` das Jahr jetzt über `[data-year]` selbst setzt. **Lehre
für künftige Änderungen:** Wenn ein Element mit fester `id` entfernt wird,
IMMER sitewide nach `getElementById("<id>")`-Referenzen suchen, nicht nur
im selben Diff-Hunk.

## Gefundene und behobene Bugs (mit Ursache, damit sie nicht wiederkommen)

- **`mailto:` mit `%40` statt `@`**: `openMailto()` in `index.html` und im
  Webshop rief `encodeURIComponent(to)` auf die komplette E-Mail-Adresse auf.
  Das kodiert `@` zu `%40`, was etliche Mail-Clients (Outlook, Windows Mail)
  nicht als gültige Adresse erkennen — der "E-Mail öffnen"-Button tat
  scheinbar nichts. Fix: nur `subject`/`body` kodieren, die Adresse selbst
  unverändert einsetzen (so wie es `assets/site.js` schon immer richtig
  gemacht hat — als Referenz für zukünftige mailto-Konstruktionen nehmen).
- **Fehlendes Cache-Busting bei `work-index.json` und `calendar-index.json`**:
  Alle anderen JSON-Fetches im Projekt nutzen `{ cache: "no-store" }` oder
  einen `?v=`-Query. Die "Neues"-Galerie und der Kalender hatten das nicht,
  wodurch Browser/CDN nach einem Update von `work-index.json` weiterhin eine
  veraltete Version zeigen konnten (neu hinzugefügtes Buch fehlte in der
  Galerie). Fix: `{ cache: "no-store" }` ergänzt.
- **Kalender-Event-Links zeigten ins Leere**: `projects` in
  `calendar-index.json` enthielt Platzhalter-Slugs (`"medaille"`, `"reznik"`,
  `"angela"`), die zu keinem echten Ordner unter `assets/work/` passen
  (echte Slugs: `julius-faucher-medaille`, `reznik-debater`,
  `reznik-relationships`, `jung-lichstrahl`). Zusätzlich akzeptierte der
  Renderer nur Arrays, wodurch ein einzelner String-Wert (`"medaille"`)
  komplett verschwand statt wenigstens einen kaputten Link zu zeigen. Beides
  gefixt; Links zeigen jetzt außerdem den echten Buchtitel statt des rohen
  Slugs (Titel kommen aus `work-index.json`).
- **Regulierungsseiten (Cookies/Datenschutz/Impressum) ohne Stylesheet**:
  Sie luden `/assets/styles.css` gar nicht, dadurch sahen sie komplett anders
  aus als der Rest der Seite (kein CSS-Reset, keine Farben, keine
  Typografie). Zusätzlich waren sie komplett auf Englisch
  (`<html lang="en">`) obwohl der Rest der Seite Deutsch ist. Beides
  behoben: Stylesheet/Favicon/`lang="de"` ergänzt, Inhalte übersetzt, Header/
  Footer an das Muster von Blog/Webshop angeglichen.

## Bekannte, bewusst nicht behobene Inkonsistenzen

Diese wurden dem Nutzer als Optionen vorgelegt; hier die getroffenen
Entscheidungen, damit niemand sie versehentlich "repariert":

- **Kaputte Navigationslinks (`/webpages/about/`, `/webpages/projects/`,
  `/webpages/leistungen/`) — behoben.** Siehe "Header/Footer vereinheitlicht"
  oben. Tatsächlich vorhandene Seiten unter `webpages/`: `ar`, `blog`,
  `verein`, `webshop`.
- **Uneinheitliche Kontakt-E-Mail-Domains — bewusst unverändert gelassen.**
  `anfrage@publish-lohr.com` (Webshop, Regulierungsseiten, jetzt auch die
  Nav-Partials, die aber keine E-Mail anzeigen) vs.
  `anfrage@weichware-lohr.de` (`assets/site.js`, `CONTACT_EMAIL`-Konstante)
  vs. `anfrage@publish-lohr.de` (Startseiten-Kontaktformular, aus
  `["anfrage","publish-lohr.de"].join("@")` gebaut). Nutzer-Entscheidung:
  vorerst so lassen. Falls das später doch vereinheitlicht werden soll: alle
  drei Stellen oben sind die kompletten Fundstellen.
- **Totes `pages.json`/`site.js`-`renderStore()`-System (Weichware-Lohr-
  Personas) — bewusst archiviert, nicht gelöscht.** Nutzer-Entscheidung: der
  Code (`pages.json`, `renderStore`/`renderServices`/`renderTimeline`/
  `initPageFromJSON` in `site.js`) bleibt im Repo liegen, falls der Inhalt
  später wiederverwendet wird. Läuft aktuell nirgends, da kein
  `<body data-page="...">` im Repo existiert. Wer das später aufräumen will,
  hat zwei Optionen: (a) echte Seiten dafür bauen, die `data-page` setzen,
  oder (b) den Code ersatzlos entfernen.

## Nützliche Befehle (siehe auch `nicetoknow.txt`)

```
node assets/tools/generate-products.mjs   # products.json aus assets/shop/* neu bauen
node assets/tools/generate-indexes.mjs    # blog/projects/activities-index.json neu bauen (NICHT work-index.json!)
python convert_articles.py                # siehe "convert html.txt"
```
