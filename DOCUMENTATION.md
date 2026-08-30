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

## Sprachstil: KEIN Gendern

Ausdrückliche Anweisung des Nutzers, gilt für JEDEN Text auf dieser Website
(Homepage, Blog-Posts, generierte Teaser, Kalender-Notizen, alles):
**keine Gender-Formen** — kein "-innen" (Autor*innen, Teilnehmer:innen,
Besucherinnen und Besucher, o. ä.), kein Gendersternchen, kein Doppelpunkt,
kein Binnen-I, keine Partizip-Konstruktionen wie "Studierende" oder
"Mitarbeitende" als Ersatz. Stattdessen: **generisches Maskulinum**
("Autoren", "Künstler", "Besucher", "Teilnehmer" — auch wenn eine gemischte
oder überwiegend weibliche Gruppe gemeint ist).

Das gilt für generische/plurale Bezeichnungen. **Keine Ausnahme nötig** für
grammatisch korrekte weibliche Einzelformen bei einer konkret benannten Frau
(z. B. "Bettina Lohr ist Verlegerin, Gewinnerin des Jungautorenwettbewerbs
..." — das ist normales, unmarkiertes Deutsch für eine bestimmte Person,
kein Gendern, und bleibt unangetastet).

Konkreter Anlass: Bei einer "Du→Sie"-Überarbeitung des Hero-Texts ist mir
"Autorinnen ... Künstlerinnen" hineingerutscht (das Original hatte bereits
korrekt "Autoren ... Künstlern"). Wurde zurückgesetzt. Bevor neuer Text für
diese Website geschrieben wird: nochmal an diese Regel denken, besonders bei
generierten Blog-Teasern (`generate-blog-feed.mjs`) und bei künftigen
Recherche-Einfügungen — diese Regel gilt auch dort.

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
| `assets/shop/products.json` | **von Hand gepflegt** | keiner, absichtlich (siehe "Shop-Daten vereinfacht" unten) |
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

`assets/products.json` (Bademantel, Socken, T-Shirt — Pfad seither geändert,
siehe "Shop-Daten vereinfacht" unten) wurde von **keiner** existierenden
Seite angezeigt. Der Code dafür (`pages.json` + `site.js` `renderStore()`)
ist auf eine "hipster"-Seite ausgelegt (`productsFromPages: ["hipster"]`),
aber `/webpages/hipster/` existiert nicht als echte Route. Gleichzeitig
hatten die Produkte das Feld `"page": "webshop"` — ein Mismatch, der dafür
sorgte, dass selbst wenn man `renderStore` irgendwo aufrufen würde, nichts
passt.

Entscheidung (mit dem Nutzer abgestimmt): Merch-Produkte in die bestehende
Buchshop-Seite (`webpages/webshop/index.html`) integrieren, statt die fehlende
Hipster-Seite zu bauen. Der Buchshop lädt zusätzlich die Shop-Produkte
(`loadMerchProducts()`) und mischt Merch und Bücher in dieselbe
durchsuchbare/sortierbare Liste.

**Der `pages.json`/`site.js`-`renderStore()`-Pfad ist damit weiterhin toter
Code** — keine Seite im Repo hat `data-page="hipster"` (oder überhaupt ein
`data-page`-Attribut am `<body>`). Bewusst archiviert, nicht gelöscht (siehe
"Bekannte, bewusst nicht behobene Inkonsistenzen").

### Mehrere Bilder pro Produkt: Slider statt nur erstes Bild

Für die Anzeige gibt es eine kleine handgeschriebene Galerie-Komponente
(`buildGallery()` in `webpages/webshop/index.html`) — Pfeile, Punkte,
Touch-Swipe. Bewusst **keine externe Library**, um den Rest der Seite (kein
Build-Step, keine npm-Abhängigkeiten im Browser) konsistent zu halten. Sie
rendert aus dem `images[]`-Array jedes Produkts (Fallback: `image`, falls
`images` fehlt).

### Shop-Daten vereinfacht: ein handgepflegtes `assets/shop/products.json` statt Generator + Meta-Dateien pro Produkt

