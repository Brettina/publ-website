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
von Hand gepflegt oder von Skripten generiert werden (Node unter
`assets/tools/*.mjs`, sowie `convert_articles.py` im Projekt-Root). Gehostet
vermutlich über Cloudflare Pages (siehe `functions/api/hipster-mail.js`).
Das GitHub-Repo ist `Brettina/publ-website`.

## `assets/work/` — Kategorie-Ordner, generiert vs. von Hand

`assets/work/` ist nach Kategorien unterteilt:

```
assets/work/
  articles/<slug>/   — frei stehende Meinungsartikel
  books/<slug>/      — Bücher (verkaufbar über Webshop, falls Preis + available:"ja")
  events/<slug>/     — Presseartikel/Beiträge rund um Auftritte, Preise etc.
  games/<slug>/      — (aktuell leer, für zukünftige Projekte)
  blog/<slug>/       — GENERIERT, siehe eigener Abschnitt unten. Niemals von
                       Hand anlegen oder in convert_articles.py mitscannen.
```

Jeder `<slug>`-Ordner unter `articles/books/events/games` enthält von Hand
gepflegt: `meta.json` (Titel, Tags, Datum, Excerpt, ggf. Preise) und
`article.html` (Body-Inhalt, wird in `<article class="prose">` erwartet —
volle `<html>`-Dokumente werden akzeptiert, nur `<body>`-Inhalt wird von den
Konsumenten extrahiert). Optional eine Quelldatei (`.docx`/`.pdf`/`.odt`/`.md`),
aus der `article.html` automatisch erzeugt wird.

**Historische Notiz:** Bis zu dieser Session lagen alle Work-Items flach direkt
unter `assets/work/<slug>/`. Der Nutzer hat sie in Kategorie-Ordner
umsortiert. Dadurch mussten alle Pfad-Annahmen im Code (die vorher
`/assets/work/${slug}/...` bauten) auf `/assets/work/${category}/${slug}/...`
umgestellt werden — siehe "Pfad-Sweep" weiter unten.

## Wichtige Datenquellen — welche ist generiert, welche ist von Hand gepflegt?

Das ist die größte Falle im Projekt: **gleich aussehende Dateien haben
unterschiedliche "Herkunft"**. Bevor du eine JSON-Datei änderst, prüfe, ob
sie generiert wird — sonst überschreibt der nächste Skript-Lauf deine Änderung
(oder umgekehrt: du bearbeitest eine Datei, die eigentlich generiert werden
sollte, und wunderst dich, warum sich nichts synct).

| Datei | Herkunft | Generator |
|---|---|---|
| `assets/products.json` | **generiert** | `assets/tools/generate-products.mjs` (liest `assets/shop/<slug>/meta.json` + alle Bilder im Ordner) |
| `assets/work-index.json` | **generiert** | `convert_articles.py` (scannt `assets/work/<category>/<slug>/`, außer `blog/` — siehe unten) |
| `assets/work/blog/blog-index.json` + jeder `assets/work/blog/<slug>/` | **generiert, aber write-once pro Slug** | `assets/tools/generate-blog-feed.mjs` — siehe eigener Abschnitt |
| `assets/calendar/calendar-index.json` | **von Hand gepflegt** | keiner, absichtlich. Das ist die einzige Kalenderdatei; der Kalender auf der Startseite, die "Neues"-Galerie und der Blog-Feed-Generator lesen genau diesen Pfad. |

**Historische Notiz (überholte Pipelines, entfernt):** Es gab früher gleich
mehrere parallele, sich überschneidende Generatoren, die alle tot waren, weil
sie einen Ordner `assets/blog/<slug>/` erwarteten, der nicht mehr existierte:
- `assets/tools/generate-indexes.mjs` → `assets/blog-index.json`,
  `assets/projects-index.json`, `assets/activities-index.json` (leer) —
  gelöscht.
