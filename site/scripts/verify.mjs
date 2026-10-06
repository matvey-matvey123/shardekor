// Проверка собранного сайта: битые ссылки, отсутствующие изображения, sitemap.
// Запуск: node scripts/verify.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(__dirname, "..", "out");
const log = [];

function exists(p) {
  if (p.startsWith("http") || p.startsWith("//") || p.startsWith("mailto:") || p.startsWith("tel:"))
    return true;
  let clean = p.split("#")[0].split("?")[0];
  if (!clean || clean === "/") clean = "/index.html";
  if (!clean.startsWith("/")) return true;
  const full = path.join(out, clean);
  if (fs.existsSync(full) && fs.statSync(full).isFile()) return true;
  if (fs.existsSync(path.join(full, "index.html"))) return true;
  if (fs.existsSync(path.join(out, clean.replace(/\/$/, "") + ".html"))) return true;
  return false;
}

function collectHtml(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "_next" || e.name === "img") continue;
      collectHtml(p, acc);
    } else if (e.name === "index.html" || e.name === "404.html") {
      acc.push(p);
    }
  }
  return acc;
}

const pages = collectHtml(out);
log.push(`страниц проверено: ${pages.length}`);

const badHref = new Map();
const badImg = new Map();
const hrefRe = /(?:href|src)="([^"]+)"/g;

for (const file of pages) {
  const html = fs.readFileSync(file, "utf8");
  let m;
  hrefRe.lastIndex = 0;
  while ((m = hrefRe.exec(html))) {
    const u = m[1];
    if (!exists(u)) {
      const key = u.replace(/\?.*$/, "");
      if (key.startsWith("/img/")) badImg.set(key, (badImg.get(key) || 0) + 1);
      else if (key.startsWith("/")) badHref.set(key, (badHref.get(key) || 0) + 1);
    }
  }
}

log.push(`битых ссылок (href): ${badHref.size}`);
log.push(`битых изображений: ${badImg.size}`);

if (badHref.size) {
  log.push("--- первые битые ссылки:");
  for (const [u, n] of [...badHref.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)) {
    log.push(`  ${n}x  ${u}`);
  }
}
if (badImg.size) {
  log.push("--- первые битые картинки:");
  for (const [u, n] of [...badImg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    log.push(`  ${n}x  ${u}`);
  }
}

// sitemap
const sm = path.join(out, "sitemap.xml");
if (fs.existsSync(sm)) {
  const x = fs.readFileSync(sm, "utf8");
  log.push(`sitemap: ${(x.match(/<url>/g) || []).length} адресов, ${Math.round(x.length / 1024)} КБ`);
} else {
  log.push("sitemap: НЕТ");
}

// вес
let total = 0;
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else total += fs.statSync(p).size;
  }
})(out);
log.push(`вес собранного сайта: ${(total / 1024 / 1024).toFixed(0)} МБ`);

// редиректы
const conf = path.resolve(__dirname, "..", "deploy", "nginx-site.conf");
log.push(
  `редиректы: ${
    fs.existsSync(conf) ? (fs.readFileSync(conf, "utf8").match(/^rewrite /gm) || []).length : "нет конфига"
  } правил`
);

const report = log.join("\n");
fs.writeFileSync(path.resolve(__dirname, "verify-report.txt"), report, "utf8");
console.log(report);