Ursprünglich (frühere Version dieser Session): jedes Produkt hatte einen
eigenen Ordner `assets/shop/<slug>/meta.json`, und
`assets/tools/generate-products.mjs` scannte alle Produktordner, sammelte
Bilder automatisch (`listImages()`) und schrieb das Ergebnis nach
`assets/products.json` (Site-Root), welches Webshop und `site.js` lasen.

Der Nutzer hat das vereinfacht: die einzelnen `meta.json`-Dateien sind
gelöscht, stattdessen gibt es genau eine Datei,
**`assets/shop/products.json`**, von Hand gepflegt, bereits in der finalen
Form (inklusive `images[]`-Array und `price`, direkt vom Nutzer eingetragen
statt automatisch erkannt). `generate-products.mjs` wurde gelöscht — es
hatte keine Aufgabe mehr (kein Meta-Ordner mehr zum Scannen, keine
Bild-Auto-Erkennung mehr nötig, weil der Nutzer `images[]` jetzt selbst
pflegt).

Angepasst wurden die beiden Stellen, die die alte Root-Datei fetchten:
`webpages/webshop/index.html` (`loadMerchProducts()`) und `assets/site.js`
(`getProductsContent()`, für den archivierten `renderStore()`-Pfad) — beide
zeigen jetzt auf `/assets/shop/products.json`. Die Datenform selbst
(`id`, `page`, `name`, `description`, `image`, `images[]`, `status`,
`variants`, `unit`, `price`, `pickupRequired`, `decorateJuice`, plus der
`order`-Block mit Abholorten) ist unverändert — nur der Ort und die
Pflege-Methode haben sich geändert.

**Falle für später:** Bilder werden jetzt NICHT mehr automatisch aus dem
Ordner erkannt. Ein neues Foto in `assets/shop/<slug>/` taucht erst im Shop
auf, wenn sein Pfad manuell ins `images[]`-Array in
`assets/shop/products.json` eingetragen wird.

### Kalender-Fotos: Datums-Ordner + manuelles `photos`-Array statt Auto-Scan

Für Event-Fotos wurde **kein** Generator gebaut, der Ordner scannt (auch
`assets/shop/products.json` funktioniert inzwischen so — Bilder werden von
Hand eingetragen, nicht automatisch erkannt). Stattdessen: Ordner
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

### Kalender-Projektlinks: Titel + korrekter Pfad (Feature ging verloren, zweimal gefixt)

**Wichtige Falle:** `index.html` wurde irgendwann im Verlauf dieser Session
(vom Nutzer, im Editor) auf einen deutlich älteren Stand zurückgesetzt —
nicht nur die "3 Werke + 1 Event"-Galerie fehlte danach, sondern auch dieser
Fix hier war wieder weg: die Kalender-Projektlinks bauten wieder rohe,
flache Pfade (`/assets/work/${id}/article.html`, ohne Kategorie-Segment)
und zeigten den rohen Slug statt des Buchtitels als Linktext — exakt der
Zustand von vor dem ursprünglichen Fix. Beim erneuten Beheben wurde
zusätzlich `workItemsBySlug` (vollständige Work-Index-Objekte, nicht nur
Titel) wieder eingeführt, damit `href` aus `item.contentUrl` kommt statt neu
zusammengebaut zu werden.

**Noch NICHT wiederhergestellt** (bewusst, da nicht angefragt): das
In-Page-Artikel-Modal für diese Links (`window.openWorkModal` +
`data-work-modal`-Attribute) sowie das Foto-Thumbnail-Grid + Lightbox-Popup
im Kalender-Tagespanel (`data-lightbox-src`, `#cal-lightbox`-Dialog) — beide
waren zwischenzeitlich gebaut, sind aber nach dem Revert aktuell nicht mehr
im Code. Die Kalender-Projektlinks navigieren daher aktuell wieder zur
rohen `article.html` (funktioniert, sieht aber unstyled aus). Falls
gewünscht: beides erneut bauen, Muster ist in der Git-Historie/vorherigen
Konversation nachvollziehbar.