- `assets/tools/generate-activities.mjs` → `assets/activities.json` +
  `assets/content/blog/<slug>.html` (verschachtelt gewrappte HTML-Dateien —
  das war die Erklärung für die komische "HTML-in-HTML"-Struktur dieser
  Dateien: das Skript nahm eine bereits-volle HTML-Quelldatei und wrappte sie
  nochmal in seine eigene `<!doctype html>`-Vorlage). Alles gelöscht.
- Der Top-Level `assets/calendar-index.json` (leer, von `generate-indexes.mjs`
  erzeugt) — bereits früher in dieser Session gelöscht.

Die 5 verwaisten Artikel, die in `assets/content/blog/*.html` übrig geblieben
waren, wurden nach `assets/work/articles/<slug>/` migriert (siehe unten).

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
`data-page`-Attribut am `<body>`). Bewusst archiviert, nicht gelöscht (siehe
"Bekannte, bewusst nicht behobene Inkonsistenzen").

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
`img/kalender/<datum>/` angelegt und ein `"photos": []`-Array pro Event in
`assets/calendar/calendar-index.json`. Sobald Fotos in einen Datums-Ordner
gelegt werden, müssen ihre Pfade **von Hand** ins `photos`-Array der
jeweiligen Kalender-Zeile eingetragen werden. Diese Fotos werden im
Kalender-Tagespanel als Thumbnail-Grid gezeigt; Klick öffnet ein Lightbox-
Popup (`#cal-lightbox`, eigenes `<dialog>`).

Warum nicht automatisch scannen? `calendar-index.json` ist die einzige von
Hand gepflegte Datei im ganzen Projekt — ein Auto-Scan hätte eine
Merge-Logik gebraucht (Ordner scannen, aber Titel/Notizen/Tags nicht
überschreiben). Für den aktuellen Umfang war das Mehraufwand ohne
sofortigen Nutzen.

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
gesetzt und von der Galerie aufgerufen. Nach demselben Muster löst
`window.openWorkModal(item)` (siehe nächster Abschnitt) das Problem in die
andere Richtung.

**Bekannte Konsequenz:** Falls kein Event-Datum in der Vergangenheit liegt,
zeigt die Galerie nur 3 Werke, keine Event-Karte. Das ist kein Bug, sondern
Ergebnis der "nur vergangene Events"-Logik.

### Kalender-Projektlinks öffnen jetzt das Artikel-Modal statt wegzunavigieren

