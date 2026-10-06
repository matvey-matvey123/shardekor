// Копирует данные парсера в проект сайта
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const scraperOut = path.resolve(root, "..", "scraper", "out");

const dataSrc = path.join(scraperOut, "catalog.json");
const opt = path.join(scraperOut, "img_opt");
const raw = path.join(scraperOut, "img");
const imgSrc = fs.existsSync(opt) ? opt : raw;
const dataDst = path.join(root, "data");
const pubImg = path.join(root, "public", "img");

fs.mkdirSync(dataDst, { recursive: true });

const haveScraper = fs.existsSync(dataSrc);

if (haveScraper) {
  fs.copyFileSync(dataSrc, path.join(dataDst, "catalog.json"));
  console.log("catalog.json ->", path.join(dataDst, "catalog.json"));

  // полная очистка public/img — иначе старые изображения остаются навсегда
  if (fs.existsSync(pubImg)) fs.rmSync(pubImg, { recursive: true, force: true });
  fs.mkdirSync(pubImg, { recursive: true });

  const stats = { files: 0, bytes: 0 };
  function copyDir(from, to) {
    if (!fs.existsSync(from)) return;
    for (const e of fs.readdirSync(from, { withFileTypes: true })) {
      const s = path.join(from, e.name);
      const d = path.join(to, e.name);
      if (e.isDirectory()) copyDir(s, d);
      else {
        fs.copyFileSync(s, d);
        stats.files++;
        stats.bytes += fs.statSync(s).size;
      }
    }
  }
  copyDir(imgSrc, pubImg);
  console.log(
    "изображений:",
    stats.files,
    "(",
    (stats.bytes / 1024 / 1024).toFixed(1),
    "МБ )"
  );
} else {
  // свежий клон репозитория: scraper/out не собран — работаем с тем, что уже в site/data
  console.log(
    "scraper/out нет — используем site/data/catalog.json и public/img из репозитория"
  );
}

// ---------- лёгкий индекс для поиска по сайту
const catalog = JSON.parse(
  fs.readFileSync(path.join(dataDst, "catalog.json"), "utf8")
);
const index = [];
const byId = new Map();
(function walk(nodes) {
  for (const n of nodes || []) {
    if (n.id != null) byId.set(n.id, n.title);
    walk(n.children);
  }
})(catalog.categories);

for (const p of catalog.products || []) {
  index.push([
    p.name,
    p.slug,
    p.category_id != null ? byId.get(p.category_id) || "" : "",
    p.price ?? 0,
    p.image || "",
    p.code || "",
  ]);
}
fs.writeFileSync(
  path.join(root, "public", "search-index.json"),
  JSON.stringify(index),
  "utf8"
);
console.log("search-index.json:", index.length, "записей");