Ursprüngliche Beschreibung des In-Page-Modal-Fixes (für den Fall, dass er
erneut gebaut wird): Die Projekt-Links im Kalender-Tagespanel (z. B. "Den
Zweifler in uns zähmen" unter dem Termin "Leipziger Buchmesse") verlinkten
auf die rohe `article.html`-Datei — ein unstyled Dokument ohne
`<link rel="stylesheet">` oder Seiten-Chrome, weil `assets/work/*/article.html`-
Dateien bewusst nur Body-Fragmente sind, die von echten Seiten eingebettet
werden sollen, nicht eigenständig aufgerufen.

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
- **Sortiert wird nach "hinzugefügt", nicht nach "zuletzt bearbeitet".**
  Erster Versuch: Work-Items sortierten nach `updated`. Der Nutzer hat das
  korrigiert: "neueste zuerst" heißt das tatsächliche Hinzufüge-Datum, nicht
  ein Bearbeitungs-Zeitstempel. Jetzt sortieren Work-Items nach `published`
  (Erstveröffentlichung/Hinzufügen), nicht nach `updated` — sonst würde das
  Korrigieren eines Tippfehlers in einem alten Post ihn an die Spitze des
  Feeds befördern.
- **Nur vergangene Kalender-Events bekommen einen Blog-Post.** Erster
  Versuch: auch zukünftige Events wurden als "Ankündigung" aufgenommen
  (Zukunftsform, sortiert nach Generator-Lauf-Datum). Der Nutzer hat das
  korrigiert: ein Event, das noch nicht stattgefunden hat, gibt es nichts zu
  berichten und nichts zu recherchieren — es gehört nicht in den Blog.
  `buildFromCalendar()` überspringt jetzt jedes Event mit `date > heute`
  komplett (`if (String(ev.date) > todayStr) continue;`). Bereits
  generierte Posts für inzwischen wieder in der Zukunft liegende Events
  werden beim nächsten Lauf automatisch von `clearStalePosts` entfernt, weil
  sie nicht mehr in der Quellmenge auftauchen.
- **Ein Post pro DATUM, nicht pro Event.** Fänden mehrere Dinge am selben Tag
  statt, hätte die alte Logik (Slug = `termin-<datum>-<slugifizierter-titel>`)
  mehrere separate, fast identische Posts erzeugt, die alle um denselben
  "neuester Post"-Platz konkurrieren. Jetzt gruppiert `buildFromCalendar()`
  zuerst nach `date` (`byDate` Map) und erzeugt EINEN Post pro Datum
  (Slug jetzt einfach `termin-<datum>`, kein Titel-Suffix mehr nötig). Bei
  mehreren Events am selben Tag: Titel werden mit " & " verbunden, Tags
  dedupliziert, jedes Event bekommt seinen eigenen Absatz im Fließtext
  (Intro-Satz + Notiz) — die redaktionelle Unterscheidung mehrerer
  Ereignisse passiert im Text selbst, nicht durch mehrere Posts.
  **Nebenwirkung, aufgepasst:** Weil sich der Slug geändert hat
  (`termin-<datum>-<titel>` → `termin-<datum>`), wurden die 3 bereits
  bestehenden Event-Posts (EF-Konferenz, Wohlfühlmesse Gelsenkirchen,
  Leipziger Buchmesse) beim nächsten Lauf als verwaist erkannt, gelöscht und
  unter dem neuen Slug frisch (mechanisch, ohne die von Hand recherchierten
  Zusatz-Absätze) neu angelegt — die Recherche-Ergänzungen mussten manuell
  erneut eingefügt werden. **Lehre:** Eine Slug-Schema-Änderung im Generator
  killt automatisch jede handgepflegte Anreicherung, die an den alten Slug
  gebunden war, weil write-once nur den Slug kennt, nicht "dasselbe Ereignis
  unter neuem Namen". Vor einer Slug-Schema-Änderung: bestehende
  Anreicherungen sichern/manuell migrieren.
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
lädt sie jetzt nur noch `/assets/work/blog/blog-index.json` und rendert
Karten mit Titel/Datum/Kategorie-Pill/Cover-Bild.

Wichtig, weil zweimal korrigiert:
- **Kein Klick zum Aufklappen.** Erste Version hatte einen Akkordeon-Toggle
  (Klick auf Titel = auf/zuklappen). Der Nutzer wollte das explizit nicht:
  jede sichtbare Karte lädt ihren vollen Inhalt automatisch
  (`loadFullArticle()`, DOMParser-Body-Extraktion wie beim Homepage-Modal),
  sofort beim Rendern, ohne Interaktion. Nur wie viele Karten überhaupt
  sichtbar/gerendert sind, wird durch Scrollen gesteuert.
- **Infinite Scroll statt "alles auf einmal".** Anfangs `BATCH_SIZE = 3`
  Einträge gerendert (nicht 6 — auch das war eine Nutzerkorrektur), ein
  `IntersectionObserver` auf einem unsichtbaren Sentinel-Element am
  Listenende lädt bei Bedarf weitere 3 nach.
- **Rendering ist append-only, nicht "alles neu bauen".** Weil jede Karte
  sofort ihren Inhalt nachlädt, würde ein `postsEl.innerHTML = ""` bei jedem
  Scroll-Tick bereits geladene Karten erneut fetchen. `render()` merkt sich
  `renderedSlugs` und hängt nur neue Karten an; ein echter Reset (Such-/
  Filteränderung) passiert nur explizit über `render({ reset: true })`.
- **"Mehr zum Buch"/"Vollständigen Artikel lesen"-Links öffnen ein
  In-Page-Modal.** Diese Links (vom Generator erzeugt, zeigen auf die rohe
  `assets/work/<category>/<slug>/article.html`) navigierten sonst zu einer
  unstyled Seite. Die Blogseite hat jetzt ihr eigenes `<dialog
  id="article-modal">` (gleiches Muster wie das Homepage-Modal); jeder Link
  mit `href^="/assets/work/"` innerhalb des geladenen Inhalts wird
  abgefangen und öffnet stattdessen das Modal (`wireInternalLinks()`).
- **Farb-Fix im Modal.** Einige Quellartikel (Word/PDF-Konvertierungen,
  z. B. "Wir gewinnen die Julius-Faucher-Medaille") haben hartkodierte
  `style="color:#000000"` auf jeder Zeile — unsichtbar im Dark Mode.
  `.article-modal-body, .article-modal-body * { color: inherit !important;
  background: transparent !important; }` erzwingt das Theme des Lesers,
  exakt dasselbe Muster wie schon beim Homepage-`.blog-modal-body`.
- **Cover-Bilder: `object-fit: contain` statt `cover`.** Erste Version
  beschnitt die Bilder (`cover` füllt den Slot, schneidet ab). Der Nutzer
  wollte die Fotos unbeschnitten, an den Slot angepasst per Höhe/Breite
  (`contain`, mit dezentem Hintergrund für den Letterbox-Bereich).

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
Der Inhalt ist `{ slug, title, detectedAt, status }`, wobei `status` entweder
`"pending"` oder `"done"` ist.

**Wichtige Falle (in dieser Session live aufgetreten):** Die Datei darf NICHT
gelöscht werden, sobald die Anreicherung erledigt ist — stattdessen wird ihr
`status`-Feld auf `"done"` gesetzt. Grund: der Generator vergleicht bei jedem
Lauf nur "ist der aktuelle Spitzenreiter derselbe Slug wie in der
existierenden Marker-Datei?". Fehlt die Datei komplett, sieht das für den
Generator identisch aus wie "diesen Slug noch nie gesehen" — er würde bei
JEDEM erneuten Lauf denselben, bereits erledigten Slug wieder als "neu
ausstehend" markieren, solange kein anderer Post den Spitzenplatz übernimmt.
Erster Bugfix-Zyklus dieser Session: Datei nach der `reznik-debater`-
Anreicherung gelöscht → nächster `generate-blog-feed.mjs`-Lauf hat sofort
wieder denselben Slug als "neu" gemeldet. Fix: `status`-Feld ergänzt, Datei
bleibt liegen.

**So läuft die Anreicherung ab, wenn `pending-enrichment.json` `status:
"pending"` hat** (bisher manuell in einer Claude-Code-Session gemacht, kein
Automatismus):
1. `assets/work/blog/<slug>/article.html` und `meta.json` lesen (aktueller
   Stand).
2. Online recherchieren (WebSearch/WebFetch) zum jeweiligen Thema — bei
   Büchern: Titel/Autor, Rezensionen, Verfügbarkeit; bei Kalender-Events:
   Ort/Details/Nachberichte; bei Artikeln: aktuelle Entwicklungen zum Thema.
3. Einen Entwurf nach `assets/work/blog/<slug>/article.draft.html` schreiben
   (NIE `article.html` direkt überschreiben).
4. Einen datierten Eintrag in `assets/work/blog/<slug>/enrichment-notes.md`
   anhängen: was gesucht, was gefunden, was geändert, mit Quellenangaben.
5. `status` in `pending-enrichment.json` auf `"done"` setzen (Datei NICHT
   löschen).

Harte Regeln dabei: niemals `assets/work/{articles,books,events,games}/*`
(die Originale) anfassen, niemals `article.html` direkt überschreiben,
niemals einen anderen Slug als den in `pending-enrichment.json` genannten
anfassen, niemals `generate-blog-feed.mjs` während der Anreicherung selbst
laufen lassen.

**Bereits durchgeführt:**
- Als Beispiel/Test des Draft-Workflows: für `reznik-debater` (dem damals
  aktuell neuesten Post) wurde online zu "Taming the Debater Within"
  recherchiert (Erscheinungsjahr, Illustratorin, Verfügbarkeit, ein
  Testimonial-Zitat) und ein Entwurf + Anreicherungs-Notiz geschrieben.
  `article.html` blieb unverändert.
- **Ausnahme vom Draft-Workflow, auf expliziten Wunsch:** der Nutzer hat
  bemängelt, dass die automatisch generierten Kalender-Termine ("Wir sind
  am ... dabei" + die Notiz aus dem JSON) inhaltsleer wirken — "nichts
  daran ist recherchiert". Auf explizite Anweisung wurden 7 Kalender-
  Termin-Posts (EF-Konferenz, Wohlfühlmesse Gelsenkirchen, Leipziger
  Buchmesse, Vorarlberger Buchmesse, Werdauer Lebensfreude Messe,
  Esoteriktag Gelsenkirchen, Berliner Buchmesse) direkt recherchiert
  (WebSearch) und ihre `article.html`-Dateien **direkt** um einen
  Sachverhalts-Absatz ergänzt (Ort/Datum/Programm/Hintergrund der
  jeweiligen Messe) — diesmal ohne Draft-Umweg, weil der Nutzer das explizit
  so wollte. Das ändert NICHT das Standardverhalten des Generators
  (weiterhin write-once, weiterhin Draft-Workflow für die fortlaufende
  Ein-Post-pro-Zyklus-Anreicherung) — es war ein einmaliger redaktioneller
  Eingriff, vergleichbar mit einer Handbearbeitung von `meta.json`.

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

- **Homepage-Galerie/Modal zeigte `updated` statt `published` als Datum**:
  Drei Stellen in `index.html` (Bildunterschrift unter dem mittleren
  Karussell-Bild, sowie zweimal im Artikel-Modal) priorisierten
  `cur.updated`/`meta.updated` vor `cur.published`/`meta.published` beim
  Anzeigen des Datums — obwohl der Blog-Feed-Generator (`generate-blog-feed.mjs`)
  bereits korrekt auf "published zuerst" umgestellt worden war (siehe
  "Sortiert wird nach 'hinzugefügt'" oben). Zwei verschiedene Code-Pfade,
  nur einer war gefixt. Alle drei Stellen jetzt auf `published`-zuerst
  umgestellt. **Lehre:** Wenn dieselbe Datenfront (hier: "welches Datum
  zeigen wir an") an mehreren unabhängigen Stellen im Code dupliziert ist
  (Blog-Generator UND Homepage-Galerie), reicht es nicht, nur eine Stelle zu
  fixen — nach `grep -rn "\.updated"` suchen, um alle zu finden.
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
```

Shop-Produkte (`assets/shop/products.json`) sind kein Generator-Ziel mehr —
die Datei direkt bearbeiten (siehe "Shop-Daten vereinfacht").
