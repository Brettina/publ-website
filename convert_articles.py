import html
import json
import sys
from pathlib import Path

import markdown
import mammoth          # DOCX
import fitz             # PDF (PyMuPDF)
from odf import text as odf_text
from odf import teletype
from odf.opendocument import load as odf_load


ROOT = Path(__file__).resolve().parent

WORK_DIR = ROOT / "assets" / "work"
INDEX_OUT = ROOT / "assets" / "work-index.json"

HTML_WRAP = """<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
</head>
<body>
<article class="prose">
{body}
</article>
</body>
</html>
"""


def log(msg):
    print(msg)


def convert_docx(src: Path, title: str) -> str:
    with src.open("rb") as f:
        result = mammoth.convert_to_html(f)
    return HTML_WRAP.format(title=html.escape(title), body=result.value or "")


def convert_pdf(src: Path, title: str) -> str:
    doc = fitz.open(src)
    parts = []
    for i, page in enumerate(doc, start=1):
        parts.append(f"<section data-page='{i}'>\n{page.get_text('html')}\n</section>")
    return HTML_WRAP.format(title=html.escape(title), body="\n<hr />\n".join(parts))


def convert_md(src: Path, title: str) -> str:
    md = src.read_text(encoding="utf-8", errors="replace")
    body = markdown.markdown(md, extensions=["extra", "sane_lists"])
    return HTML_WRAP.format(title=html.escape(title), body=body)


def convert_odt_basic(src: Path, title: str) -> str:
    odt = odf_load(str(src))
    paras = odt.getElementsByType(odf_text.P)
    body = []
    for p in paras:
        t = teletype.extractText(p).strip()
        if t:
            body.append(f"<p>{html.escape(t)}</p>")
    return HTML_WRAP.format(title=html.escape(title), body="\n".join(body) if body else "<p>(Kein Text gefunden.)</p>")


def pick_source_by_extension(folder: Path) -> Path | None:
    priority = [".docx", ".pdf", ".odt", ".md"]
    best = None
    best_rank = 10**9
    best_mtime = -1.0

    for p in folder.iterdir():
        if not p.is_file():
            continue
        ext = p.suffix.lower()
        if ext not in priority:
            continue

        rank = priority.index(ext)
        mtime = p.stat().st_mtime
        if (rank < best_rank) or (rank == best_rank and mtime > best_mtime):
            best = p
            best_rank = rank
            best_mtime = mtime

    return best


def read_text_if_exists(p: Path) -> str:
    if not p.exists():
        return ""
    return p.read_text(encoding="utf-8", errors="replace").strip()


def read_json_if_exists(p: Path) -> dict:
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def list_images(folder: Path) -> list[str]:
    exts = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}
    imgs = []
    for p in sorted(folder.iterdir()):
        if p.is_file() and p.suffix.lower() in exts:
            imgs.append(p.name)  # store file name only; client can build URL
    return imgs


def main():
    if not WORK_DIR.exists():
        log(f"ERROR: Work folder not found: {WORK_DIR}")
        sys.exit(1)

    converted = 0
    items = []

    for folder in sorted(p for p in WORK_DIR.iterdir() if p.is_dir()):
        slug = folder.name
        meta_path = folder / "meta.json"
        desc_path = folder / "beschreibung.txt"
        out_html = folder / "article.html"

        meta = read_json_if_exists(meta_path)
        description = read_text_if_exists(desc_path)
        images = list_images(folder)

        # title precedence: meta.title > folder name
        title = (meta.get("title") or slug.replace("-", " ")).strip()

        # build article.html from best source if available
        src = pick_source_by_extension(folder)
        if src:
            if (not out_html.exists()) or (out_html.stat().st_mtime < src.stat().st_mtime):
                log(f"→ Converting: {slug} ({src.name})")
                try:
                    ext = src.suffix.lower()
                    if ext == ".docx":
                        html_out = convert_docx(src, title)
                    elif ext == ".pdf":
                        html_out = convert_pdf(src, title)
                    elif ext == ".odt":
                        html_out = convert_odt_basic(src, title)
                    elif ext == ".md":
                        html_out = convert_md(src, title)
                    else:
                        html_out = HTML_WRAP.format(title=html.escape(title), body="")
                    out_html.write_text(html_out, encoding="utf-8")
                    converted += 1
                    log(f"  ✓ wrote {out_html.relative_to(ROOT)}")
                except Exception as e:
                    log(f"  ✗ ERROR converting {slug}: {e}")
            else:
                log(f"✓ {slug}: article.html is up to date (source: {src.name})")
        else:
            # still allow entry in index even if no article source
            if not out_html.exists():
                out_html.write_text(
                    HTML_WRAP.format(
                        title=html.escape(title),
                        body="<p class='fineprint'>(Kein Artikel-Quelldokument gefunden.)</p>"
                    ),
                    encoding="utf-8",
                )

        # Build URLs as site-absolute
        base_url = f"/assets/work/{slug}"
        content_url = f"{base_url}/article.html"

        # cover: meta.cover > first image > empty
        cover = meta.get("cover") or (f"{base_url}/{images[0]}" if images else "")

        items.append({
            "type": "work",
            "slug": slug,
            "title": title,
            "published": meta.get("published", ""),
            "updated": meta.get("updated", ""),
            "eigenanteil": meta.get("eigenanteil", ""),
            "tags": meta.get("tags", []),
            "excerpt": meta.get("excerpt", "") or description,
            "description": description,
            "images": [f"{base_url}/{name}" for name in images],
            "cover": cover,
            "contentUrl": content_url,
            "metaUrl": f"{base_url}/meta.json" if meta_path.exists() else "",
        })

    INDEX_OUT.write_text(
        json.dumps({"items": items}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    log(f"\nDone. Converted {converted} article(s). Wrote {INDEX_OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
