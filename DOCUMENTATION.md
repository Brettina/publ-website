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

### Überschriften-Schriftart: Papyrus

`assets/PAPYRUS.TTF` (vom Nutzer selbst hinzugefügt) ist als `@font-face`
ganz oben in `assets/styles.css` eingebunden und wird für `h1,h2,h3,h4`
site-weit verwendet, mit Fallback auf `Arial, sans-serif` falls die Datei
mal fehlt/nicht lädt: `font-family: "Papyrus", Arial, sans-serif;`. Zentral
an einer Stelle (geteiltes Stylesheet) statt pro Seite, da keine Seite eine
eigene `h1-h4`-Regel überschreibt. Zeilenabstand dieser Überschriften auf
`line-height: 1.45` erhöht (war `1.2`, wirkte mit Papyrus zu gedrängt).

Der Marken-Schriftzug "publish-Lohr" im Header ist aber ein `<a
class="brand">`, keine Überschrift — die `h1-h4`-Regel griff dort also
nicht. Extra `font-family: "Papyrus", Arial, sans-serif;` auf
`.site-header` in `assets/styles.css` ergänzt, damit auch Marken-Link und
Nav-Einträge Papyrus bekommen.

**Papyrus zeigte sich zunächst gar nicht** — Ursache war (wahrscheinlich)
derselbe Browser-Cache von `assets/styles.css` wie beim Brand-Icon-Bug
weiter unten, siehe "Browser-Cache von `assets/styles.css`".

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

### Rabatt-/Sale-System

**Eine zentrale Liste für alle Rabatte — Bücher UND Merch.** `"sales"`
ganz am Anfang von `assets/shop/products.json`, ein Eintrag pro
rabattiertem Artikel, verknüpft über die `id` (bei Merch die Produkt-`id`
aus derselben Datei, bei Büchern der Ordner-Slug aus `assets/work/books/`,
z. B. `"reznik-debater"`):

```json
"sales": [
  { "id": "reznik-debater", "percent": 10, "from": "2026-09-05", "until": "2026-09-08" }
],
```

`"amount"` statt `"percent"` für einen festen Euro-Abzug (z. B. `4.50`).
`"from"` und `"until"` sind beide optional (`"YYYY-MM-DD"`): ohne `"from"`
gilt der Rabatt sofort, ohne `"until"` unbefristet. Mit beiden gesetzt
schaltet sich der Rabatt (und damit Schärpe + Preis-Durchstreichung) am
`from`-Datum automatisch scharf und am Tag nach `until` automatisch wieder
ab — kein manuelles Ein-/Ausschalten oder Aufräumen nötig
(`getActiveSale()` prüft beide Grenzen bei jedem Seitenaufruf gegen das
aktuelle Datum). Einfach einen Eintrag hinzufügen/entfernen, ohne im
Produkt- oder Buch-Objekt selbst etwas anzufassen.

