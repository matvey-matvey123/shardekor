import fs from "node:fs";
import path from "node:path";

export type RawCategory = {
  id?: number | null;
  title: string;
  url: string;
  slug: string;
  image?: string | null;
  h1?: string;
  description_html?: string | null;
  synthetic?: boolean;
  children: RawCategory[];
};

export type Product = {
  id: number | null;
  url: string;
  slug: string;
  name: string;
  code: string | null;
  price_text: string;
  price: number | null;
  qty_text: string | null;
  in_stock: boolean;
  images: string[];
  big_image: string | null;
  description_html: string | null;
  extra_fields: [string, string][];
  category_id: number | null;
  category_slug: string;
  category_title: string;
  breadcrumbs: { title: string; slug: string }[];
  image: string | null;
};

export type Category = {
  id: number | null;
  title: string;
  slug: string;
  path: string;
  url: string;
  image: string | null;
  description: string | null;
  children: Category[];
  parentSlug: string | null;
  productCount: number;
};

export type StaticPage = { title: string; url: string; html: string | null };

type Catalog = {
  categories: Category[];
  products: Product[];
  byCategory: Record<string, Product[]>;
  productBySlug: Record<string, Product>;
  categoryBySlug: Record<string, Category>;
  staticPages: StaticPage[];
  redirects: Record<string, string>;
  totals: { products: number; categories: number; priceMin: number; priceMax: number };
};

const FILE = path.join(process.cwd(), "data", "catalog.json");