Die Projekt-Links im Kalender-Tagespanel (z. B. "Den Zweifler in uns zähmen"
unter dem Termin "Leipziger Buchmesse") verlinkten auf die rohe
`article.html`-Datei — ein unstyled Dokument ohne `<link rel="stylesheet">
oder Seiten-Chrome, weil `assets/work/*/article.html`-Dateien bewusst nur
Body-Fragmente sind, die von echten Seiten eingebettet werden sollen, nicht
eigenständig aufgerufen.

Fix: `openCurrent()` (die Funktion, die für die "Neues"-Galerie Artikel im
`#blog-modal`-Dialog anzeigt) wurde in eine wiederverwendbare Funktion
`openWorkModal(item)` aufgeteilt und über `window.openWorkModal` global
verfügbar gemacht. Der Kalender-Score baut jetzt eine vollständige
`workItemsBySlug`-Map (statt nur Titel/URLs) beim Laden von
`work-index.json` und ruft bei Klick auf einen Projektlink
`window.openWorkModal(workItemsBySlug[slug])` auf (mit `e.preventDefault()`),
statt den Link normal navigieren zu lassen. Der `href` bleibt trotzdem
gesetzt (zeigt auf `contentUrl`) als Fallback, falls das Modal aus
irgendeinem Grund nicht verfügbar ist (z. B. `window.openWorkModal` noch
nicht geladen) — dann navigiert der Link ganz normal.

### Blog komplett neu: auto-generierter Feed statt Hand-Pflege

Der alte Blog (`webpages/blog/index.html`) war komplett tot: er fetchte
`/assets/activities.json`, das entweder leer war oder von den jetzt
gelöschten Generatoren stammte, die einen nicht mehr existierenden
`assets/blog/<slug>/`-Ordner erwarteten.

Nutzer-Entscheidung: Der Blog soll **nicht mehr separat von Hand gepflegt
werden**. Stattdessen wird er automatisch aus bereits vorhandenem Material
gebaut:
- `assets/work/{articles,books,events,games}/*` (über `work-index.json`)
- `assets/calendar/calendar-index.json` (Messen, Konferenzen, Termine)

**Neuer Generator: `assets/tools/generate-blog-feed.mjs`**
Baut für jeden Quelleintrag einen "Teaser-Post" unter
`assets/work/blog/<slug>/` (`meta.json` + `article.html`) und schreibt
`assets/work/blog/blog-index.json` als Manifest (newest-first sortiert),
das die Blogseite direkt einliest.

Wichtige Designentscheidungen dabei:

- **Write-once pro Slug.** Der Generator legt einen Post-Ordner nur beim
  ERSTEN Mal an. Existiert er schon, wird `article.html`/`meta.json` NIE
  wieder überschrieben — nur das Manifest wird bei jedem Lauf neu gebaut,
  und zwar bevorzugt aus dem *aktuellen* `meta.json` des Posts (nicht aus
  frisch berechneten Quelldaten), damit eine spätere redaktionelle
  Anreicherung (siehe unten) auch im Feed sichtbar wird. Grund: der Nutzer
  wollte ausdrücklich, dass ältere Feed-Einträge "nicht mehr angefasst"
  werden, sobald ein neuerer Eintrag ihren Platz als "neuester Post"
  übernimmt — und zwar ohne dass dafür ein separater Zustand/State-File
  gepflegt werden muss. Die Lösung: weil "neuester Post" einfach
  `blog-index.json.items[0]` nach der Sortierung ist, hört jeder Post
  automatisch auf, Ziel für weitere Bearbeitung zu sein, sobald ein neuerer
  Eintrag ihn von Position 0 verdrängt — es gibt nichts, was das separat
  tracken müsste.
- **Zukünftige Kalender-Events sortieren als "heute veröffentlicht".** Ein
  Event am 1. Oktober würde mit seinem eigenen Datum sortiert VOR
  aktuellen News vom August landen, wenn man im August generiert — falsch
  für einen Feed (ein Ankündigungs-Post ist "neu", wenn er geschrieben
  wird, nicht wenn das Event stattfindet). Deshalb: vergangene Events
  sortieren nach echtem Event-Datum (Rückblick), zukünftige Events
  sortieren nach dem Datum des Generator-Laufs (Ankündigung).
- **`assets/work/blog/` wird von `convert_articles.py` explizit
  ausgeschlossen.** Ohne diesen Ausschluss (Bug, der in dieser Session
  live auftrat und gefixt wurde) würde `convert_articles.py` beim nächsten
  Lauf die generierten Blog-Posts selbst als "Quell-Items" einlesen und in
  `work-index.json` aufnehmen — die dann beim nächsten
  `generate-blog-feed.mjs`-Lauf WIEDER als neue Blog-Posts erzeugt würden.
  Eine sich selbst verstärkende Duplizierungsschleife. Reihenfolge ist
  deshalb wichtig: **immer erst `python convert_articles.py`, dann
  `node assets/tools/generate-blog-feed.mjs`.**
- **Orphan-Cleanup ja, Inhalts-Überschreiben nein.** Verschwindet ein
  Quell-Item komplett (Ordner gelöscht/umbenannt), entfernt der Generator
  den dazugehörigen verwaisten Blog-Post-Ordner automatisch
  (`clearStalePosts`). Das ist bewusst anders als "ändere nie etwas an
  einem bestehenden Post" — hier geht es um Aufräumen von Leichen, nicht
  um Content-Änderung an einem noch gültigen Post.

**Blogseite (`webpages/blog/index.html`) komplett neu geschrieben:**
Statt der alten Akkordeon-Logik mit Fetches gegen `assets/blog/<slug>/...`
lädt sie jetzt nur noch `/assets/work/blog/blog-index.json`, rendert Karten
mit Titel/Datum/Excerpt/Kategorie-Pill, und lädt den vollen Artikelinhalt
erst bei Klick nach (`loadFullArticle()`, DOMParser-Body-Extraktion wie beim
Homepage-Modal). **Infinite Scroll** statt "alles auf einmal": anfangs 6
Einträge sichtbar, ein `IntersectionObserver` auf einem unsichtbaren
Sentinel-Element am Listenende lädt bei Bedarf weitere 6 nach. Die Such-/
Filterfelder setzen `visibleCount` beim Ändern zurück auf 6.

**Anreicherung: ereignisgesteuert statt monatlicher Cloud-Routine.** Der
Nutzer wollte ursprünglich, dass der jeweils *neueste* Feed-Post einmal im
Monat mit online recherchierten Informationen angereichert wird — aber nur
als Entwurf für menschliche Review, nie automatisch live geschaltet, nie
rückwirkend für ältere Posts. Erster Ansatz war eine monatliche Cloud-Routine
über `RemoteTrigger`/die `schedule`-Skill — verworfen, weil (a) sie einen
verbundenen GitHub-Zugriff auf `Brettina/publ-website` brauchte, den es zu
dem Zeitpunkt nicht gab (`Connect your GitHub account before saving a
routine...`), und (b) der Nutzer ohnehin lieber wollte, dass die Anreicherung
**an das bestehende lokale Werkzeug gekoppelt ist**, statt an einen
unabhängigen Kalender.

Stattdessen: `generate-blog-feed.mjs` schreibt nach jedem Lauf
`assets/work/blog/pending-enrichment.json`, aber NUR wenn sich
`blog-index.json.items[0]` (der "neueste" Post) gegenüber dem letzten Lauf
geändert hat — also genau dann, wenn ein neues Werk oder ein neues
Kalender-Event den Spitzenplatz übernimmt (`updatePendingEnrichmentMarker()`).
Diese Datei ist reine Anwesenheits-Logik: existiert sie, ist eine Anreicherung
fällig; ihr Inhalt (`slug`, `title`, `detectedAt`) sagt für welchen Post.
Sobald die Anreicherung erledigt ist (von mir manuell in einer Session, siehe
unten, oder später ggf. automatisiert), wird die Datei gelöscht — ihr Fehlen
bedeutet "nichts ausstehend".

**So läuft die Anreicherung ab, wenn `pending-enrichment.json` existiert**
(bisher manuell in einer Claude-Code-Session gemacht, kein Automatismus):
1. `assets/work/blog/<slug>/article.html` und `meta.json` lesen (aktueller
   Stand).
2. Online recherchieren (WebSearch/WebFetch) zum jeweiligen Thema — bei
   Büchern: Titel/Autor, Rezensionen, Verfügbarkeit; bei Kalender-Events:
   Ort/Details/Nachberichte; bei Artikeln: aktuelle Entwicklungen zum Thema.
3. Einen Entwurf nach `assets/work/blog/<slug>/article.draft.html` schreiben
   (NIE `article.html` direkt überschreiben).
4. Einen datierten Eintrag in `assets/work/blog/<slug>/enrichment-notes.md`
   anhängen: was gesucht, was gefunden, was geändert, mit Quellenangaben.
5. `pending-enrichment.json` löschen.

Harte Regeln dabei: niemals `assets/work/{articles,books,events,games}/*`
(die Originale) anfassen, niemals `article.html` direkt überschreiben,
niemals einen anderen Slug als den in `pending-enrichment.json` genannten
anfassen, niemals `generate-blog-feed.mjs` während der Anreicherung selbst
laufen lassen.

**Bereits einmal durchgeführt** (in dieser Session, als Beispiel/Test): für
`reznik-debater` (dem damals aktuell neuesten Post) wurde online zu "Taming
the Debater Within" recherchiert (Erscheinungsjahr, Illustratorin,
Verfügbarkeit, ein Testimonial-Zitat gefunden) und ein Entwurf +
Anreicherungs-Notiz geschrieben. `article.html` blieb unverändert.

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

### Pfad-Sweep nach der Kategorie-Umsortierung von `assets/work/`

Nachdem der Nutzer `assets/work/<slug>/` in `assets/work/<category>/<slug>/`
umsortiert hatte, mussten alle Stellen gefixt werden, die Pfade aus einem
bloßen `slug` zusammengebaut hatten (statt die bereits fertigen URLs aus
`work-index.json` zu benutzen):

- `webpages/webshop/index.html`: `resolveWorkImage()` und
  `loadBooksFromWorkIndex()` bauen jetzt `${category}/${slug}` statt nur
  `${slug}` in ihre Fallback-Pfade ein (der Normalfall nutzt ohnehin direkt
  `metaUrl`/`contentUrl`/`cover` aus dem Index — die Fallbacks greifen nur,
  wenn der Index mal unvollständig sein sollte).
- `index.html`: die Kalender-Projektlinks bauten `href` selbst zusammen
  (`/assets/work/${id}/article.html`) statt `contentUrl` aus
  `work-index.json` zu verwenden. Gefixt, siehe auch "Kalender-Projektlinks"
  oben.
- `convert_articles.py`: iteriert jetzt zwei Ebenen (Kategorie, dann Slug)
  statt einer, und schreibt `category` als neues Feld in jeden
  `work-index.json`-Eintrag.

**Lehre:** Konsumenten sollten IMMER die fertigen URLs aus dem generierten
Index verwenden (`contentUrl`, `metaUrl`, `cover`), nie einen Pfad aus
`slug` selbst zusammenbauen — dann sind sie automatisch robust gegen genau
diese Art von Struktur-Änderung.

## Gefundene und behobene Bugs (mit Ursache, damit sie nicht wiederkommen)

- **`mailto:` mit `%40` statt `@`**: `openMailto()` in `index.html` und im
  Webshop rief `encodeURIComponent(to)` auf die komplette E-Mail-Adresse auf.
  Das kodiert `@` zu `%40`, was etliche Mail-Clients (Outlook, Windows Mail)
  nicht als gültige Adresse erkennen — der "E-Mail öffnen"-Button tat
  scheinbar nichts. Fix: nur `subject`/`body` kodieren, die Adresse selbst
  unverändert einsetzen (so wie es `assets/site.js` schon immer richtig
  gemacht hat — als Referenz für zukünftige mailto-Konstruktionen nehmen).
- **Honeypot-Feld fälschlicherweise durch Autofill befüllt**: Sowohl das
  Kontaktformular auf der Startseite als auch das Checkout-Formular im
  Webshop hatten ein per `position:absolute; left:-9999px` verstecktes
  Spam-Honeypot-Feld namens `company` mit `<label>Company</label>`.
  `display:none`/`visibility:hidden` werden von Browser-Autofill respektiert,
  ein nur *visuell* wegverschobenes (aber technisch sichtbares) Feld nicht
  zuverlässig — Chrome/Edge können es mit gespeicherten
  Firmennamen-Autofill-Daten befüllen, wodurch der Honeypot fälschlich
  auslöste und das Formular **lautlos** gar nichts tat (kein Fehler, keine
  Konsolen-Meldung, einfach nichts). Genau das Symptom, das der Nutzer als
  "Kaufen funktioniert, aber E-Mail öffnen tut nichts" beschrieb. Fix: Feld
  umbenannt (`name="hp_feld"`, kein autofill-typischer Name mehr, kein
  `<label>` mehr) und auf `display:none` umgestellt (von einfachen Bots, die
  ohnehin kein CSS auswerten, weiterhin blind mitausgefüllt — der eigentliche
  Zweck des Honeypots bleibt erhalten).
- **Zwei konkurrierende Submit-Handler auf dem Kontaktformular der
  Startseite**: `index.html` hat sein eigenes, vollständiges
  Submit-Handling für `[data-contact-form]`. `site.js`s `initSite()` rief
  aber IMMER auch `attachContactFormHandler(pageKey)` auf (mit
  `pageKey = document.body.getAttribute("data-page") || "home"` — der
  `|| "home"`-Fallback sorgte dafür, dass das auch ohne `data-page`-Attribut
  lief), was einen ZWEITEN Submit-Listener auf dasselbe Formular legte, der
  eine eigene, andere Mailto-Navigation auslöste. Fix: `attachContactFormHandler`/
  `attachOrderFormHandlers` laufen jetzt nur noch, wenn `data-page` gesetzt
  ist (also nur für das archivierte `pages.json`-System, für das sie
  eigentlich gebaut wurden) — kein `|| "home"`-Fallback mehr.
- **Fehlendes Cache-Busting bei `work-index.json` und `calendar-index.json`**:
  Alle anderen JSON-Fetches im Projekt nutzen `{ cache: "no-store" }` oder
  einen `?v=`-Query. Die "Neues"-Galerie und der Kalender hatten das nicht,
  wodurch Browser/CDN nach einem Update von `work-index.json` weiterhin eine
  veraltete Version zeigen konnten (neu hinzugefügtes Buch fehlte in der
  Galerie). Fix: `{ cache: "no-store" }` ergänzt.
- **Kalender-Event-Links zeigten ins Leere**: `projects` in
  `calendar-index.json` enthielt Platzhalter-Slugs (`"medaille"`, `"reznik"`,
  `"angela"`), die zu keinem echten Ordner unter `assets/work/` passten.
  Zusätzlich akzeptierte der Renderer nur Arrays, wodurch ein einzelner
  String-Wert (`"medaille"`) komplett verschwand statt wenigstens einen
  kaputten Link zu zeigen. Beides gefixt; Links zeigen jetzt außerdem den
  echten Buchtitel statt des rohen Slugs und öffnen ein In-Page-Modal statt
  wegzunavigieren (siehe oben).
- **`jung-lichstrahl` → `jung-lichtstrahl` (Tippfehler im Ordnernamen)**:
  "Lichstrahl" ist kein deutsches Wort, korrekt ist "Lichtstrahl". Der Nutzer
  hat das im Kalender-JSON korrigiert; der eigentliche Ordner
  `assets/work/books/jung-lichstrahl/` hatte denselben Tippfehler und wurde
  entsprechend umbenannt (`git mv`), danach `work-index.json` und der
  Blog-Feed neu generiert.
- **`convert_articles.py` scannte seinen eigenen generierten Output**: Nach
  der Umstellung auf Kategorie-Ordner iterierte das Skript blind über ALLE
  Unterordner von `assets/work/`, inklusive `blog/` — das hätte generierte
  Blog-Posts als "Quell-Items" in `work-index.json` aufgenommen, die dann
  vom Blog-Feed-Generator wieder neu erzeugt worden wären
  (Duplizierungsschleife). Fix: `blog` wird jetzt explizit übersprungen.
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

## Offene Punkte

- **Anreicherung ist noch kein Automatismus.** `pending-enrichment.json`
  wird zwar automatisch von `generate-blog-feed.mjs` gesetzt, aber jemand
  (aktuell: ich, in einer Claude-Code-Session) muss die eigentliche
  Recherche+Entwurf-Erstellung noch manuell anstoßen (z. B. "prüf ob eine
  Anreicherung ausstehend ist"). Falls das später vollautomatisiert werden
  soll, siehe die verworfene Cloud-Routine im Abschnitt "Blog komplett neu"
  als Ausgangspunkt — Voraussetzung dafür wäre ein verbundener GitHub-Zugriff
  auf `Brettina/publ-website`.

## Nützliche Befehle (siehe auch `nicetoknow.txt`)

Reihenfolge beachten — `convert_articles.py` muss vor
`generate-blog-feed.mjs` laufen, sonst arbeitet der Blog-Feed mit einem
veralteten `work-index.json`:

```
python convert_articles.py                     # assets/work-index.json aus assets/work/<kategorie>/* neu bauen
node assets/tools/generate-blog-feed.mjs        # assets/work/blog/* + blog-index.json neu bauen (write-once pro Slug)
node assets/tools/generate-products.mjs         # products.json aus assets/shop/* neu bauen
```