**Wichtig — nur EIN Ort dafür.** Zwei Zwischenstände wurden bewusst wieder
verworfen, bis das hier stand:
1. Erste Version hatte `sale` direkt im jeweiligen Merch-Produkt-Objekt in
   `products.json` — vom Nutzer verworfen ("das heißt ich muss ständig
   einzelne Produkte anfassen? nein, eine zentrale Liste").
2. Zweite Version hatte die zentrale `sales`-Liste, aber nur für Merch;
   Bücher trugen ihren Rabatt weiterhin einzeln im eigenen `meta.json`
   (`assets/work/books/<slug>/meta.json`). Auch das verworfen: "NO THE
   DISCOUNT INFO SHOULD GO IN PRODUCTS.JSON. all products, also books."

`webpages/webshop/index.html` liest die Liste über eine gemeinsame
`loadSalesById()`-Funktion (fetcht `products.json`, baut eine `Map` von
`id` → Sale-Objekt, gecacht in einem Promise pro Seitenaufruf); sowohl
`loadMerchProducts()` als auch `loadBooksFromWorkIndex()` schlagen dort
nach — keiner der beiden liest ein `sale`-Feld mehr aus dem jeweiligen
Quell-JSON selbst.

**Lehre:** Bei einer Funktion, die für mehrere Content-Typen gilt (hier:
Bücher UND Merch), nicht "pro Typ an der naheliegendsten Stelle" ablegen,
auch wenn das erst nach weniger Umbau aussieht — im Zweifel gleich die
eine echte zentrale Stelle bauen.

**Warum diese Trennung überhaupt Sinn ergibt (Buchpreisbindung):** Das ist
kein Zufall, sondern folgt aus deutschem Recht. Für Bücher gilt in
Deutschland die **Buchpreisbindung** (Buchpreisbindungsgesetz) — der
Verlag legt einen verbindlichen Endpreis fest, der (von engen gesetzlichen
Ausnahmen abgesehen) nicht beliebig rabattiert werden darf, und die
verschiedenen Ausgaben/Versionen eines Titels sind an feste, dauerhafte
Preisangaben gebunden. Deshalb gilt:

- **`assets/work/books/<slug>/meta.json`** enthält die echten, dauerhaften
  Angaben zu einem Buch — inkl. `price-print`/`price-digital`. Diese Datei
  gilt als **nicht anzutasten** für alles, was mit Preisänderungen zu tun
  hat. Nicht weil das technisch unmöglich wäre, sondern weil Bücher rechtlich
  anders (strenger) behandelt werden müssen als Merch.
- **`assets/shop/products.json`** ist bewusst der Ort für alles, was sich
  **ändern darf** — die zentrale `sales`-Liste (siehe oben) gilt für Bücher
  UND Merch, weil ein zeitlich befristeter Rabatt nach den gesetzlichen
  Ausnahmen der Buchpreisbindung zulässig ist, aber eben nur als
  vorübergehende, klar befristete Aktion, nicht als dauerhafte
  Preisänderung am Buch selbst. Merch (T-Shirts, Socken etc.) unterliegt
  der Buchpreisbindung ohnehin nicht und darf frei rabattiert werden — es
  lebt in derselben Datei, weil es ohnehin schon "das veränderliche Zeug"
  ist, keine so strengen Regeln wie Bücher befolgen muss.

Praktische Konsequenz für zukünftige Änderungen: **niemals** `price-print`/
`price-digital` (oder andere feste Angaben) in einem Buch-`meta.json`
verändern, um einen Rabatt abzubilden — Rabatte gehören ausschließlich in
die `sales`-Liste von `products.json`, die Buch-Originalpreise bleiben
davon unberührt und werden zur Laufzeit nur für die Anzeige reduziert
(`applySale()`), nie im Quell-JSON selbst überschrieben.

`webpages/webshop/index.html` enthält die weitere Logik zentral:

- `getActiveSale(sale)` — prüft, ob `percent`/`amount` gesetzt und `until`
  (falls vorhanden) noch nicht abgelaufen ist. Kein Enddatum = Rabatt läuft
  unbefristet weiter.
- `applySale(basePrice, sale)` — rechnet den reduzierten Preis aus.
- `saleRibbonLabel(sale)` — baut den Text ("-10% bis 08.09.2026").

Der Rabatt wirkt auf **jeden Preis, auf den er angewendet wird** — bei
Büchern mit Print- und E-Book-Preis wird `applySale()` separat auf
`pricePrint` und auf `priceDigital` angewendet (abhängig davon, welche
Variante im Modal gerade ausgewählt ist), nicht auf einen gemeinsamen
Gesamtpreis. Beide Preise sind also unabhängig um denselben Prozentsatz/
Betrag reduziert; auf der Karte selbst wird nur der "ab"-Preis
(`p.price` = das Minimum aus beiden) mit Rabatt und Durchstreichung gezeigt.

Angewendet an drei Stellen: Karten-Preiszeile (Durchstreichung),
Modal-Preiszeile (Durchstreichung + `.sale-badge`-Pille), und beim
Warenkorb/Bestellmail (`getUnitPriceForVariant()` → `applySale()`), damit
der tatsächlich in der Mail stehende Preis korrekt reduziert ist.

**Sale-Ribbon — Verlauf der Korrekturen:** Drei Iterationen, jeweils ohne
Möglichkeit, live im Browser zu testen (kein Browser-Zugriff in dieser
Umgebung) — Winkel/Größe/Position sind jedes Mal eine begründete Schätzung.

1. Erste Version: `/img/schaerpe.png` (fertige, transparente Schärpen-Grafik,
   ~32° Diagonale bereits ins Bild gezeichnet) 1:1 in einer 150×100px-Box
   oben rechts, separat um -34° gedrehter Text darüber. Zu groß, Winkel
   nicht sauber ("nicht diagonal... 45 grad").
2. Zweite Version: Bild und Text in einem gemeinsamen
   `.sale-ribbon-band`-Wrapper, der als Ganzes um -13° gedreht wird (addiert
   sich zum ~32°-Winkel im Bild zu ~45°). Box auf 110×80px verkleinert. **Bug
   dabei entdeckt:** Da der Text selbst keine eigene Rotation hatte und nur
   die Rotation des Eltern-Wrappers erbte, landete er nur bei -13° statt bei
   den beabsichtigten ~45° — er lag also nicht wirklich auf der Diagonale
   des Bildes.
3. Aktuelle Version (Screenshot-Feedback: Schärpe soll gespiegelt sein und
   die **linke obere** Ecke überlappen, Text soll dazu ausgerichtet sein,
   darf größer sein): Bild und Text sind jetzt unabhängige Geschwister-
   Elemente statt verschachtelt, beide rotieren um denselben Box-Mittelpunkt
   (`transform-origin: center center`), das behebt auch den Bug aus Schritt 2.
   Bild: `transform: scaleX(-1) rotate(13deg)` — horizontal gespiegelt (damit
   die Schärpe von der rechten in die linke Ecke "kippt") und um 13°
   nachgedreht, um wieder auf ~45° zu kommen. Text: eigenständig
   `transform: rotate(45deg)`, zentriert per Flexbox über die volle Box, statt
   prozentual positioniert. Box vergrößert auf 150×115px, Schriftgröße auf
   `0.78rem`, Container von `right:0` auf `left:0` verschoben.
4. Nutzer-Feedback zu Schritt 3: Schärpe sitzt jetzt gut (Rückmeldung
   "much better"), aber noch zu weit rechts, darf größer sein, und der
   Text ist "in die andere Richtung, 25 Grad" verdreht. **Ursache
   gefunden:** CSS wendet bei `transform: scaleX(-1) rotate(13deg)` die
   Funktionen von rechts nach links an — `rotate(13deg)` wirkt zuerst (auf
   den ~32°-Winkel im Originalbild), **danach erst** `scaleX(-1)`. Per
   Vektor-Rechnung ergibt das einen finalen Winkel von nur ~19°
   (32° − 13°), nicht die geplanten ~45°. Da dem Nutzer genau dieses ~19°-
   Ergebnis optisch gefallen hat, wurde **nicht** der Bild-Winkel
   korrigiert, sondern der Text auf denselben ~19° gebracht
   (`transform: rotate(19deg)` statt `rotate(45deg)`), damit beide
   zueinander passen. Box weiter vergrößert (190×145px) und mit
   `top:-14px; left:-14px` bewusst über den Kartenrand hinaus nach
   oben-links verschoben, damit die sichtbare Schärpe näher an die
   tatsächliche Ecke rückt (das Motiv hat selbst einen transparenten Rand,
   der sonst wie ein Versatz nach rechts/unten wirkt).

**Lehre:** Bei mehreren `transform`-Funktionen in einer Liste wird die
**rechteste zuerst** angewendet, nicht die linkeste — `scaleX(-1)
rotate(Xdeg)` bedeutet "erst rotieren, dann spiegeln", nicht umgekehrt.
Das ist eine häufige Fehlerquelle bei kombinierten CSS-Transforms und hat
hier zu einem falsch berechneten Winkel geführt.

5. Nutzer-Feedback zu Schritt 4 (Screenshot): Schärpe jetzt gut sichtbar,
   aber oben abgeschnitten, Text sichtbar falsch gedreht ("nicht so weit
   gedreht wie die Schärpe, obwohl beide gleich viel gedreht sind!"), und
   generell zu weit rechts. **Zwei echte Fehler gefunden:**
   - Der `top:-14px; left:-14px`-Trick aus Schritt 4 schob `.sale-ribbon`
     selbst über seine eigenen Grenzen hinaus — aber `.shop-img`/
     `.shop-card` haben `overflow:hidden` und schneiden daher alles ab, was
     über `.sale-ribbon` hinausragt. Das war keine kontrollierte
     Beschneidung, sondern hat den oberen Teil der Schärpe (die Spitze)
     verschluckt. Fix: `.sale-ribbon` bleibt bei `top:0; left:0`, keine
     negativen Versätze mehr auf dem Container.
   - Die ~19°-Schätzung aus Schritt 4 war **falsch**, weil die
     Grundannahme falsch war: die Schärpe im PNG wurde für "steigend
     links→rechts" (`/`) gehalten, ist aber tatsächlich **fallend**
     links→rechts (`\`). Das wurde diesmal nicht geschätzt, sondern direkt
     aus den Pixeldaten gemessen (`python -c "from PIL import Image..."`,
     pro Spalte den Pixel mit dem höchsten Alphawert gesucht und eine
     Gerade durch alle Punkte gelegt): echter Winkel **~29°, fallend**.
     Mit `scaleX(-1) rotate(13deg)` (rotate zuerst, siehe Lehre oben:
     29°+13°=42°, immer noch fallend), dann erst gespiegelt → eine
     fallende Linie wird beim Spiegeln zu einer **steigenden** — Endergebnis
     also **~42° steigend**, nicht 19°. Text korrigiert auf
     `rotate(-42deg)`. Zusätzlich das `top:-20px;left:-20px;width:130%;
     height:130%`-Übergrößen-Cropping auf dem `<img>` wieder entfernt
     (dasselbe Risiko wie beim Container: unvorhersagbar, welcher Teil der
     Grafik verschwindet) — jetzt schlicht `inset:0; width:100%; height:100%;
     object-fit:contain`, garantiert vollständig sichtbar, dafür Box auf
     190×150px vergrößert, damit es trotzdem groß genug wirkt.

**Lehre (Messen statt Schätzen):** Ab Schritt 5 wurde der tatsächliche
Winkel direkt aus der PNG-Datei gemessen statt aus dem gerenderten
Screenshot geschätzt — zwei Iterationen lang (Schritt 3 und 4) beruhte die
gesamte Rechnung auf einer falsch eingeschätzten Richtung (steigend statt
fallend), was trotz korrekter Formel ein falsches Ergebnis lieferte.
Screenshots von gerendertem, bereits transformiertem Text/Bild sind zum
Abschätzen einer Diagonale unzuverlässig; ein kurzes Pixel-Scan-Skript
gegen die Originaldatei ist es nicht.

Textwinkel steht in `webpages/webshop/index.html` in der Regel
`.sale-ribbon span { transform: rotate(-42deg); ... }` — dieser Wert kann
von Hand nachjustiert werden, bis er optisch zur Schärpe passt.

6. Nutzer-Feedback: Winkel jetzt gut, aber Schärpe und Text sollen weiter
   nach oben links, sodass der Text vollständig auf dem sichtbaren
   Schärpenband liegt statt teilweise daneben. Da der Container selbst
   nicht mehr negativ verschoben werden darf (siehe Schritt 5 — sonst wieder
   Beschneidung durch `.shop-img`/`.shop-card`), wird stattdessen NUR die
   Position INNERHALB der Box verschoben:
   - Bild: `object-position: top left` zusätzlich zu `object-fit: contain`
     — verschiebt das sichtbare (vollständig unbeschnittene) Motiv
     innerhalb seiner Box nach oben links, statt es wie bisher zu
     zentrieren.
   - Text: die `span`-Box selbst verkleinert von `inset:0` (volle Box) auf
     `top:0; left:0; width:70%; height:70%` — dadurch liegt ihr eigener
     Mittelpunkt (= `transform-origin: center center`, der Dreh-Angelpunkt)
     automatisch weiter oben links statt in der Mitte der vollen Box. Bewusst
     NICHT über `align-items/justify-content: flex-start` gelöst — das hätte
     den Dreh-Angelpunkt selbst verschoben und das Rotationsergebnis
     unvorhersehbar gemacht (der Angelpunkt bleibt so weiterhin die Mitte
     einer Box, nur einer kleineren, statt an eine Ecke verlegt zu werden).

7. **Architektur-Neubau (Nutzer-Vorschlag, umgesetzt):** Statt weiter an
   Bild- und Text-Winkel getrennt zu justieren, wurde die Konstruktion
   grundsätzlich vereinfacht — Vorschlag des Nutzers: "wenn Text als Kind
   des Ribbons drin steckt, löst das doch das Rotationsproblem". Die
   Schärpe ist jetzt **ein einziges** `<div class="sale-ribbon">` mit dem
   Rabatt-Text als eigenem `textContent` (kein verschachteltes `<img>` +
   `<span>` mehr), mit `background: linear-gradient(...)` (Gold-Ton) statt
   `schaerpe.png`, und **einem** `transform: rotate(-42deg)` auf genau
   diesem einen Element. Damit rotieren Hintergrund und Text zwangsläufig
   immer exakt gleich — es gibt keine zwei Werte mehr, die auseinanderlaufen
   können. Grund für den Wechsel weg von `schaerpe.png`: die Grafik hat
   selbst schon eine feste Diagonale ins Bild gezeichnet (siehe Schritt 5) —
   genau das war über mehrere Runden hinweg die Ursache für Fehlberechnungen,
   sobald man versuchte, sie zusätzlich zu drehen/spiegeln. Ein einfacher
   Verlaufshintergrund hat dieses Problem nicht.

8. **Ribbon darf jetzt über das Bild hinausragen** (Nutzer-Wunsch: "es
   sollte overflowen"). Vorher saß die Schärpe zwangsläufig komplett
   innerhalb von `.shop-img`, weil sowohl `.shop-img` als auch `.shop-card`
   `overflow: hidden` hatten (nötig, um Bild-Ecken abzurunden bzw. die
   Galerie zu begrenzen). Beides auf `overflow: visible` umgestellt; damit
   das nicht zu eckigen Ecken am Bild führt, tragen `.shop-img` UND das
   `<img class="gallery-img">` jetzt selbst `border-radius: 16px 16px 0 0`
   (vorher kam die Rundung nur indirekt vom Zuschneiden der Eltern-Box).

Aktuelle Werte: `webpages/webshop/index.html`, Regel `.sale-ribbon` — Größe,
Position (`top`/`left`) und Winkel (`transform: rotate(-42deg)`) sind
weiterhin Schätzungen ohne Browser-Vorschau, aber jetzt strukturell
unmöglich, aus dem Gleichgewicht zu bringen (Text und Hintergrund sitzen
auf demselben Element).

### Seiten-Hintergrundbild (Startseite, Blog, Webshop)

Alle drei Seiten (`index.html`, `webpages/blog/index.html`,
`webpages/webshop/index.html`) haben in ihrem jeweils eigenen
`<style>`-Block (nicht in der geteilten `assets/styles.css`, damit
Rechts-/Impressum-Seiten unverändert bleiben) dieselbe Regel:

```css
body {
  background-color: #0b0c0f;
  background-image: url("/img/bg.png");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
}
```

`background-attachment: fixed` ist bewusst gesetzt: Ohne das würde
`background-size: cover` sich auf die (bei langen Seiten wie dem
Blog-Feed potenziell sehr hohe) `<body>`-Box beziehen und das Bild extrem
hochskalieren/verzerren. Mit `fixed` bezieht sich `cover` stattdessen auf
die Viewport-Größe.

Damit man den Hintergrund durch die Karten hindurch sieht, überschreibt
jede der drei Seiten zusätzlich lokal die geteilte `.card`-Hintergrundfarbe
aus `assets/styles.css`:

```css
.card {
  background: color-mix(in srgb, var(--panel) 30%, transparent);
}
```

**Bewusste Abweichung vom wörtlichen Wunsch:** Angefragt war
`opacity: 0.3` auf den Karten-Divs. Echtes `opacity` auf dem ganzen
Element hätte aber auch Text, Icons und Rahmen der Karte mitverblasst —
bei Text auf einer stark strukturierten Hintergrund-Textur wäre das kaum
noch lesbar gewesen. Stattdessen wird nur die *Hintergrundfarbe* der
Karte transparent gemacht (`color-mix(..., 30%, transparent)`), Text und
Rahmen bleiben voll sichtbar/lesbar — der optische Effekt ("man sieht den
Hintergrund durch die Karte") ist derselbe, nur ohne den Lesbarkeits-
Nachteil.

### Shop-Karten-Bild: `cover` → `contain` (kein hartes Zuschneiden mehr)

`.shop-img .gallery-img` nutzte `object-fit: cover`, was hochformatige
Bilder (z. B. das Debater-Cover) in der festen 220px-Höhe der Karte hart
oben/unten beschnitten hat. Umgestellt auf `object-fit: contain`
(zusammen mit `background: rgba(0,0,0,0.08)` auf dem `.shop-img`-Container
als Füllung für den entstehenden Leerraum) — das Bild wird vollständig
angezeigt, zuerst nach Breite eingepasst, kein Zuschneiden mehr. Genau das
Muster, das für `.modal-img` schon vorher galt (dort war der Kommentar
"looks cleaner with contain" bereits vorhanden).

### Weitere Runde Nutzer-Feedback (Screenshot) — vier Probleme auf einmal

1. **Schärpen-Text weiterhin falsch gedreht.** Vorheriger Wert
   `rotate(19deg)` hatte offenbar das falsche Vorzeichen — auf `rotate(-19deg)`
   umgedreht. (Ohne Browser-Zugriff bleibt das eine Schätzung; Wert steht in
   `.sale-ribbon span` in `webpages/webshop/index.html`.)
2. **"Opacity hinter Bücher & Merch ist noch 0%".** Die vorherige
   `.card`-Transparenz-Regel griff nur bei Produktkarten — die "Laden"-
   Kopfzeile (`.page-hero`), der Abholhinweis (`.note-block`) und der
   "Bücher & Merch"-Rahmen (`.section`) sind **eigene** CSS-Klassen, keine
   `.card`. Fix: dieselbe `color-mix(..., 30%, transparent)`-Regel greift
   jetzt für alle vier Klassen zusammen (`.card, .page-hero, .note-block,
   .section`), auf allen drei Seiten (Startseite, Blog, Webshop).
3. **Karten-Titel/Chip überlappen ins nächste Element** (z. B. bei
   "Morphologische Geheimnisse..." mit Tag "relationship"). Ursache:
   `.shop-topline` hatte kein `flex-wrap`, und `.shop-badge` darf laut
   `flex-shrink: 0` nie schrumpfen — wenn Titel *und* Badge zusammen nicht
   in die Kartenbreite passen, gibt es dadurch keinen Ausweg außer
   Überlaufen (von `.shop-card`s `overflow:hidden` dann hart abgeschnitten,
   sichtbar als "cut off"). Fix: `.shop-topline { flex-wrap: wrap; }` —
   der Badge rutscht bei Bedarf einfach in eine eigene Zeile.
4. **Schärpe oben abgeschnitten, Text nicht sichtbar über der Schärpe.**
   Ursache: `.sale-ribbon` hatte `top:-14px; left:-14px`, um die Grafik
   näher an die echte Ecke zu ziehen — aber `.shop-img`/`.shop-card` haben
   selbst `overflow:hidden`, also wurde genau der Teil, der über den
   `.sale-ribbon`-Rahmen hinausragte, von der **Eltern**-Box weggeschnitten
   (nicht beabsichtigt). Fix: `.sale-ribbon` selbst bleibt jetzt bei
   `top:0; left:0`, komplett innerhalb von `.shop-img`. Der "näher an die
   Ecke ziehen"-Trick (überdimensioniert + negativ verschoben) sitzt
   stattdessen auf dem `<img>` selbst, das nur vom eigenen (gewollten)
   `.sale-ribbon`-`overflow:hidden` beschnitten wird. Zusätzlich `z-index`
   explizit auf Bild (1) und Text (2) gesetzt, damit der Text garantiert
   über der Schärpe liegt statt sich nur auf DOM-Reihenfolge zu verlassen.

### Transparenz-Hierarchie (aktueller, korrekter Stand: ZWEI Stufen)

**Denkrichtung: von innen nach außen, nicht von außen nach innen.**
Explizite Nutzer-Korrektur: Das Wichtigste ist, dass die INNERSTE Einheit
opak ist — nicht, dass alle äußersten Elemente überall denselben
Transparenzwert haben. Man geht die Verschachtelung vom tiefsten Inhalt
aus gedanklich nach außen durch, nicht umgekehrt vom Seitenrand nach
innen. Der Fehler, den man dabei vermeiden muss: irgendwo einen fixen
Prozentsatz für "die äußerste Ebene" festzulegen und zu hoffen, dass er
überall passt — denn ein Kasten mit einem EIGENEN, separat gesetzten
Hintergrund (wie `.cart-hero`, `.hero`, `.service-item`, die Kalender-
Buttons — jedes davon an anderer Stelle in dieser Doku beschrieben) hält
sich nicht an eine global deklarierte Prozent-Regel, wenn er selbst schon
einen eigenen Wert mitbringt. Ergebnis, wenn man das übersieht: ein
harter Kontrast-Sprung zwischen einem korrekt opaken innersten Element
und einem direkt danebenliegenden/umschließenden Element, das (weil
übersehen) noch seinen alten, viel transparenteren Wert behalten hat —
obwohl die äußerste Ebene der Seite insgesamt einen sauberen Verlauf zeigt.

**Die Regel, aktuell gültig:** Es gibt genau zwei Kategorien, und die
Einordnung richtet sich nach STRUKTUR, nicht nach Verschachtelungstiefe
und nicht danach, ob ein Element selbst irgendwo "ganz oben" auf der
Seite sitzt:

- **BRANCH** — ein Kasten, der MEHRERE eigenständige Kind-Inhalte
  umschließt (eine Karten-Gruppe wie bei `.section` in seiner normalen
  Verwendung: "Neues", "Rabattaktionen", "Kontaktieren Sie mich!" — ODER
  mehrere verschiedenartige Inhalts-Blöcke wie bei `.hero`, das Überschrift
  + Fließtext + die `.leistungs-chips`-Zeile umschließt): **transparent,
  50%**. Der Hintergrund soll in den Lücken um/zwischen diesen Kind-
  Elementen sichtbar sein.
- **LEAF** — die tatsächlich kleinste/dichteste Inhaltseinheit an dieser
  Stelle, die selbst nichts Nennenswertes weiter umschließt: `.card`,
  `.page-hero`, `.note-block`, `.service-item` (Akkordeon-Zeilen),
  `.leistungs-chips .chip` (einzelne Pill-Chips — NICHT `.hero` selbst,
  s.u.), die Kalender-Tages-Buttons (Inline-Style in `renderMonth()`), und
  die Ausnahme `.section[aria-labelledby="contact"]` (hält das
  Kontaktformular direkt statt Karten zu umschließen — untypisch für
  `.section`, deshalb per Attribut-Selektor einzeln herausgenommen):
  **immer fast vollständig opak, `color-mix(..., 99.9%, transparent)`** —
  nur 0,1 % Hintergrund-Durchschein.

Umgesetzt identisch auf allen drei Seiten (Startseite, Blog, Webshop) —
Blog/Webshop haben keine `.leistungs-chips`, kein `.service-item`, keinen
Kalender und keine "contact"-Ausnahme, sonst dieselbe Zwei-Stufen-Logik.

**Warum nicht mehr Stufen, und warum `.hero` KEIN Leaf ist (Verlauf der
Korrekturen):** Ursprünglich eine einzige 30%-Stufe für alles (zu
inkonsistent), dann eine 4-stufige Skala nach Verschachtelungstiefe
(50/65/80/90%), dann (kurzzeitig) `.hero` als Leaf eingestuft, weil es
"ganz oben, nicht in einem Eltern-Panel verschachtelt" ist. Der Nutzer
korrigierte das ausdrücklich: **`.hero` selbst ist der falsche Ort** — es
umschließt mehrere eigenständige Stücke (Überschrift, Fließtext, die
Chip-Zeile), ist also ein BRANCH; die wirklich innerste Einheit darin sind
die einzelnen `.chip`-Pills. Das war der entscheidende Denkfehler: "ganz
oben auf der Seite, nichts wraps mich" ist NICHT dasselbe wie "hält
Inhalt direkt, ohne selbst mehrere Kind-Stücke zu umschließen". Daraus
folgt die endgültige Regel oben: die Frage ist immer "ist DIES die
kleinste/dichteste Einheit an dieser Stelle, oder umschließt es mehrere
solche Einheiten" — nicht Tiefe, nicht Position auf der Seite.

Zwei weitere, konkrete Bugs beim Umsetzen gefunden:

- `.service-item` hatte in `assets/styles.css` **zusätzlich** eine ältere,
  eigene Regel `background: rgba(0,0,0,0.02)` (weiter unten im selben
  `<style>`-Block als die Transparenz-Hierarchie-Regel) — bei gleicher
  Spezifität gewinnt die spätere Regel im Quelltext, das hat die 99,9%-
  Regel also lautlos überschrieben. Entfernt (background-Deklaration dort
  ersatzlos gestrichen, die Hierarchie-Regel bestimmt es jetzt exklusiv).
- Die Kalender-Tages-Buttons setzen ihr `background` **inline** per
  JavaScript-Template-String in `renderMonth()` (`style="...
  background:transparent; ..."`) — das kann keine externe CSS-Regel
  normalerweise überschreiben. Direkt im Template-String auf
  `color-mix(in srgb, var(--panel) 99.9%, transparent)` geändert, statt
  über CSS zu versuchen, das Inline-Style zu überstimmen.
- Zusätzlich `!important` auf beide Stufen-Regeln (BRANCH und LEAF)
  ergänzt, auf allen drei Seiten — nachdem `.service-item` schon einmal
  lautlos überschrieben wurde, ist das eine bewusste Absicherung gegen
  weitere, noch unentdeckte ältere Einzel-Regeln irgendwo im selben
  `<style>`-Block oder in `assets/styles.css`.
- `.cart-hero` ("Deine Auswahl"-Warenkorb-Box im Webshop) hatte ebenfalls
  einen eigenen, separat gesetzten Hintergrund:
  `background: rgba(255, 230, 150, 0.20)` — ein warmer Cremeton bei nur
  20% Deckkraft, dadurch fast unlesbar über der Hintergrund-Textur. **Nicht
  einfach die Deckkraft dieses Cremetons erhöht** — bei ~94% Deckkraft wäre
  daraus eine fast massive HELLE Box geworden, während der Text darin
  (`h2`/`p`, kein eigens gesetztes `color`) die normale HELLE `--text`-Farbe
  des dunklen Themes erbt — Ergebnis wäre helle Schrift auf hellem
  Hintergrund gewesen, also grundsätzlich falsch. Stattdessen den
  Cremeton IN den dunklen `--panel`-Ton gemischt:
  `color-mix(in srgb, var(--panel) 88%, rgba(255, 230, 150, 0.6))` — bleibt
  dunkel genug für die vorhandene helle Schrift, behält aber einen
  warmen goldenen Unterton als optisches Highlight.

**Lehre:** Bei einer "Leaf = opak"-Regel ist die relevante Frage nicht
"wie tief ist dieses Element verschachtelt" oder "sitzt es ganz oben ohne
Eltern-Panel", sondern "umschließt DIESES Element mehrere eigenständige
Kind-Inhalte, oder IST es die dichteste Einheit selbst". Und: jede
Komponente mit einem EIGENEN, unabhängig gesetzten Hintergrund — ob als
CSS-Regel (`.service-item`) oder als Inline-Style (Kalender-Buttons) —
muss einzeln gefunden und eingeordnet werden; generische
`.card`/`.section`-Regeln treffen sie nicht automatisch, und Inline-Styles
schlagen externes CSS ohnehin unabhängig von der Reihenfolge.

**Zweite Lehre (Kontrast beim Opak-Machen prüfen):** Beim Erhöhen der
Deckkraft eines Kastens mit einer EIGENEN, ungewöhnlichen Hintergrundfarbe
(wie `.cart-hero`s warmer Cremeton, statt des üblichen dunklen `--panel`)
immer auch die TEXTFARBE innerhalb prüfen — nicht blind den Alpha-Wert der
existierenden Farbe hochsetzen. Text ohne eigene `color`-Angabe erbt die
Theme-Textfarbe (hell im dunklen Theme), und ein naiv auf ~94% Deckkraft
hochgesetzter heller Cremeton hätte helle Schrift auf hellem Hintergrund
ergeben. Der Fix mischt die Akzentfarbe stattdessen IN den dunklen
`--panel`-Ton, statt sie pur hochzuskalieren.

### Shop-Karten: Titel/Chip überlappten trotz `flex-wrap: wrap`

Ein früherer Fix für "Titel und Tag-Chip passen nicht nebeneinander"
(`.shop-topline { flex-wrap: wrap; }`) hat objektiv **nichts** bewirkt —
sichtbar am Screenshot mit "Morphologische Geheimnisse..." und dem Chip
"relati…", die weiterhin ineinander liefen. Ursache: `.shop-topline h3`
hat `min-width: 0`, das erlaubt dem Titel, sich beliebig schmal zu machen
und stattdessen intern (mehrzeilig) umzubrechen — für die Flexbox-
Berechnung "passt" dadurch immer alles in eine Zeile (der Titel wird
einfach immer schmaler/höher), `flex-wrap` hat also nie einen Grund
einzugreifen. Fix: `.shop-topline` komplett auf `flex-direction: column`
umgestellt — Titel und Chip stehen jetzt IMMER untereinander, unabhängig
von Textlänge, keine Wrap-Bedingung mehr nötig.

### Browser-Cache von `assets/styles.css` — Versions-Query eingeführt

Zweimal in dieser Session hat der Nutzer eine CSS-Änderung gemeldet, die
angeblich nicht ankam (Brand-Icon-Größe, jetzt die neue Papyrus-
Schriftart) — beide Male stellte sich (beim ersten Mal bestätigt, beim
zweiten Mal als wahrscheinlichste Ursache angenommen) heraus, dass der
Browser die alte `styles.css` aus dem Cache zeigte, da der Link keine
Versionierung hatte. Fix: `<link rel="stylesheet" href="/assets/styles.css">`
auf allen Seiten (Startseite, Blog, Webshop, alle vier `regulation/*`-Seiten)
auf `?v=2` umgestellt. **Das muss von Hand hochgezählt werden** (`?v=3`,
`?v=4`, …) nach künftigen Änderungen an `assets/styles.css`, damit Besucher
mit einer bereits gecachten Version die Änderung auch sehen — es gibt
keinen Build-Schritt, der das automatisch erledigt.

### Tags auf Deutsch anzeigen

Tags in den `meta.json`-Dateien der Bücher (`therapy`, `christian`,
`relationship`, `facereading`, `guide`, `publishing`, `translation`,
`biography`, `book`) sind auf Englisch, weil sie ursprünglich auch als
interne Filter-Schlüssel gedacht waren. Nutzerwunsch: auf der Website
sollen Tags aber immer auf Deutsch erscheinen. Lösung: ein kleines
Wörterbuch `TAG_LABELS_DE` + Hilfsfunktion `tagLabel(t)`, dupliziert in
`webpages/webshop/index.html` und `index.html` (kein gemeinsames
JS-Modul in diesem Projekt, andere kleine Helfer wie `formatDate` sind
aus demselben Grund ebenfalls pro Seite dupliziert). **Wichtig:** nur die
ANGEZEIGTE Bezeichnung wird übersetzt — der zugrunde liegende Tag-Wert
(für Filter-Vergleiche, `<option value="...">`, Sortierung) bleibt
Englisch/unverändert, damit Filterung und Verlinkung nicht bricht.
Angewendet an allen Stellen, wo ein Tag sichtbar gerendert wird:
Shop-Karten-Badge, Tag-Filter-Dropdown (Webshop), Produkt-Modal
("Themen: …", vorher "Tags: …"), und die Tag-Chips im Homepage-Blog-Modal.
Neuer Tag in einem `meta.json`? Muss zusätzlich in beide
`TAG_LABELS_DE`-Wörterbücher eingetragen werden, sonst erscheint er
unübersetzt (Fallback: das Original wird angezeigt, keine kaputte Anzeige,
aber eben auf Englisch).

### Autor als eigene Zeile statt Teil des Buchtitels

Bisher stand der Autor als Suffix im `title`-Feld selbst ("Den Zweifler in
uns zähmen - von Peter S. Reznik"). Der Nutzer entfernt diesen Suffix jetzt
händisch aus allen Buch-`title`-Feldern und trägt stattdessen ein eigenes
`"author"`-Feld in die jeweilige `meta.json` ein (z. B.
`assets/work/books/reznik-debater/meta.json`) — bei allen drei
existierenden Büchern zum Zeitpunkt dieses Eintrags bereits erledigt.

`webpages/webshop/index.html` liest `meta.author` jetzt in
`loadBooksFromWorkIndex()` und zeigt ihn an zwei Stellen als eigene Zeile
unter dem (Papyrus-)Titel an, bewusst in **Arial statt Papyrus** (neue
Klasse `.shop-author { font-family: Arial, sans-serif; ... }`), damit der
Autorenname als schlichte, gut lesbare Nebeninformation von der
dekorativen Überschrift abgesetzt bleibt:
- Karten-Ansicht (`renderProducts()`): `<p class="shop-author">von …</p>`
  direkt unter `.shop-topline`.
- Produkt-Modal: neues, fest im Markup stehendes `<p id="modal-author"
  class="shop-author">` unter `#modal-title`, befüllt in
  `openProductModal()`.

Merch-Produkte haben kein `author`-Feld → die Zeile wird für sie einfach
nicht gerendert (leere/undefinierte `p.author` wird geprüft, bevor das
Element überhaupt erzeugt wird).

### Farbe für gedämpften/sekundären Text (`--muted`) ans Corporate Design angepasst

`--muted` war ein kühles Blaugrau (`#b7c0cd` dunkel / `#4b5563` hell) —
schlecht lesbar über der neuen braun-goldenen `bg.png`-Textur und passte
farblich nicht zum sonstigen Erscheinungsbild (goldene Schärpe,
"moldy"-Icon, Papyrus-Look). Geändert in `assets/styles.css` auf ein
warmes Braun/Gold aus derselben Familie: `#c9b48f` (dunkles Theme),
`#6b5a3f` (helles Theme) — deutlich besser lesbar auf dem braunen
Hintergrund und zugleich klar vom normalen `--text` unterscheidbar,
bewusst nicht das gleiche Blaugrau-Konzept wie vorher. Zentral in der
CSS-Variable geändert, betrifft site-weit jeden Text, der `--muted`
referenziert (u. a. `p`, `.fineprint`).

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

### Seiten mit `bg.png` erzwingen jetzt IMMER das dunkle Theme

Die drei Seiten mit dem `bg.png`-Hintergrund (Startseite, Blog, Webshop)
setzen jetzt am Anfang ihres eigenen `<style>`-Blocks alle Theme-Variablen
(`--bg`, `--panel`, `--text`, `--muted`, `--border`, `--shadow`) fest auf
die dunklen Werte, unabhängig von `prefers-color-scheme`. Grund: die
geteilte `assets/styles.css` schaltet unter `prefers-color-scheme: light`
auf ein helles Theme mit fast schwarzer Schrift (`--text: #111827`) um —
das ist für eine WEISSE Seite gedacht. Läuft der Besucher mit
System-Einstellung "hell", würde diese fast-schwarze Schrift jetzt über
Panels sitzen, die (transparent) das dunkle `bg.png`-Foto durchscheinen
lassen: dunkle Schrift auf dunklem Foto, quasi unlesbar — eine
Lesbarkeits-Regression, die die helle Theme-Farbpalette nie berücksichtigen
musste, weil es "bg.png hinter allem" vorher nicht gab. Die Redeklaration
in jeder Seiten-eigenen `<style>`-Regel (kein `@media`, also bedingungslos)
gewinnt gegen die geteilte, media-query-bedingte Regel unabhängig von der
System-Einstellung, weil sie bei gleicher Spezifität später im Quelltext
lädt (lokales `<style>` kommt nach dem externen `<link>`).

### "Kontaktieren Sie mich!" — LinkedIn und Mail in einem Abschnitt zusammengeführt

Waren zwei separate `<section class="section">`-Blöcke (`profiles` für
LinkedIn, `contact` für das Mail-Formular). Nutzer-Wunsch: beides soll im
selben Abschnitt/Div sitzen. Zusammengeführt zu EINEM
`<section aria-labelledby="profiles">` mit `.cards`-Grid, das jetzt ZWEI
`.card`-Kinder enthält: "LinkedIn" und "... oder klassisch per Mail."
(Mail-Inhalt jetzt in ein eigenes `<article class="card">` gewrappt statt
direkt im `.section` zu stehen). Dadurch entfällt die vorherige Sonder-
Ausnahme `.section[aria-labelledby="contact"]` in der Transparenz-
Hierarchie-Regel (dieser `.section` hielt vorher das Formular direkt statt
Karten zu umschließen — jetzt ist es ein ganz normaler, Karten
umschließender `.section`, keine Ausnahme mehr nötig). Die `id="contact"`
lebt weiter (jetzt auf einem `<h3>` statt `<h2>`, da es eine Unterüberschrift
innerhalb der zusammengeführten Section ist) — keine internen Links
referenzieren `#contact`, also unkritisch.

### `.form`/`.field` hatten überhaupt kein CSS — jetzt in `assets/styles.css`

Das Kontaktformular sah unausgerichtet aus (schmales "Name"-Feld inline
neben dem Label, "Nachricht"-Label scheinbar an der falschen Stelle). Bei
der Fehlersuche: **`.form` und `.field` hatten in der gesamten Codebase
keine einzige CSS-Regel** — weder in `assets/styles.css` noch in einem
Seiten-`<style>`-Block. Jedes Formular auf der Seite (Startseite-Kontakt,
Webshop-Checkout, Blog-Suche/Filter) fiel deshalb auf reine Browser-
Standarddarstellung zurück: `<label>` und `<input>` sitzen als Inline-
Elemente nebeneinander in ihrer intrinsischen Breite (ein `<input>` ist von
Haus aus nur ~20 Zeichen breit), während ein `<textarea>` eine andere,
breitere Standardbreite hat — daher der optische Bruch zwischen den
Feldern. Fix: `.form`/`.field`-Grundregeln zentral in
`assets/styles.css` ergänzt (Label über volle Breite, Eingabefelder auf
`width:100%` vereinheitlicht, `.field.checkbox` als eigene Variante für
die Checkbox-Zeile, die weiterhin nebeneinander stehen soll). Zentral statt
pro Seite, weil alle drei Seiten dieselben Klassen ohne eigene Überschreibung
verwenden.

### Kalender-Projektlinks erneut kaputt (dieselbe Regression wie früher in der Session)

Klick auf einen Termin-Projektlink (z. B. "reznik-debater") führte ins
Leere und landete zurück auf der Startseite ("scrollt nach oben" — in
Wahrheit ein Neuladen von `/`, da der falsche Pfad zu einem 404 führte
und der Static-Host unbekannte Pfade auf `/` umleitet). Ursache: `openPanel()`
baute den Link weiterhin selbst zusammen (`/assets/work/${id}/article.html`),
ohne die Kategorie (`books/`, `articles/`, …) im Pfad — genau der Bug, der
laut früheren Notizen in dieser Doku schon einmal behoben war, aber
offenbar erneut in diesem Code-Pfad auftauchte (vermutlich beim
Zurücksetzen von `index.html` auf einen älteren Stand mitten in der
Session, siehe "index.html reverted to an old snapshot" in der
Fehler-Historie). Fix: `workTitles` (nur Titel) ersetzt durch
`workItemsBySlug` (das komplette `work-index.json`-Item pro Slug), damit
`openPanel()` den echten `contentUrl` und den echten `title` verwenden
kann, mit demselben alten Pfad-Rateversuch nur als Fallback, falls ein
Slug einmal nicht im Index steht. **Lehre:** Konsumenten sollten immer die
fertigen `contentUrl`/`title`-Felder aus `work-index.json` nutzen statt
Pfade aus einem rohen Slug zu raten — das war schon einmal die Lehre aus
einem früheren Bug in dieser Session, ist aber offenbar durch eine
externe Bearbeitung wieder zurückgekommen.

### Mobil: Tap auf das mittlere Karussell-Bild scrollte statt zu öffnen

Der Galerie-Container (`[data-blog-gallery]`) hat `touch-action: pan-y`,
damit vertikales Scrollen durch die Galerie hindurch funktioniert, während
JS selbst horizontales Wischen für Vor/Zurück auswertet. Für das MITTLERE
Bild (`is-center`) ist aber gar kein Wisch-Gesture vorgesehen, nur ein
einfacher Tap zum Öffnen des Artikels — durch das geerbte `pan-y` konnte
der Browser aber schon bei minimaler Finger-Bewegung während des Tippens
in einen nativen Scroll wechseln, bevor der Klick-Handler zum Zug kam.
Fix: `.blog-card.is-center { touch-action: manipulation; }` — erlaubt
Tap/Pinch-Zoom, unterdrückt aber die Scroll-Mehrdeutigkeit nur für dieses
eine Element; der Rest der Galerie behält `pan-y`.

### "Kontaktieren Sie mich!" — wirklich EIN Kasten statt zwei mit Lücke

Der vorherige Merge (siehe oben) hatte technisch bereits EINEN `.section`
um LinkedIn und Mail gelegt, aber beide waren weiterhin je ein eigenes
`.card` — sichtbares Ergebnis: zwei separate Kästen mit Lücke dazwischen,
optisch nicht als "ein Kasten" erkennbar (der Nutzer wollte genau das
vermeiden). Fix: nur noch EIN `<article class="card">` für beides, mit
einem einfachen `<hr>`-Trenner zwischen "LinkedIn" und "... oder klassisch
per Mail." statt zwei Karten.

### `assets/styles.css?v=` vergessen hochzuzählen — `.form`/`.field` kamen nie an

Die neuen `.form`/`.field`-Regeln (siehe oben) landeten in
`assets/styles.css`, aber die `?v=2`-Versionsnummer im `<link>` wurde
seit dem Papyrus-Fix nicht mehr hochgezählt — obwohl zwischen `?v=2` und
jetzt noch mehrere weitere Änderungen an `assets/styles.css` gemacht
wurden (`--muted`-Farbe, `.site-header` Papyrus, jetzt `.form`/`.field`).
Browser, die `styles.css?v=2` schon einmal geladen hatten, bekamen keine
davon zu sehen. Auf `?v=3` erhöht. **Lehre, erneut:** Nach JEDER Änderung
an `assets/styles.css` muss die `?v=`-Nummer auf allen sieben Seiten
hochgezählt werden — das ist inzwischen der zweite Vorfall dieser Art in
dieser Session (erster: Papyrus selbst).

### Produkt-Modal-Bild: kein echtes Zuschneiden, aber viel zu klein für eine "Detailansicht"

`.modal-img` hatte `height: clamp(180px, 22vh, 280px)`. `object-fit:
contain` kann rechnerisch nicht zuschneiden — aber ein Hochformat-Bild
(z. B. `assets/shop/partner/partner.png`, 332×431px) in diese knappe,
max. 280px hohe, aber volle Breite nutzende Box gepresst, wird auf eine
sehr schmale, kleine Spalte herunterskaliert (bei 280px Höhe nur
~216px breit) — das liest sich in der "Detailansicht" wie Zuschneiden/
Detailverlust, obwohl technisch das ganze Bild sichtbar bleibt. Höhe
deutlich angehoben auf `clamp(240px, 55vh, 520px)`, damit Hochformat-Bilder
in der Detailansicht tatsächlich groß und deutlich zu sehen sind.
Zusätzlich `object-fit: contain` mit `!important` abgesichert (aus
Vorsicht, siehe wiederkehrendes Muster "meine Regel scheint nicht
anzukommen" in dieser Doku — konnte hier keine konkrete konkurrierende
Regel finden, aber die Absicherung kostet nichts).

### Sale-Ribbon: Banner-Form per `clip-path` zurückgeholt

Nutzer-Feedback nach dem erneuten Einbau von `schaerpe.png` als reine
Textur (siehe "Sale-Ribbon — Verlauf der Korrekturen"): "der Ribbon ist
kaputt". Wahrscheinlichste Ursache: die Textur-Lösung macht die Schärpe
zu einem schlichten geraden Rechteck — die eigentliche, hübsche
Bandform (spitz zulaufende, eingekerbte Enden) der Original-Grafik ging
dabei verloren, da genau diese Form (ihre feste Diagonale) der Grund war,
warum sie NICHT mehr direkt verwendet wird. Fix: `clip-path: polygon(6% 0,
94% 0, 100% 50%, 94% 100%, 6% 100%, 0 50%)` auf `.sale-ribbon` ergänzt —
erzeugt beidseitig eingekerbte, spitz zulaufende Enden per CSS, unabhängig
vom Bild. `background-size` von 600% auf 350% reduziert, damit etwas mehr
von der tatsächlichen Gold-Textur (Maserung/Glanz) sichtbar bleibt statt
einer fast einfarbigen Fläche.

### "Kontaktieren Sie mich!" — doch wieder zwei Karten, aber nebeneinander

Der EIN-Kasten-Merge (siehe oben, `<hr>`-Trenner in einer Karte) war eine
Fehlinterpretation von "in einem Abschnitt/Div zusammen" — der Nutzer
wollte tatsächlich weiterhin zwei separate Karten (LinkedIn, Mail), nur
NEBENEINANDER statt gestapelt mit Lücke dazwischen. Zurückgebaut auf zwei
`<article class="card">`, dafür `.section[aria-labelledby="profiles"]
.cards` responsive auf zwei Spalten gestellt
(`grid-template-columns: 1fr 1fr` ab `min-width:700px`, darunter weiter
eine Spalte/gestapelt). **Lehre:** "in einem Kasten/Abschnitt
zusammenführen" kann heißen "zu einer Karte verschmelzen" ODER "im
selben Bereich nebeneinander anordnen" — bei Layout-Wünschen im Zweifel
eher zur weniger einschneidenden Interpretation (Anordnung ändern) statt
zur strukturellen (Elemente verschmelzen) tendieren, oder nachfragen.

### Produkt-Modal-Bild: der eigentliche Grund für das Zuschneiden gefunden

Die Erhöhung von `.modal-img`s Höhe (`clamp(240px, 55vh, 520px)`, siehe
oben) hat das Problem NICHT gelöst — der Nutzer bestätigte per Screenshot,
dass weiterhin unten abgeschnitten wird. Tatsächliche Ursache: `.modal`
ist `display:flex; flex-direction:column` mit einer Obergrenze
(`max-height: calc(100dvh - 32px)`). `.modal-img` ist darin ein Flex-Kind
OHNE `flex-shrink:0` — passt der Gesamtinhalt (Bild + der gesamte Text/
Formular-Bereich in `.modal-body` darunter) nicht in die Höhenobergrenze,
darf Flexbox `.modal-img` per Voreinstellung (`flex-shrink:1`) unter seine
eigentliche `height` zusammendrücken. Da `.modal-img` zusätzlich
`overflow:hidden` hat, wird dieses Zusammendrücken zu sichtbarem
Abschneiden am unteren Rand — obwohl `object-fit:contain` selbst rechnerisch
nie zuschneidet und die eigentlich vorgesehene Höhe stimmte. Fix:
`flex-shrink:0` auf `.modal-img`, damit es immer seine volle Höhe behält;
`.modal-body` hat bereits `flex:1 1 auto; overflow-y:auto` und wird jetzt
zum alleinigen Element, das bei Platzmangel schrumpft/scrollt — das
korrekte Muster für "fester Kopfbereich + scrollbarer Rest". **Lehre:**
Bei "wird trotz korrektem `object-fit` zugeschnitten" auch die
Eltern-Flexbox prüfen — ein Flex-Kind mit fester Höhe UND
`overflow:hidden`, aber ohne `flex-shrink:0`, kann optisch genau wie
Zuschneiden aussehen, obwohl die Bild-eigene CSS korrekt ist.

### Sale-Ribbon: Stopgap zurück auf einfarbig Gold

Nutzer-Feedback nach dem `clip-path` + reduziertem `background-size`-
Versuch: "ribbon is false" — weiterhin nicht zufriedenstellend. Auf
expliziten Wunsch ("as a stopgap measure dont use schaerpe.png, just make
it one color golden") zurück auf eine einfache Flächenfarbe
(`background: #c79a3e;`, kein Bild, kein Gradient) — die eingekerbte
Bandform per `clip-path` bleibt erhalten (die betraf nicht die
Beschwerde). `schaerpe.png` ist damit erneut nicht in Verwendung, siehe
"Sale-Ribbon — Verlauf der Korrekturen" für die volle Historie; explizit
als Stopgap markiert, kein endgültiger Rückzieher.

### Produkt-Modal-Bild — endgültiger Fix (Cache/Deploy ausgeschlossen)

Der Nutzer bestätigte per Screenshot aus einem **Inkognito-Tab** auf der
**live deployten** Seite (publish-lohr.com, nicht lokal), dass weiterhin
zugeschnitten wird — das schließt sowohl Browser-Cache als auch einen
nicht gepushten/nicht deployten Stand aus (`git status`/`git log` zum
Zeitpunkt bestätigten: alles committed, `origin/master` auf demselben
Stand). Also ein echter Bug, kein Cache-Problem. Nach genauer Analyse:
das gerenderte Bild erschien breiter als hoch, obwohl die Quelldatei
(`engl.png`, 502×653px) hochformatig ist — mit `object-fit: contain`
mathematisch unmöglich (contain erhält das Seitenverhältnis exakt; ein
Hochformat-Bild kann darüber nie querformatig aussehen). `object-fit`
selbst war also aus einem nicht abschließend gefundenen Grund nicht
wirksam. Fix: `object-fit` komplett vermieden, stattdessen natürliche
Bildgrößung (`max-width:100%; max-height:100%; width:auto; height:auto;`
auf `.modal-img .gallery-img`) plus `.modal-img` selbst als
Flex-Container (`display:flex; align-items:center; justify-content:center;`)
für Zentrierung. Diese Technik ist unabhängig von `object-fit` und damit
robust gegen das (nicht restlos verstandene) ursprüngliche Problem.

### Blog: Titel/Datum/Chip in Gold, Vorschautext in Weiß

`.post-title`, `.post-meta` (Datum + Kategorie-Chip) jetzt explizit auf
`#d9b23c` (dieselbe Gold-Farbe wie die Sale-Ribbon-Verlaufsfarbe) gesetzt.
`.post-content`/`.post-content p` (der eigentliche Vorschautext/Exzerpt)
explizit auf `var(--text)` (Standard-Weiß) gesetzt — ohne das hätte der
Text die Basis-`p`-Farbe `var(--muted)` geerbt, die seit dem CD-Farbfix
weiter oben in dieser Doku selbst schon golden ist, wodurch Metadaten und
Vorschautext optisch nicht mehr unterscheidbar gewesen wären.

### Leseproben-Abo (postalisch, vierteljährlich) unter dem LinkedIn-QR-Code

Neuer Abschnitt in der LinkedIn-Karte (`index.html`, "Kontaktieren Sie
mich!"): Name/Straße/PLZ/Ort-Felder + "Abonnieren"-Button. Der Button ist
per `disabled` + `form.checkValidity()`-Check (bei jedem `input`-Event neu
geprüft) erst klickbar, wenn alle Pflichtfelder ausgefüllt sind. Beim
Absenden wird — wie beim bestehenden Kontaktformular — kein Request
gesendet, sondern ein `mailto:`-Entwurf geöffnet (`CONTACT_EMAIL` aus
`assets/site.js`, falls das globale Script geladen ist; sonst Fallback auf
`anfrage@publish-lohr.com`), mit der eingegebenen Adresse im Text.

Zusätzliche Checkbox "Am langfristigen Bewertungsprogramm teilnehmen" —
verlinkt auf `#rabatt-meinung-title` (die bestehende "50% Rabatt für
dauerhafte Bewertungen"-Sektion unter "Rabattaktionen", siehe weiter oben
in dieser Doku) statt die Erklärung zu duplizieren. Der Haken fließt in
den E-Mail-Text mit ein (ein Satz, je nachdem ob angehakt oder nicht) —
so hat auch die verlegende Person beim Lesen der Mail sofort den Kontext,
ohne im Formular selbst nachschauen zu müssen.

### Neue Nav-Seite "Archiv" (vormals Platzhalter "Entdecken")

Auf Nutzerwunsch zwischen Blog und Webshop in die Hauptnavigation
eingefügt — sowohl in `assets/partials/header.html` (die von allen Seiten
außer dem Webshop genutzte geteilte Kopfzeile) als auch im Webshop selbst
(der hat wegen eines `CONTACT_EMAIL`-Namenskonflikts mit `site.js` eine
eigene, nicht über das Partial geladene Kopie der Kopfzeile — siehe
"Header/Footer-Unifizierung" weiter oben). Ursprünglich als reiner
Platzhalter unter dem Namen "Entdecken" gebaut, dann umbenannt: der Tab
ist als künftige **KI-gestützte Volltextsuche** über alle
`assets/work/`-Inhalte gedacht (Bücher, Artikel, Termine, Spiele) — "Suche"
und "Entdecken" waren dem Nutzer beide nicht die richtige Bezeichnung dafür,
zur Wahl gestellt wurden "Orakel"/"Katalog"/"Archiv"/"Kompass", gewählt:
**"Archiv"**. Seite + Route komplett umbenannt:
`webpages/entdecken/` → `webpages/archiv/`, überall verlinkt als
`/webpages/archiv/`.

**Aktueller Stand der Seite** (`webpages/archiv/index.html`): echtes
Suchfeld + "Suchen"-Button, aber **bewusst keine funktionierende Suche
dahinter** — eine erste Version hatte einen einfachen client-seitigen
Stichwortabgleich über `assets/work-index.json` (`title`/`excerpt`/`tags`)
als Übergangslösung, die der Nutzer explizit wieder entfernt haben wollte:
"remove the keyword search - its just a dummy for now". Kein Dummy-Ergebnis
mehr, stattdessen zeigt die Suche unmissverständlich "noch nicht
angeschlossen" an (`search()` gibt `null` zurück, `render()` unterscheidet
das explizit von "keine Treffer" — ein leeres Array `[]`).

Die zukünftige Suche wird an ein **LLM angebunden, das mit den
Website-Inhalten ausgestattet ist** — in welchem Format (strukturiertes
JSON aus `assets/work/`, Embeddings, Klartext, o. ä.) ist bewusst noch
offen und wird erst entschieden, wenn die Anbindung tatsächlich gebaut
wird ("okf oder was auch immer zu dem Zeitpunkt am besten passt"). Die
`search(query)`-Funktion in `webpages/archiv/index.html` ist der einzige
Ort, der später ersetzt werden muss — mit einem `TODO (backend hook)`-
Kommentar direkt im Code, das die erwartete Rückgabeform vorgibt (Array
von `{ title, excerpt, contentUrl, ... }`-Objekten), damit `render()`
unverändert bleiben kann, unabhängig davon, welches Format/welcher
Such-Mechanismus später tatsächlich dahintersteckt. Kein echtes Backend in
dieser Session gebaut — nur UI + sauberer Anschlusspunkt, wie vom Nutzer
angefragt.

**Korrektur:** Ursprünglich hier fälschlich behauptet, das Projekt sei
"rein statisch" ohne Backend-Möglichkeit. Stimmt nicht — es gibt bereits
`functions/api/` mit echten Cloudflare-Pages-Functions
(`contact.js`, `hipster-mail.js`, `test-mail.js`), das Projekt ist also
technisch bereits ans Cloudflare-Pages-Functions-Modell angebunden. Ein
künftiger `functions/api/archiv-search.js`-Endpunkt für die KI-Suche wäre
also ohne komplett neue Infrastruktur möglich, nur die eigentliche
LLM-Anbindung fehlt noch.

### Archiv: "Übersicht"-Raster wieder entfernt

Kurzlebige Ergänzung: eine zweite Sektion "Übersicht" (Karten-Raster mit
Bild+Titel, gespeist aus einer neuen, von Hand gepflegten
`assets/archiv.json`, acht Einträge aus dem aktuellen Katalog vorbefüllt)
wurde direkt danach vom Nutzer wieder verworfen ("delete the übersicht
again"). Beides rückgängig gemacht: die Sektion samt zugehörigem CSS/JS
aus `webpages/archiv/index.html` entfernt, `assets/archiv.json` selbst
gelöscht (nichts referenziert es mehr). `webpages/archiv/index.html`
besteht jetzt wieder nur aus der einen "Suche"-Sektion — Hinweistext
("Wir arbeiten an einem neuen Feature für dich: einer KI-gestützten Suche
durch alles, was publish-Lohr veröffentlicht hat.") + Suchfeld, Funktion
weiterhin nicht angeschlossen (`search()` gibt `null` zurück, siehe
"Neue Nav-Seite 'Archiv'" weiter oben für die volle Historie).

### Morphologie-Werkzeug (Spiel) in den Webshop aufgenommen

Neuer Spiel-Ordner `assets/work/games/morphology/` (vom Nutzer selbst
angelegt) war noch nicht in `assets/work-index.json` — `convert_articles.py`
einmal ausgeführt (`PYTHONIOENCODING=utf-8 python convert_articles.py`,
ohne das Encoding-Flag bricht das Skript unter Windows an einem
Unicode-Häkchen im Log-Output ab — reines Cmd-Codepage-Problem, nicht der
eigentliche Fehler), Index jetzt aktuell.

`meta.json` hatte `"available": "nein"` und keinerlei Preisfeld — der
Webshop zeigt grundsätzlich nur Artikel, die BEIDES haben (verfügbar UND
mit Preis). Erst mit `"price-digital": 0` ("Kostenlos") als Verlegenheits-
lösung überbrückt (keine klare Preisangabe zu dem Zeitpunkt), dann vom
Nutzer bestätigt: **5 €**. `price-digital` jetzt auf `5` gesetzt.
`formatEUR()` (`webpages/webshop/index.html`) hat trotzdem einen bleibenden
Sonderfall für `0` → "Kostenlos" statt "0,00 €", falls das nochmal
gebraucht wird (aktuell inaktiv, da der Preis jetzt > 0 ist).

### "Bald wieder verfügbar" — blaue Ribbon für nicht verfügbare/zukünftige Artikel

Neue Regel in `webpages/webshop/index.html`, analog zur bestehenden
goldenen Sale-Ribbon (siehe "Sale-Ribbon — Verlauf der Korrekturen"), aber
oben RECHTS statt links, blau (`#2563a8`) statt gold, Text "Bald wieder
verfügbar" in Weiß. Zeigt sich für Bücher/Spiele aus
`assets/work-index.json`, deren `meta.json` entweder `"available": "nein"`
hat ODER deren `published`-Datum in der Zukunft liegt (String-Vergleich
gegen das heutige Datum, `YYYY-MM-DD`-Format).

**Wichtige strukturelle Änderung:** Bisher hat `loadBooksFromWorkIndex()`
nicht verfügbare Artikel komplett aus der Anzeige gefiltert (`if
(!isAvailableFromMeta(meta)) return null;`). Diese harte Ausblendung
wurde entfernt — Artikel werden jetzt angezeigt, nur mit der Ribbon
markiert, statt komplett zu verschwinden. Ein Preis ist weiterhin
Voraussetzung fürs Anzeigen (`if (pricePrint == null && priceDigital ==
null) return null;` blieb bestehen) — ein nicht verfügbares Buch OHNE
jeden Preis taucht also weiterhin gar nicht auf. Kauf-/Warenkorb-Funktion
selbst wurde NICHT angetastet (nicht angefragt) — die Ribbon ist rein
visuell, der Kaufen-Button bleibt für diese Artikel technisch weiter
klickbar.

**Nur Bücher/Spiele, nicht Merch:** `assets/shop/products.json`
(T-Shirts, Socken etc.) hat kein `published`-Datum und nutzt `status`
statt `available` — die neue Logik wurde nur für `loadBooksFromWorkIndex()`
gebaut, `loadMerchProducts()` unverändert gelassen. Falls Merch später
dieselbe Markierung braucht, müsste dort eine äquivalente `comingSoon`-
Berechnung ergänzt werden (z. B. über `status !== "verfügbar"`).

**Sofort sichtbarer Testfall:** `reznik-debater` hat `"published":
"2026-09-04"` — am 2026-09-03 (heute, zum Zeitpunkt dieser Änderung) ist
das noch in der Zukunft, die blaue Ribbon zeigt sich also sofort ohne
weiteres Zutun. Der Rabatt auf dasselbe Buch startet erst am 05.09.; bis
dahin zeigt die Karte nur die blaue "Bald verfügbar"-Ribbon, danach (nach
Erscheinen, vor Rabattstart) keine, ab dem 05.09. dann die goldene
Sale-Ribbon — funktioniert wie ein natürlicher Live-Test der neuen
Funktion mit echten Daten.

**Ungewollter Nebeneffekt sofort gefunden und gefixt:** Durch das
Entfernen der harten `available:"nein"`-Ausblendung (s.o.) tauchte
`assets/work/events/julius-faucher-medaille/meta.json` (der "Artikel im
EF-Magazin"-Eintrag) plötzlich im Webshop auf, mit `"price-digital": 10`
— ein Preisfeld, das offenbar aus einer früheren, nicht mehr
nachvollziehbaren Testphase dort stehen geblieben war ("did i even add
the price?!" — Nutzer wusste selbst nicht mehr, woher das kam). Dieses
Event war nie als Verkaufsartikel gedacht. Fix: `price-print`/
`price-digital` aus dieser `meta.json` entfernt — der bestehende
"kein Preis = nicht im Shop"-Filter greift dann wieder, das Event
verschwindet erneut aus dem Webshop. **Lehre:** Bei einer Änderung, die
zuvor ausgeblendete Inhalte plötzlich sichtbar macht (wie hier die
comingSoon-Umstellung), IMMER prüfen, was dadurch neu auftaucht — nicht
nur, ob die neue Funktion selbst richtig funktioniert. Nach dieser
Bereinigung haben nur noch die drei echten Bücher und das Morphologie-
Spiel ein Preisfeld (`grep -rl "price-print\|price-digital"
assets/work/*/*/meta.json` als schneller Check für künftige Male).

### Mitgliedschaft/Login: nur beschreibender Inhalt, bewusst KEIN echtes Login/Zahlungssystem

Der Nutzer wollte: einen Login-Bereich im Header, ein Werkzeug, das nur
für angemeldete Mitglieder zugänglich ist, und ein Abrechnungsmodell, bei
dem Mitglieder ein Zahlungsmittel hinterlegen und monatlich nur nach
tatsächlicher Nutzung abgerechnet werden (wenige Cent/Monat, nichts bei
Nichtnutzung).

**Bewusste Entscheidung, das NICHT als echte Funktion zu bauen:** Ein
Login-Formular mit Benutzername/Passwort-Feldern, das nichts wirklich
authentifiziert, oder ein Formular, das zum "Hinterlegen" einer
Zahlungsmethode auffordert, ohne dass dahinter eine echte, sichere
Zahlungsabwicklung steht, wäre ein Dark Pattern — es würde Besuchern
vorgaukeln, ihre Zugangsdaten oder Zahlungsinformationen würden sicher
verarbeitet, obwohl nichts davon tatsächlich passiert. Das ist unabhängig
von Format ("ist ja nur für später") ein echtes Sicherheits-/Vertrauens-
Problem, sobald ein Formularfeld für Passwörter oder Kartendaten
angezeigt wird, ohne dass eine echte Backend-Absicherung existiert.

Stattdessen umgesetzt — konsistent mit dem Rest der Seite (die auch sonst
überall mit `mailto:`-Anfragen statt echter Transaktionsverarbeitung
arbeitet, siehe z. B. "Bestellung = Reservierung" beim Webshop):

- **`webpages/login/index.html`** (neu): reine Info-Seite, kein
  Formularfeld. "Login noch nicht verfügbar", Link zur "Mitglied
  werden"-Sektion der Startseite und zum bestehenden Kontaktformular.
  Verlinkt in `assets/partials/header.html` und (da der Webshop eine
  eigene, nicht über das Partial geladene Kopfzeile hat — siehe
  "Header/Footer-Unifizierung") auch dort separat.
- **Startseite, neue Sektion "Mitglied werden"** (`#mitglied-werden`,
  direkt unter `.hero`): beschreibt das geplante Abrechnungsmodell in
  Fließtext, mit einem Button, der zum bestehenden Kontaktformular
  scrollt (`href="#contact"`) — keine echte Zahlungsmittel-Erfassung,
  nur eine Einladung, per Mail Interesse zu bekunden.
- **`assets/work/games/morphology/article.html`** und `meta.json`
  (`klappentext`): erklären den Bezug zu Dr. Peter S. Reznik, Ph.Ds Buch
  "Morphologische Geheimnisse von erfolgreichen Beziehungen" (verlinkt),
  dass das Werkzeug ein Foto hochlädt und eine Gesichtsanalyse liefert,
  dass es nur für angemeldete Mitglieder gedacht ist, und dasselbe
  Abrechnungsmodell wie oben.

**Nachtrag: Link zum eigentlichen Werkzeug.** Nutzerwunsch: beim Klick auf
das Morphologie-Werkzeug soll ein Link zur eigentlichen Anwendung sichtbar
sein (Unterseite von `assets/work/games/morphology/`), "für jetzt generisch"
— also ohne echte Login-Prüfung, einfach sichtbar für alle, bis es echtes
Login gibt. Umgesetzt:

- **`assets/work/games/morphology/tool/index.html`** (neu): reine
  Platzhalter-Seite für die eigentliche Anwendung (Foto hochladen →
  Analyse), noch ohne echte Funktion — analog zu `webpages/login/` und
  `webpages/archiv/` "bald verfügbar" gehalten.
- Verlinkt an zwei Stellen, beide generisch (keine Login-Prüfung, wie
  angefragt): in `assets/work/games/morphology/article.html` (Fließtext-
  Link "Zum Werkzeug") UND im Webshop-Produkt-Modal, über ein neues
  `"alsoPublished"`-Array in `meta.json` (dasselbe Feld, das bei den
  Büchern für "Autorenwebsite"/"Amazon"-Links genutzt wird) — dadurch
  taucht der Link automatisch auf, sobald jemand die Produktkarte im
  Webshop anklickt, ohne dass die Modal-Rendering-Logik selbst angefasst
  werden musste.

**Für später, falls ein echtes Login/Bezahlsystem gebaut werden soll:**
Es gibt bereits `functions/api/` mit echten Cloudflare-Pages-Functions
(siehe "Archiv"-Abschnitt weiter oben) — die technische Basis für ein
Backend ist also vorhanden, aber Authentifizierung + wiederkehrende
Zahlungen (Kartendaten hinterlegen, monatlich automatisch abbuchen)
brauchen einen echten Zahlungsdienstleister (z. B. Stripe Billing/
Subscriptions), eine Nutzerverwaltung/Datenbank und wahrscheinlich eine
rechtliche Prüfung (PCI-Konformität, Fernabsatzrecht bei wiederkehrenden
Kleinbeträgen) — das ist ein eigenständiges Projekt, keine Sache, die
nebenbei in einem CSS/Copy-Task mitgebaut werden sollte.

### Echter Passwortschutz fürs Morphologie-Werkzeug (Server-seitig)

Nachtrag zum vorigen Abschnitt: Der Nutzer bestand nach der ersten
Sicherheitswarnung mehrfach auf einer Passwort-Lösung ("do the pw
solution i told you"), auch nachdem "manuell per Mail" als Option gewählt
wurde. Wichtige Klarstellung dabei erarbeitet: das Problem ist NICHT, wie
ein Passwort verteilt wird (das darf gerne manuell/persönlich per Mail
passieren) — das Problem ist, WO es geprüft wird. Eine Prüfung im
Website-eigenen Code (egal ob JSON-Datei oder JS-Array) ist zwangsläufig
öffentlich einsehbar, weil eine statische Seite alles ausliefert, was
angefragt wird — es gibt keine Möglichkeit, eine Datei "nur für berechtigte
Nutzer" sichtbar zu machen, ohne dass die Prüfung selbst irgendwo
serverseitig passiert.

**Tatsächlich umgesetzte, sichere Lösung** (Nutzer stimmte dieser
Variante ausdrücklich zu, per Rückfrage): eine echte serverseitige Prüfung
über die bereits vorhandenen Cloudflare-Pages-Functions.

- **`functions/api/game-access.js`** (neu): `POST { game, password }` →
  vergleicht `password` gegen eine Cloudflare-Pages-Umgebungsvariable
  (`GAME_PASSWORD_MORPHOLOGY`, Klartext-Name absichtlich pro Spiel
  eindeutig) — **diese Variable steht NUR im Cloudflare-Dashboard, nirgends
  im Repo**. Bei Treffer: `{ ok: true, url: "/assets/work/games/morphology/tool/" }`.
  Bei Fehltreffer oder wenn die Env-Var noch gar nicht gesetzt ist: `401`,
  `{ ok: false }` — kein "offen, weil noch nicht konfiguriert". Registrierung
  neuer Spiele: Eintrag im `GAMES`-Objekt in dieser Datei ergänzen + die
  passende Env-Var im Cloudflare-Dashboard anlegen.
- **`assets/work/games/morphology/tool/index.html`**: jetzt die eigentliche
  Zugangsschranke selbst (nicht mehr nur ein Platzhalter-Hinweis) —
  Passwort-Feld + "Freischalten"-Button, ruft `/api/game-access` auf, zeigt
  bei Erfolg den (weiterhin als Platzhalter markierten) Werkzeug-Bereich,
  bei Misserfolg eine Fehlermeldung. Absichtlich als EIGENE, vollständige
  Seite gebaut (nicht als in `article.html` eingebettetes Fragment) — Grund:
  `article.html`-Inhalte werden an mehreren Stellen per `fetch()` +
  `innerHTML` in ein Modal eingefügt (Blog, Homepage-Galerie), und
  per `innerHTML` eingefügte `<script>`-Tags führen sich in keinem Browser
  aus. Nur ein echter Seitenaufruf (wie bei `webpages/login/`,
  `webpages/archiv/`) garantiert, dass das eigene `<script>` zuverlässig
  läuft.
- Da die eigentliche Zugangskontrolle jetzt AUF der Werkzeug-Seite selbst
  sitzt, ist ein direkter Link dorthin wieder unbedenklich (kein "Security
  through obscurity" mehr nötig) — `article.html` und `meta.json`
  (`alsoPublished`) verlinken jetzt wieder direkt
  `/assets/work/games/morphology/tool/`, zusätzlich weiterhin der
  "Zugang anfragen"-Mailto-Link, über den man überhaupt erst ein Passwort
  bekommt.

**Für den Nutzer zu erledigen, damit das live funktioniert:** Im
Cloudflare-Pages-Dashboard des Projekts unter Settings → Environment
variables eine Variable `GAME_PASSWORD_MORPHOLOGY` mit dem gewünschten
Passwort als Wert anlegen (als "Secret", nicht als Klartext-Variable, falls
die Cloudflare-UI das unterscheidet) — ohne diesen Schritt lässt sich das
Werkzeug für niemanden freischalten (bewusst "geschlossen", nicht "offen",
solange nichts konfiguriert ist, siehe oben).

**Nicht umgesetzt (bewusst, zu großer Scope für diese Anfrage):** Rate-
Limiting gegen wiederholtes Passwort-Raten (bräuchte Cloudflare KV/Durable
Objects), Passwort-Rotation/mehrere gültige Passwörter pro Spiel, dieselbe
Absicherung für die Archiv-Suche (aktuell ohnehin noch nicht implementiert,
siehe "Archiv"-Abschnitt — sinnvollerweise gleichzeitig mit dem echten
Such-Backend abzusichern, nicht vorher separat).

## Offene Punkte

- **`GAME_PASSWORD_MORPHOLOGY` muss noch im Cloudflare-Dashboard gesetzt
  werden.** Ohne diese Umgebungsvariable (Settings → Environment
  variables im Cloudflare-Pages-Projekt) bleibt `/api/game-access` für
  jeden Versuch geschlossen, egal welches Passwort eingegeben wird — siehe
  "Echter Passwortschutz fürs Morphologie-Werkzeug" weiter oben.
- **Login/Mitgliedschaft ist reiner Info-Inhalt, keine echte Funktion.**
  `webpages/login/index.html`, die "Mitglied werden"-Sektion auf der
  Startseite und der Login-Hinweis im Morphologie-Werkzeug beschreiben ein
  geplantes Konto- + nutzungsbasiertes Abrechnungsmodell, ohne dass echtes
  Login oder echte Zahlungsabwicklung existiert (bewusst so — siehe
  "Mitgliedschaft/Login" weiter oben, Sicherheitsbedenken bei einem
  Schein-Login-/Zahlungsformular). Sobald das wirklich gebaut werden soll,
  braucht es einen echten Zahlungsdienstleister + Nutzerverwaltung.
- **"Archiv"-Suche ist bewusst unangeschlossen.** `webpages/archiv/index.html`
  (umbenannt von "Entdecken", siehe "Neue Nav-Seite Archiv") hat nur
  Suchfeld + Button, keine funktionierende Suche dahinter (eine erste
  Stichwort-Dummy-Version wurde auf Nutzerwunsch wieder entfernt). Geplant:
  Anbindung an ein LLM, das mit den Website-Inhalten ausgestattet ist —
  Format der Inhalte (JSON/Embeddings/Klartext/…) noch offen, wird erst
  beim tatsächlichen Anschließen entschieden. Hook-Punkt (`search()`-
  Funktion in `webpages/archiv/index.html`, TODO-Kommentar mit erwarteter
  Rückgabeform) ist vorbereitet und muss nur ausgetauscht werden.
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
