// Генерирует правила 301 со старых адресов Joomla на новые адреса.
// Запуск: node scripts/make-redirects.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const deploy = path.join(root, "deploy");

const RU = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh",
  щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};
const translit = (s) =>
  s
    .toLowerCase()
    .split("")
    .map((ch) => (ch in RU ? RU[ch] : ch))
    .join("")
    .replace(/["'«»()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const cat = JSON.parse(
  fs.readFileSync(path.join(root, "data", "catalog.json"), "utf8")
);

// ---------- slug-и категорий (те же правила, что в lib/catalog.ts)
const takenCat = new Set();
const catSlugById = new Map();
const catUrlById = new Map();
const rawUrlById = new Map();

function slugCat(oldSlug, title) {
  let base = translit(title) || translit(oldSlug) || "razdel";
  let s = base;
  let i = 2;
  while (takenCat.has(s)) s = `${base}-${i++}`;
  takenCat.add(s);
  return s;
}

(function index(nodes) {
  for (const n of nodes || []) {
    const slug = slugCat(n.slug, n.title);
    if (n.id != null) {
      catSlugById.set(n.id, slug);
      catUrlById.set(n.id, `/catalog/${slug}/`);
      rawUrlById.set(n.id, n.url);
    }
    index(n.children);
  }
})(cat.categories);

// ---------- карта редиректов
const map = new Map();
const put = (from, to) => {
  if (from && to && from !== to && !map.has(from)) map.set(from, to);
};
for (const [id, rawUrl] of rawUrlById) put(rawUrl, catUrlById.get(id));
for (const [id, url] of catUrlById) put(`/home/category/view/${id}.html`, url);

const takenProd = new Set();
const idToSlug = new Map();
for (const p of cat.products || []) {
  if (!p.url) continue;
  let base = translit(p.name) || `tovar-${p.id}`;
  let slug = base;
  let k = 2;
  while (takenProd.has(slug)) slug = `${base}-${k++}`;
  takenProd.add(slug);
  map.set(p.url, `/product/${slug}/`);
  if (p.id != null) idToSlug.set(p.id, slug);
}

// старые SEF-адреса вида /home/<раздел>.html — по каталогу товаров
for (const p of cat.products || []) {
  if (!p.url || p.url.includes("/product/view/")) continue;
  const to = catUrlById.get(p.category_id);
  if (!to) continue;
  const dir = p.url.split("/").slice(0, -1).join("/");
  put(`${dir}.html`, to);
}

for (const key of Object.keys(cat.static || {})) {
  if (key === "home" || key === "кабинет") continue;
  if (key === "контакты") {
    map.set(cat.static[key].url, "/contacts/");
    continue;
  }
  const s = cat.static[key];
  let base = translit(s.title || key) || translit(key);
  let slug = base;
  let i = 2;
  while (takenProd.has(slug) || takenCat.has(slug)) slug = `${base}-${i++}`;
  takenProd.add(slug);
  map.set(s.url, `/${slug}/`);
}

map.set("/home.html", "/");
map.set("/home", "/");

fs.mkdirSync(deploy, { recursive: true });

// ---------- nginx: rewrite-правила для блока server { }
{
  const lines = [
    "# ============================================================",
    "# Файл АВТОГЕНЕРИРОВАН. Не редактировать вручную.",
    `# Редиректы со старых адресов Joomla -> новые (${map.size} правил)`,
    "# ============================================================",
    "# Вставить содержимое этого файла ВНУТРЬ блока server { } сайта",
    "# (например, после блока location / { } )",
    "",
  ];
  for (const [from, to] of map) {
    if (from === "/") continue;
    lines.push(`rewrite ^${esc(from)}$ ${to} permanent;`);
  }
  lines.push("location = /cart/view.html { return 301 /catalog/; }");
  lines.push("location = /home/search/result.html { return 301 /catalog/; }");
  lines.push("location = /home/search/ { return 301 /catalog/; }");
  lines.push("location = /administrator { return 301 /; }");
  lines.push("");
  lines.push("# Правильная кодировка кириллических адресов");
  lines.push("charset utf-8;");
  lines.push("charset_types text/css application/javascript application/json;");
  lines.push("");
  lines.push("# Отдавать статику из out/ и не отдавать .html дважды");
  lines.push("location / {");
  lines.push("    try_files $uri $uri/ $uri/index.html =404;");
  lines.push("}");
  lines.push("");
  lines.push("location ~* \\.(jpg|jpeg|png|webp|gif|svg|ico|woff2?)$ {");
  lines.push("    expires 1y;");
  lines.push("    add_header Cache-Control \"public, immutable\";");
  lines.push("}");
  lines.push("");
  lines.push("location = /index.html { add_header Cache-Control \"no-cache\"; }");
  lines.push("");
  lines.push("gzip on;");
  lines.push("gzip_types text/plain text/css application/javascript application/json image/svg+xml;");
  lines.push("gzip_min_length 512;");
  fs.writeFileSync(path.join(deploy, "nginx-site.conf"), lines.join("\n"), "utf8");
  console.log("nginx-site.conf:", map.size, "редиректов");
}

// ---------- nginx: map по product_id (для старых ссылок ?product_id=N)
{
  const lines = [
    "# ============================================================",
    "# Файл АВТОГЕНЕРИРОВАН. Не редактировать вручную.",
    "# Карта старых товаров по их id (JoomShopping).",
    "# Вставить ВНУТРЬ блока http { } рядом с другими map {}",
    "# ============================================================",
    "",
    "map $arg_product_id $pid_target {",
    "    default /catalog/;",
  ];
  for (const [id, slug] of [...idToSlug.entries()].sort((a, b) => a[0] - b[0])) {
    lines.push(`    ${id} /product/${slug}/;`);
  }
  lines.push("}");
  lines.push("");
  fs.writeFileSync(path.join(deploy, "nginx-product-map.conf"), lines.join("\n"), "utf8");
  console.log("nginx-product-map.conf:", idToSlug.size, "товаров");
}

// ---------- apache .htaccess
{
  const ht = [
    "# Файл АВТОГЕНЕРИРОВАН. Не редактировать вручную.",
    "",
    "RewriteEngine On",
    "",
    "# --- редиректы со старых адресов",
  ];
  for (const [from, to] of map) {
    if (from === "/") continue;
    const q = from.replace(/[?#&+]/g, "\\$&");
    ht.push(`RedirectMatch 301 "^${q}$" "${to}"`);
  }
  ht.push("");
  ht.push("RedirectMatch 301 ^/cart/view\\.html$ /catalog/");
  ht.push("RedirectMatch 301 ^/home/search/result\\.html$ /catalog/");
  ht.push("RedirectMatch 301 ^/administrator/?$ /");
  ht.push("");
  ht.push("# --- старые ссылки вида ?product_id=700");
  ht.push("RewriteCond %{QUERY_STRING} (^|&)product_id=([0-9]+)(&|$)");
  ht.push("RewriteRule ^$ /index.html?pid=%2 [R=301,L]");
  ht.push("");
  ht.push("# --- кодировка");
  ht.push("AddDefaultCharset UTF-8");
  ht.push("");
  ht.push("# --- статика и сжатие");
  ht.push("<IfModule mod_deflate.c>");
  ht.push("  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml");
  ht.push("</IfModule>");
  ht.push("<IfModule mod_expires.c>");
  ht.push("  ExpiresActive On");
  ht.push('  ExpiresByType image/jpeg "access plus 1 year"');
  ht.push('  ExpiresByType image/png "access plus 1 year"');
  ht.push('  ExpiresByType image/webp "access plus 1 year"');
  ht.push('  ExpiresByType text/css "access plus 1 month"');
  ht.push('  ExpiresByType application/javascript "access plus 1 month"');
  ht.push("</IfModule>");
  fs.writeFileSync(path.join(deploy, ".htaccess"), ht.join("\n"), "utf8");
  console.log(".htaccess готов");
}