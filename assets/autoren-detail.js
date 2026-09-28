// Shared renderer for every /webpages/autoren/<slug>/ page. One script,
// not copy-pasted per author — each author's index.html is just a thin
// wrapper (<div id="author-detail">) that includes this file; the slug is
// read from the URL path itself, so adding a new author only ever means
// adding a new author/<slug>.json + a new (identical) wrapper folder,
// never a second copy of this rendering logic to keep in sync.
(function () {
  async function fetchJson(url) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  function escapeHtml(s) {
    return (s || "").toString()
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  // /webpages/autoren/<slug>/ (or /webpages/autoren/<slug>/index.html) -> <slug>
  function slugFromPath() {
    const parts = location.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] || "";
    return last === "index.html" ? (parts[parts.length - 2] || "") : last;
  }

  function buildWorkIndexBySlug(workIndexData) {
    const map = {};
    (workIndexData?.items || []).forEach(item => {
      if (item && item.slug) map[item.slug] = item;
    });
    return map;
  }

  function buildMerchById(productsData) {
    const map = {};
    (productsData?.products || []).forEach(p => {
      if (p && p.id) map[p.id] = p;
    });
    return map;
  }

  // Books: not a blank article.html page, but the webshop with that exact
  // book's modal already open (?p=<slug> — webshop's product id IS the
  // work-index slug for books, see loadBooksFromWorkIndex).
  function bookLinkHtml(slug, workIndexBySlug) {
    const item = workIndexBySlug[slug];
    const title = item?.title || slug;
    return `<li><a href="/webpages/webshop/?p=${encodeURIComponent(slug)}">${escapeHtml(title)}</a></li>`;
  }

  // Tools/games: not the webshop and not the blank article.html page, but
  // the interactive tool itself (its folder's own index.html) — explicit
  // user correction for the Morphologie-Werkzeug.
  function toolLinkHtml(slug, workIndexBySlug) {
    const item = workIndexBySlug[slug];
    const title = item?.title || slug;
    const category = item?.category || "games";
    return `<li><a href="/assets/work/${encodeURIComponent(category)}/${encodeURIComponent(slug)}/">${escapeHtml(title)}</a></li>`;
  }

  // Articles: no webshop/tool equivalent, so contentUrl (article.html)
  // stays correct here.
  function articleLinkHtml(slug, workIndexBySlug) {
    const item = workIndexBySlug[slug];
    const title = item?.title || slug;
    const url = item?.contentUrl || "";
    return url
      ? `<li><a href="${url}">${escapeHtml(title)}</a></li>`
      : `<li>${escapeHtml(title)}</li>`;
  }

  function merchLinkHtml(slug, merchById) {
    const item = merchById[slug];
    const title = item?.name || slug;
    return `<li><a href="/webpages/webshop/?p=${encodeURIComponent(slug)}">${escapeHtml(title)}</a></li>`;
  }

  function worksSectionHtml(label, slugs, linkFn) {
    if (!Array.isArray(slugs) || !slugs.length) return "";
    return `<h3>${escapeHtml(label)}</h3><ul>${slugs.map(linkFn).join("")}</ul>`;
  }

  async function init() {
    const root = document.getElementById("author-detail");
    if (!root) return;

    const slug = slugFromPath();
    const [author, workIndexData, productsData] = await Promise.all([
      fetchJson(`/assets/author/${encodeURIComponent(slug)}.json`),
      fetchJson("/assets/work-index.json"),
      fetchJson("/assets/shop/products.json"),
    ]);

    if (!author) {
      root.innerHTML = `<p class="fineprint">Dieser Autor wurde nicht gefunden. <a href="/webpages/autoren/">Zurück zur Autoren-Übersicht</a></p>`;
      return;
    }

    const name = author.name || slug;
    document.title = `${name} - Autoren - publish-Lohr`;

    const workIndexBySlug = buildWorkIndexBySlug(workIndexData);
    const merchById = buildMerchById(productsData);

    const photo = author.photo || "/img/webicon.png";
    const genres = Array.isArray(author.genres) ? author.genres : [];
    const works = author.works || {};
    const website = author.links?.website || "";

    const worksHtml = [
      worksSectionHtml("Bücher", works.books, s => bookLinkHtml(s, workIndexBySlug)),
      worksSectionHtml("Werkzeuge & Spiele", works.tools, s => toolLinkHtml(s, workIndexBySlug)),
      worksSectionHtml("Merch", works.merch, s => merchLinkHtml(s, merchById)),
      worksSectionHtml("Artikel", works.articles, s => articleLinkHtml(s, workIndexBySlug)),
    ].join("");

    root.innerHTML = `
      <img class="author-photo-large" src="${photo}" alt="${escapeHtml(name)}" onerror="this.src='/img/webicon.png';" />
      <h1 style="margin:12px 0 0;">${escapeHtml(name)}</h1>
      ${genres.length ? `<div class="author-genres">${genres.map(g => `<span class="chip">${escapeHtml(g)}</span>`).join("")}</div>` : ""}
      ${author.personal ? `<p class="author-bio">${escapeHtml(author.personal)}</p>` : ""}
      ${website ? `<p><a href="${website}" target="_blank" rel="noopener">Website von ${escapeHtml(name)}</a></p>` : ""}
      <div class="author-works">${worksHtml}</div>
      <p class="fineprint" style="margin-top:20px;"><a href="/webpages/autoren/">← Zurück zur Autoren-Übersicht</a></p>
    `;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
