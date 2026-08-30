import { promises as fs } from "fs";
import path from "path";

const ROOT = process.cwd();

const SHOP_DIR = path.join(ROOT, "assets", "shop");
const OUT_FILE = path.join(ROOT, "assets", "products.json");

// keep your current order section stable:
const DEFAULT_ORDER = {
  pickupHint: "Bestellung = Reservierung zur Abholung. Du wählst Ort + Zeitpunkt, ich bestätige per Mail.",
  defaultCenter: { lat: 49.989, lng: 9.578 },
  locations: [
    { label: "Lohr Zentrum", lat: 49.989, lng: 9.578 },
    { label: "Niederwürschnitz – Alte Ziegelei (Nach den Steegen 2)", lat: 50.7357161, lng: 12.7686627 },
    { label: "Chemnitz – Stadtpark", lat: 50.8087278, lng: 12.9012 }
  ]
};

const IMG_RE = /\.(png|jpe?g|webp)$/i;
const IGNORE_RE = /\.(odt|docx?|pdf|psd|ai)$/i;

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function readJsonIfExists(p) {
  if (!(await exists(p))) return null;
  try { return JSON.parse(await fs.readFile(p, "utf8")); } catch { return null; }
}

async function listSubdirs(dir) {
  if (!(await exists(dir))) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries.filter(e => e.isDirectory()).map(e => e.name);
}

async function listImages(folderPath) {
  const entries = await fs.readdir(folderPath, { withFileTypes: true });
  return entries
    .filter(e => e.isFile())
    .map(e => e.name)
    .filter(name => !IGNORE_RE.test(name) && IMG_RE.test(name))
    .sort((a, b) => a.localeCompare(b));
}

function toWebImageUrl(slug, filename) {
  return `/assets/shop/${slug}/${filename}`;
}

async function main() {
  const slugs = await listSubdirs(SHOP_DIR);

  const products = [];
  for (const slug of slugs) {
    const folder = path.join(SHOP_DIR, slug);
    const meta = await readJsonIfExists(path.join(folder, "meta.json"));
    const images = await listImages(folder);

    const name = meta?.name || meta?.title || slug;
    const description = meta?.description || meta?.desc || "";
    const status = meta?.status || "verfügbar";
    const variants = Array.isArray(meta?.variants) ? meta.variants : ["Standard"];
    const unit = meta?.unit || "Stück";
    const price = typeof meta?.price === "number" ? meta.price : null;

    const imageUrls = images.map(f => toWebImageUrl(slug, f));

    products.push({
      id: slug,
      page: "webshop",
      name,
      description,
      image: imageUrls[0] || "",
      images: imageUrls,
      status,
      variants,
      unit,
      price,
      pickupRequired: Boolean(meta?.pickupRequired),
      decorateJuice: Boolean(meta?.decorateJuice)
    });
  }

  const out = { products, order: DEFAULT_ORDER };
  await fs.writeFile(OUT_FILE, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`Wrote ${OUT_FILE} with ${products.length} products`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
