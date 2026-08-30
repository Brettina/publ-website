// assets/tools/generate-blog-feed.mjs
//
// Synthesizes assets/work/blog/<slug>/{meta.json,article.html} teaser posts
// from assets/work/{articles,books,events,games}/* (via assets/work-index.json)
// and assets/calendar/calendar-index.json, then writes
// assets/work/blog/blog-index.json as the single manifest the blog page reads.
//
// WRITE-ONCE PER SLUG: this script creates a post folder the first time it
// sees a source item, then never rewrites article.html/meta.json for that
// slug again — even on later runs. That's intentional, not a bug: a monthly
// scheduled task enriches whichever post is currently newest (items[0] in
// blog-index.json) with real web research, and that enrichment must survive
// being re-run through this generator. Because the newest slot is always
// "whatever sorts first," the moment a newer item takes over, the old one
// stops being touched by anything, automatically — no extra state needed.
// Only the manifest (blog-index.json) is rebuilt every run, and it prefers
// each post's own current meta.json over freshly computed source fields, so
// an enriched title/excerpt shows up in the feed listing too.
//
// This script NEVER touches assets/work/{articles,books,events,games}/* —
// those are the originals and stay untouched no matter what.
//
// Run order: python convert_articles.py (refreshes assets/work-index.json)
// THEN node assets/tools/generate-blog-feed.mjs.

import { promises as fs } from "fs";
import path from "path";

const ROOT = process.cwd();
const WORK_DIR = path.join(ROOT, "assets", "work");
const BLOG_DIR = path.join(WORK_DIR, "blog");
const WORK_INDEX = path.join(ROOT, "assets", "work-index.json");
const CALENDAR_INDEX = path.join(ROOT, "assets", "calendar", "calendar-index.json");
const OUT_MANIFEST = path.join(BLOG_DIR, "blog-index.json");

const CATEGORY_LABELS = {
  books: "Buch",
  articles: "Artikel",
  events: "Presse",
  games: "Projekt"
};