const RU: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh",
  щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export function translit(s: string): string {
  return s
    .toLowerCase()
    .split("")
    .map((ch) => (ch in RU ? RU[ch] : ch))
    .join("")
    .replace(/["'«»()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

let cache: Catalog | null = null;

export function getCatalog(): Catalog {
  if (cache) return cache;
  const raw = JSON.parse(fs.readFileSync(FILE, "utf8"));

  // ---------- категории
  const byIdCat = new Map<number | null, Category>();
  const catBySlug: Record<string, Category> = {};

  function slugForCat(oldSlug: string, title: string, taken: Set<string>) {
    let base = translit(title) || translit(oldSlug) || "razdel";
    let s = base;
    let i = 2;
    while (taken.has(s)) s = `${base}-${i++}`;
    return s;
  }

  const takenCat = new Set<string>();
  const index = (nodes: RawCategory[], parent: Category | null) =>
    nodes.map((n) => {
      const slug = slugForCat(n.slug, n.title, takenCat);
      takenCat.add(slug);
      const cat: Category = {
        id: n.id ?? null,
        title: n.title,
        slug,
        path: parent ? `${parent.path}/${slug}` : slug,
        url: `${parent ? parent.url : "/catalog"}/${slug}`,
        image: n.image ? imgFile(n.image) : null,
        description: n.description_html ?? null,
        children: [],
        parentSlug: parent ? parent.slug : null,
        productCount: 0,
      };
      catBySlug[slug] = cat;
      if (n.id != null) byIdCat.set(n.id, cat);
      cat.children = index(n.children || [], cat);
      return cat;
    });

  const cats = index(raw.categories || [], null);
  const flatCats = Object.values(catBySlug);
  const fallbackCat = flatCats[0];
  const parentOf = new Map<string, string>();
  for (const c of flatCats) {
    for (const ch of c.children) parentOf.set(ch.slug, c.slug);
  }

  function crumbsFor(cat: Category | undefined) {
    const chain: string[] = [];
    let cur: string | undefined = cat?.slug ?? fallbackCat?.slug;
    while (cur) {
      chain.unshift(cur);
      cur = parentOf.get(cur);
    }
    return chain.map((s) => ({ title: catBySlug[s].title, slug: s }));
  }

  // сколько товаров в разделе с учётом вложенных
  const directCount: Record<string, number> = {};
  for (const c of flatCats) directCount[c.slug] = 0;

  // ---------- товары
  const redirects: Record<string, string> = {};
  const takenProd = new Set<string>();
  const products: Product[] = [];

  for (const p of raw.products || []) {
    if (!p.url) continue;
    let cat = p.category_id != null ? byIdCat.get(p.category_id) : undefined;
    if (!cat) cat = fallbackCat;
    const crumbs = crumbsFor(cat);

    let base = translit(p.name) || `tovar-${p.id}`;
    let slug = base;
    let k = 2;
    while (takenProd.has(slug)) slug = `${base}-${k++}`;
    takenProd.add(slug);

    const imgs = ((p.images as string[]) || []).filter((i) => i && i !== "noimage.gif");
    const item: Product = {
      id: p.id,
      url: p.url,
      slug,
      name: p.name,
      code: p.code || null,
      price_text: p.price_text || "",
      price: typeof p.price === "number" ? p.price : null,
      qty_text: p.qty_text || null,
      in_stock: p.in_stock !== false,
      images: imgs,
      big_image: p.big_image && p.big_image !== "noimage.gif" ? p.big_image : null,
      description_html: p.description_html || null,
      extra_fields: p.extra_fields || [],
      category_id: p.category_id ?? null,
      category_slug: cat?.slug ?? "",
      category_title: cat?.title ?? "Каталог",
      breadcrumbs: crumbs,
      image: imgs[0] || null,
    };
    products.push(item);
    redirects[p.url] = `/product/${slug}/`;
    if (cat) directCount[cat.slug] = (directCount[cat.slug] || 0) + 1;
  }

  // ---------- распределение по разделам (с учётом потомков)
  const byCategory: Record<string, Product[]> = {};
  for (const c of flatCats) byCategory[c.slug] = [];

  for (const pr of products) {
    for (const cb of pr.breadcrumbs) {
      if (!byCategory[cb.slug]) byCategory[cb.slug] = [];
      byCategory[cb.slug].push(pr);
    }
  }

  function countAll(slug: string): number {
    const c = catBySlug[slug];
    if (!c) return 0;
    let n = (directCount[slug] || 0);
    for (const ch of c.children) n += countAll(ch.slug);
    return n;
  }
  for (const c of flatCats) c.productCount = countAll(c.slug);

  const productBySlug: Record<string, Product> = {};
  for (const pr of products) productBySlug[pr.slug] = pr;

  // ---------- статические страницы
  const staticPages: StaticPage[] = [];
  const takenStatic = new Set<string>();
  for (const key of Object.keys(raw.static || {})) {
    // home — перенесён на главную страницу; кабинет не нужен; контакты сделаны отдельной страницей /contacts/
    if (key === "home" || key === "кабинет" || key === "контакты") continue;
    const s = raw.static[key];
    let slug = translit(s.title || key) || translit(key);
    let i = 2;
    while (takenStatic.has(slug) || catBySlug[slug] || productBySlug[slug])
      slug = `${translit(s.title || key)}-${i++}`;
    takenStatic.add(slug);
    staticPages.push({
      title: s.title || key,
      url: `/${slug}/`,
      html: s.html || null,
    });
    redirects[s.url] = `/${slug}/`;
  }

  // ---------- прочие редиректы со старых адресов
  const setRedirect = (from: string, to: string) => {
    if (from && from !== to && !(from in redirects)) redirects[from] = to;
  };
  for (const c of flatCats) {
    const rawNode = findRaw(raw.categories, c.id);
    if (rawNode) setRedirect(rawNode.url, `${c.url}/`);
    if (c.id != null) setRedirect(`/home/category/view/${c.id}.html`, `${c.url}/`);
  }
  // старые SEF-адреса вида /home/<раздел>.html — восстанавливаем из путей товаров
  for (const p of products) {
    if (!p.url || p.url.includes("/product/view/")) continue;
    const cat = catBySlug[p.category_slug];
    if (!cat) continue;
    const dir = p.url.split("/").slice(0, -1).join("/");
    if (dir) setRedirect(`${dir}.html`, `${cat.url}/`);
  }
  redirects["/home.html"] = "/";
  redirects["/home"] = "/";
  redirects["/index.php"] = "/";
  redirects["/контакты.html"] = "/contacts/";
  redirects["/кабинет.html"] = "/contacts/";
  redirects["/cart/view.html"] = "/catalog/";
  redirects["/"] = "/";

  const prices = products.map((p) => p.price).filter((v): v is number => v != null);

  cache = {
    categories: cats,
    products,
    byCategory,
    productBySlug,
    categoryBySlug: catBySlug,
    staticPages,
    redirects,
    totals: {
      products: products.length,
      categories: flatCats.length,
      priceMin: prices.length ? Math.min(...prices) : 0,
      priceMax: prices.length ? Math.max(...prices) : 0,
    },
  };
  return cache;
}

function findRaw(nodes: RawCategory[], id: number | null): RawCategory | null {
  if (id == null) return null;
  for (const n of nodes || []) {
    if (n.id === id) return n;
    const r = findRaw(n.children || [], id);
    if (r) return r;
  }
  return null;
}

export function imgFile(u: string | null | undefined): string | null {
  if (!u) return null;
  if (!u.includes("/")) return u === "noimage.gif" ? null : `/img/${u}`;
  const m = u.match(/img_products\/([^/?#]+)/) || u.match(/img_categories\/([^/?#]+)/);
  if (!m) return null;
  if (m[1] === "noimage.gif") return null;
  return `/img/${m[1]}`;
}

// ------------------------------------------------------------------ helpers
export function fmtPrice(v: number | null | undefined): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(v) + " ₽";
}

export function priceFromText(t: string | null): number | null {
  if (!t) return null;
  const m = t.replace(/\s/g, "").replace(",", ".").match(/[\d.]+/);
  return m ? parseFloat(m[0]) : null;
}

export function plainText(html: string | null): string {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getProduct(slug: string) {
  return getCatalog().productBySlug[decodeURIComponent(slug)] ?? null;
}

export function getCategory(slug: string) {
  return getCatalog().categoryBySlug[decodeURIComponent(slug)] ?? null;
}

export function siblings(cat: Category): Category[] {
  const c = getCatalog();
  if (!cat.parentSlug) return c.categories;
  return c.categoryBySlug[cat.parentSlug]?.children ?? [];
}

/** Адрес новой страницы по старому адресу Joomla (например "/контакты.html"). */
export function pageUrl(rawUrl: string): string | null {
  const { redirects, staticPages } = getCatalog();
  const to = redirects[rawUrl];
  if (to) return to;
  const hit = staticPages.find((p) => p.url === rawUrl);
  return hit ? hit.url : null;
}