function slugify(s) {
  return (
    String(s || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "eintrag"
  );
}

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function readJson(p, fallback) {
  try {
    return JSON.parse(await fs.readFile(p, "utf8"));
  } catch {
    return fallback;
  }
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function articleHtml(title, paragraphs, link) {
  const body = paragraphs
    .filter(Boolean)
    .map(p => `<p>${escapeHtml(p)}</p>`)
    .join("\n");
  const linkHtml = link ? `\n<p><a href="${link.url}">${escapeHtml(link.label)}</a></p>` : "";

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body>
<article class="prose">
${body}${linkHtml}
</article>
</body>
</html>
`;
}

async function writePost(slug, meta, html) {
  const dir = path.join(BLOG_DIR, slug);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2) + "\n", "utf8");
  await fs.writeFile(path.join(dir, "article.html"), html, "utf8");
}

async function postFolderExists(slug) {
  try {
    const st = await fs.stat(path.join(BLOG_DIR, slug));
    return st.isDirectory();
  } catch {
    return false;
  }
}

// If a post already exists, its own meta.json wins for the manifest listing —
// that's how an enriched title/excerpt (written by the monthly research task)
// surfaces in the feed without this script ever rewriting the post itself.
async function manifestEntryFor(slug, computed) {
  const existing = await readJson(path.join(BLOG_DIR, slug, "meta.json"), null);
  if (!existing) return computed;

  return {
    ...computed,
    title: existing.title || computed.title,
    excerpt: existing.excerpt || computed.excerpt,
    tags: Array.isArray(existing.tags) ? existing.tags : computed.tags,
    date: existing.updated || existing.published || computed.date,
    cover: existing.cover || computed.cover
  };
}

async function buildFromWorkItems() {
  const data = await readJson(WORK_INDEX, { items: [] });
  const items = (data.items || []).filter(x => x && x.category !== "blog");

  const entries = [];

  for (const item of items) {
    const slug = item.slug;
    const title = item.title || slug;
    const excerpt = item.excerpt || item.description || "";
    const date = item.updated || item.published || "";
    const label = CATEGORY_LABELS[item.category] || "Neuigkeit";

    const computed = {
      slug,
      title,
      date,
      excerpt,
      tags: item.tags || [],
      cover: item.cover || "",
      contentUrl: `/assets/work/blog/${slug}/article.html`,
      sourceUrl: item.contentUrl || "",
      sourceCategory: item.category
    };

    if (!(await postFolderExists(slug))) {
      const html = articleHtml(
        title,
        [`${label}: ${title}`, excerpt],
        item.contentUrl
          ? { url: item.contentUrl, label: item.category === "books" ? "Mehr zum Buch" : "Vollständigen Artikel lesen" }
          : null
      );

      await writePost(slug, {
        title,
        published: item.published || date,
        updated: date,
        tags: item.tags || [],
        excerpt,
        sourceCategory: item.category,
        sourceUrl: item.contentUrl || ""
      }, html);
    }

    entries.push(await manifestEntryFor(slug, computed));
  }

  return entries;
}

async function buildFromCalendar(todayStr) {
  const data = await readJson(CALENDAR_INDEX, { items: [] });
  const events = data.items || [];

  const entries = [];

  for (const ev of events) {
    if (!ev || !ev.date) continue;

    const slug = `termin-${ev.date}-${slugify(ev.title)}`;
    const isPast = String(ev.date) <= todayStr;
    const title = ev.title || "Termin";

    const intro = isPast
      ? `Wir waren am ${ev.date}${ev.where ? ` in ${ev.where}` : ""} bei „${title}“.`
      : `Wir sind am ${ev.date}${ev.where ? ` in ${ev.where}` : ""} bei „${title}“ dabei.`;

    // Announcements for future events count as "published now"; recaps of
    // past events keep the real event date — otherwise a September fair
    // would outrank today's news the moment it's added in January.
    const sortDate = isPast ? ev.date : todayStr;
    const photos = Array.isArray(ev.photos) ? ev.photos.filter(Boolean) : [];

    const computed = {
      slug,
      title,
      date: sortDate,
      excerpt: ev.note || ev.where || "",
      tags: ev.tags || [],
      cover: photos[0] || "",
      contentUrl: `/assets/work/blog/${slug}/article.html`,
      sourceUrl: "",
      sourceCategory: "calendar",
      calendarDate: ev.date
    };

    if (!(await postFolderExists(slug))) {
      const html = articleHtml(title, [intro, ev.note || ""], null);

      await writePost(slug, {
        title,
        published: sortDate,
        updated: sortDate,
        tags: ev.tags || [],
        excerpt: ev.note || ev.where || "",
        sourceCategory: "calendar",
        calendarDate: ev.date
      }, html);
    }

    entries.push(await manifestEntryFor(slug, computed));
  }

  return entries;
}

async function clearStalePosts(keepSlugs) {
  let names = [];
  try {
    names = (await fs.readdir(BLOG_DIR, { withFileTypes: true }))
      .filter(e => e.isDirectory())
      .map(e => e.name);
  } catch {
    return;
  }

  for (const name of names) {
    if (!keepSlugs.has(name)) {
      await fs.rm(path.join(BLOG_DIR, name), { recursive: true, force: true });
    }
  }
}

const PENDING_MARKER = path.join(BLOG_DIR, "pending-enrichment.json");

// Flags a slug as due for the online-research enrichment pass, but only when
// the "newest" slot actually changes hands. No clock involved: this fires
// exactly when generate-blog-feed.mjs is next run after new work/calendar
// content makes a new post the top of the feed — which is the same moment a
// human (or Claude, asked to check) should notice and do the research.
//
// IMPORTANT: this file tracks a status field ("pending" | "done"), it is NOT
// meant to be deleted once handled — deleting it looks identical to "never
// seen this slug before" and re-arms the same slug every single run. Whoever
// completes the enrichment should flip status to "done" (or leave the file
// as-is with status "done"), not remove the file.
async function updatePendingEnrichmentMarker(sortedAll) {
  if (!sortedAll.length) return;
  const newest = sortedAll[0];

  const existing = await readJson(PENDING_MARKER, null);
  if (existing && existing.slug === newest.slug) return; // same slug as last run — leave status alone

  await fs.writeFile(PENDING_MARKER, JSON.stringify({
    slug: newest.slug,
    title: newest.title,
    detectedAt: new Date().toISOString(),
    status: "pending"
  }, null, 2) + "\n", "utf8");

  console.log(`Neuer Feed-Spitzenreiter: "${newest.title}" (${newest.slug}) — Anreicherung ausstehend, siehe assets/work/blog/pending-enrichment.json`);
}

async function main() {
  await fs.mkdir(BLOG_DIR, { recursive: true });

  const today = todayIso();
  const fromWork = await buildFromWorkItems();
  const fromCalendar = await buildFromCalendar(today);

  const all = [...fromWork, ...fromCalendar];
  await clearStalePosts(new Set(all.map(e => e.slug)));

  all.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  await updatePendingEnrichmentMarker(all);

  await fs.writeFile(
    OUT_MANIFEST,
    JSON.stringify({ generatedAt: new Date().toISOString(), items: all }, null, 2) + "\n",
    "utf8"
  );

  console.log(`Wrote ${all.length} feed entries to ${path.relative(ROOT, OUT_MANIFEST)}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
