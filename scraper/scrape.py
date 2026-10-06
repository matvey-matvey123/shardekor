# -*- coding: utf-8 -*-
"""
Парсер каталога ШарДекор (Joomla + JoomShopping) -> out/catalog.json + out/img/*
"""
import os
import re
import sys
import json
import time
import hashlib
import urllib.parse
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from lxml import html as LH

BASE = "http://xn--80aiduuie1d.xn--p1ai"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
IMG = os.path.join(OUT, "img")
CACHE = os.path.join(OUT, "cache")

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
HEADERS = {"User-Agent": UA, "Accept-Language": "ru-RU,ru;q=0.9"}
IMG_RE = re.compile(r"/components/com_jshopping/files/img_products/([^/?#]+)")
IMG_HOST = BASE + "/components/com_jshopping/files/img_products/"

_lock = threading.Lock()
_print_lock = threading.Lock()
_seen_img = set()


def norm(path):
    p = urllib.parse.unquote(path)
    p = re.sub(r"/+", "/", p)
    return p.rstrip("/") or "/"


def fetch(path_or_url, tries=3, cache=True):
    url = path_or_url if path_or_url.startswith("http") else BASE + urllib.parse.quote(path_or_url, safe="/?&=,.")
    cfile = os.path.join(CACHE, hashlib.md5(url.encode("utf-8")).hexdigest() + ".html")
    if cache and os.path.exists(cfile):
        try:
            with open(cfile, "r", encoding="utf-8") as f:
                return f.read()
        except Exception:
            pass
    for i in range(tries):
        try:
            r = requests.get(url, headers=HEADERS, timeout=45)
            if r.status_code == 200:
                r.encoding = "utf-8"
                if cache:
                    try:
                        with open(cfile, "w", encoding="utf-8") as f:
                            f.write(r.text)
                    except Exception:
                        pass
                return r.text
        except Exception as e:
            if i == tries - 1:
                with _print_lock:
                    print("  ! fetch fail", url, e, flush=True)
        time.sleep(1.2 * (i + 1))
    return None


def tree(root):
    return LH.fromstring("<div>%s</div>" % root)


def txt(node):
    if node is None:
        return ""
    if isinstance(node, (list, tuple)):
        if not node:
            return ""
        node = node[0]
    if isinstance(node, str):
        return re.sub(r"\s+", " ", node).strip()
    return re.sub(r"\s+", " ", node.text_content()).strip()


def price_to_num(s):
    if not s:
        return None
    s = re.sub(r"[^\d,.\s]", "", s).replace(" ", "")
    s = s.replace(",", ".")
    m = re.search(r"\d+(?:\.\d+)?", s)
    return float(m.group(0)) if m else None


# ---------------------------------------------------------------- categories
def parse_menu(root):
    """Дерево категорий из блока art-vmenu главной."""
    out = []
    SKIP = set(p for p, _ in STATIC_PAGES)  # текстовые страницы не являются категориями

    def walk(ul, parent):
        for li in ul.xpath("./li"):
            a = li.xpath("./a")
            if not a:
                continue
            a = a[0]
            href = norm(a.get("href") or "/")
            if href in SKIP:
                continue
            title = txt(a)
            img = a.xpath(".//img/@src")
            node = {
                "title": title,
                "url": href,
                "slug": href.strip("/").split("/")[-1],
                "image": absolutize(img[0]) if img else None,
                "children": [],
            }
            sub = li.xpath("./ul")
            if sub:
                node["children"] = walk(sub[0], href)
            out.append(node)
        return out

    for ul in root.xpath(".//ul[contains(@class,'art-vmenu')]"):
        walk(ul, None)
    return out


def absolutize(u):
    if not u:
        return None
    if u.startswith("http"):
        return u
    return BASE + (u if u.startswith("/") else "/" + u)


def uniq(nodes):
    seen, res = set(), []
    for n in nodes:
        if n["url"] in seen:
            continue
        seen.add(n["url"])
        res.append(n)
    return res


def crawl_category(node, products_by_cat):
    """Скачать страницу категории: собрать товары и подкатегории."""
    page = fetch(node["url"])
    if not page:
        return []
    root = tree(page)

    m = re.search(r"category_id=(\d+)", page)
    cid = int(m.group(1)) if m else None
    node["id"] = cid

    desc = root.xpath("//div[contains(@class,'category_description')]")
    if desc:
        node["description_html"] = clean_html(LH.tostring(desc[0], encoding="unicode"))
    node["h1"] = txt(root.xpath("//h1")[0]) if root.xpath("//h1") else node["title"]

    subs = []
    for blk in root.xpath("//div[contains(@class,'jshop_categ')]"):
        a = blk.xpath(".//a[contains(@class,'product_link')] | .//div[contains(@class,'category_name')]/a")
        if not a:
            continue
        a = a[0]
        href = norm(a.get("href") or "/")
        if not href.endswith(".html"):
            continue
        im = blk.xpath(".//img/@src")
        subs.append({
            "title": txt(a),
            "url": href,
            "slug": href.strip("/").split("/")[-1],
            "image": absolutize(im[0]) if im else None,
            "children": [],
        })
    subs = uniq([s for s in subs if s["url"] != node["url"]])

    prods = []
    for blk in root.xpath("//div[contains(@class,'productitem_')]"):
        p = parse_product_card(blk)
        if p:
            prods.append(p)
    if cid:
        bucket = products_by_cat.setdefault(cid, [])
        have = {p["id"] for p in bucket}
        bucket += [p for p in prods if p["id"] not in have]

    return subs


def parse_product_card(blk):
    a = blk.xpath("./div[contains(@class,'name')]/a")
    if not a:
        return None
    url = norm(a[0].get("href") or "/")
    name = txt(a[0])
    pid = re.search(r"productitem_(\d+)", blk.get("class", ""))
    buy = blk.xpath(".//a[contains(@class,'button_buy')]/@href")
    cid = None
    if buy:
        mm = re.search(r"category_id=(\d+)", buy[0])
        cid = int(mm.group(1)) if mm else None
    pr = blk.xpath(".//*[contains(@class,'jshop_price')]/span")
    price = txt(pr[0]) if pr else ""
    th = blk.xpath(".//img[contains(@class,'jshop_img')]/@src")
    qty = blk.xpath(".//div[contains(@class,'qty_in_stock')]/span")
    return {
        "id": int(pid.group(1)) if pid else None,
        "url": url,
        "name": name,
        "price_text": price,
        "price": price_to_num(price),
        "thumb": absolutize(th[0]) if th else None,
        "qty_text": txt(qty[0]) if qty else None,
        "category_id": cid,
    }


# ---------------------------------------------------------------- product
def parse_product_page(url, card):
    page = fetch(url)
    if not page:
        return None
    root = tree(page)

    h1 = root.xpath("//h1")
    name = txt(h1[0]) if h1 else card["name"]
    name = re.sub(r"\s*\(Код:.*?\)\s*$", "", name).strip()
    code = txt(root.xpath("//span[@id='product_code']"))

    main = root.xpath("//img[starts-with(@id,'main_image_')]/@src")
    big = root.xpath("//a[starts-with(@id,'main_image_full_')]/@href")
    desc = root.xpath("//div[contains(@class,'jshop_prod_description')]")
    price = txt(root.xpath("//span[@id='block_price']"))
    qty = txt(root.xpath("//span[@id='product_qty']"))
    stock = {
        "in_stock": qty not in ("0", "Нет в наличии", ""),
        "qty_text": qty or None,
    }

    efs = []
    for el in root.xpath("//div[contains(@class,'extra_fields_el')]"):
        n = txt(el.xpath(".//span[contains(@class,'extra_fields_name')]"))
        v = txt(el.xpath(".//span[contains(@class,'extra_fields_value')]"))
        if n:
            efs.append([n.rstrip(":"), v])

    gal = []
    seen = set()
    for src in main:
        fn = IMG_RE.search(src)
        if fn and fn.group(1) not in seen:
            seen.add(fn.group(1))
            gal.append(fn.group(1))

    pid = card.get("id")
    if not pid:
        mm = re.search(r'name="product_id"[^>]*value="(\d+)"', page)
        pid = int(mm.group(1)) if mm else None

    return {
        "id": pid,
        "url": url,
        "name": name,
        "code": code or None,
        "price_text": price or card.get("price_text") or "",
        "price": price_to_num(price) if price else card.get("price"),
        "qty_text": stock["qty_text"],
        "in_stock": stock["in_stock"],
        "images": gal,
        "big_image": (IMG_RE.search(big[0]).group(1) if big and IMG_RE.search(big[0]) else (gal[0] if gal else None)),
        "description_html": clean_html(LH.tostring(desc[0], encoding="unicode")) if desc else None,
        "extra_fields": efs,
        "category_id": card.get("category_id"),
        "thumb": card.get("thumb"),
    }


def clean_html(s):
    if not s:
        return None
    s = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", s, flags=re.S | re.I)
    s = re.sub(r"<!--.*?-->", " ", s, flags=re.S)
    s = re.sub(r"<br\s*/?>", "\n", s, flags=re.I)
    s = re.sub(r"</(p|div|li|tr|h\d)>", "\n", s, flags=re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    s = (s.replace("&nbsp;", " ").replace("&quot;", '"')
          .replace("&laquo;", "\u00ab").replace("&raquo;", "\u00bb")
          .replace("&ndash;", "\u2013").replace("&mdash;", "\u2014")
          .replace("&amp;", "&").replace("&#39;", "'").replace("&lt;", "<").replace("&gt;", ">"))
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n\s*\n\s*\n+", "\n\n", s)
    s = s.strip()
    return s or None


# ---------------------------------------------------------------- images
def dl(fname):
    if not fname:
        return None
    dest = os.path.join(IMG, fname)
    if fname in _seen_img:
        return dest
    _seen_img.add(fname)
    if os.path.exists(dest) and os.path.getsize(dest) > 800:
        return dest
    try:
        r = requests.get(IMG_HOST + urllib.parse.quote(fname), headers=HEADERS, timeout=60)
        if r.status_code == 200 and len(r.content) > 800:
            with open(dest, "wb") as f:
                f.write(r.content)
            return dest
    except Exception:
        pass
    return None


def download_images(items, workers=12):
    fnames = []
    for it in items:
        fnames += it.get("images") or []
        if it.get("big_image"):
            fnames.append(it["big_image"])
    fnames = list(dict.fromkeys(f for f in fnames if f and f != "noimage.gif"))
    print("изображений к скачиванию:", len(fnames), flush=True)
    done = 0
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = {ex.submit(dl, f): f for f in fnames}
        for fu in as_completed(futs):
            fu.result()
            done += 1
            if done % 200 == 0:
                print("  ...", done, "/", len(fnames), flush=True)
    print("готово:", done, flush=True)


# ---------------------------------------------------------------- static
STATIC_PAGES = [
    ("/home.html", "home"),
    ("/оформление-свадьбы.html", "оформление-свадьбы"),
    ("/доставка-и-оплата.html", "доставка-и-оплата"),
    ("/контакты.html", "контакты"),
    ("/полезная-информация.html", "полезная-информация"),
    ("/кабинет.html", "кабинет"),
]


def crawl_static():
    out = {}
    with ThreadPoolExecutor(max_workers=6) as ex:
        futs = {}
        for path, name in STATIC_PAGES:
            futs[ex.submit(fetch, path)] = (name, path)
        for fu in as_completed(futs):
            name, path = futs[fu]
            page = fu.result()
            if not page:
                continue
            root = tree(page)
            for bad in root.xpath("//script|//style|//nav|//header|//footer|//*[@id='system-message-container']"):
                bad.getparent().remove(bad)
            main = root.xpath("//div[contains(@class,'art-postcontent')]")
            body = main[-1] if main else root
            title = txt(root.xpath("//h1")[0]) if root.xpath("//h1") else name
            out[name] = {
                "title": title,
                "url": path,
                "html": clean_html(LH.tostring(body, encoding="unicode")),
            }
            print("static:", name, len(out[name]["html"] or ""), flush=True)
    return out


# ---------------------------------------------------------------- main
def main():
    os.makedirs(IMG, exist_ok=True)
    os.makedirs(CACHE, exist_ok=True)
    print("1/6 главная страница...", flush=True)
    home = fetch("/")
    root = tree(home)

    print("2/6 дерево категорий...", flush=True)
    cats = parse_menu(root)
    print("   корневых разделов:", len(cats), flush=True)

    products_by_cat = {}
    MAX_DEPTH = 4

    # на старом сайте один раздел бывает доступен по двум адресам (/home/x.html и /y/x.html),
    # поэтому идентифицируем раздел по его id, а не по URL
    node_by_id = {}
    known_urls = set()

    def collect(nodes, depth=0, acc=None):
        acc = [] if acc is None else acc
        for n in nodes:
            if n["url"] in known_urls or depth > MAX_DEPTH:
                continue
            known_urls.add(n["url"])
            acc.append((n, depth))
            collect(n.get("children") or [], depth + 1, acc)
        return acc

    processed = 0
    while True:
        batch = collect(cats)
        if not batch:
            break
        with ThreadPoolExecutor(max_workers=6) as ex:
            futs = {}
            for n, d in batch:
                futs[ex.submit(crawl_category, n, products_by_cat)] = (n, d)
            for fu in as_completed(futs):
                n, d = futs[fu]
                subs = fu.result()
                if not subs or d >= MAX_DEPTH:
                    continue
                if n.get("id") is not None and n["id"] in node_by_id:
                    continue
                if n.get("id") is not None:
                    node_by_id[n["id"]] = n
                fresh = []
                for s in subs:
                    if s["url"] in known_urls:
                        continue
                    known_urls.add(s["url"])
                    fresh.append(s)
                n["children"] = uniq((n.get("children") or []) + fresh)
        processed += len(batch)
        print("   категорий обработано:", processed, flush=True)

    print("3/6 статические страницы...", flush=True)
    static = crawl_static()

    print("4/6 сбор списка товаров...", flush=True)
    all_url = "/home/search/result.html?search=&search_type=any&category_id=0&limitstart=0&limit=99999&orderby=4&order=1"
    page = fetch(all_url)
    universe = []
    if page:
        for blk in tree(page).xpath("//div[contains(@class,'productitem_')]"):
            p = parse_product_card(blk)
            if p:
                universe.append(p)
    print("   товаров в общем списке:", len(universe), flush=True)

    by_url = {p["url"]: p for p in universe if p.get("url")}
    for pid, lst in products_by_cat.items():
        for p in lst:
            if p.get("url") and p["url"] not in by_url:
                by_url[p["url"]] = p
                universe.append(p)

    # product_id -> карточка (для правильной категории)
    card_by_id = {}
    for p in universe:
        if p.get("id"):
            card_by_id.setdefault(p["id"], p)

    print("   уникальных товаров:", len(universe), flush=True)

    print("5/6 обход страниц товаров...", flush=True)
    products = []
    lock = threading.Lock()
    errors = {}
    with ThreadPoolExecutor(max_workers=8) as ex:
        futs = {ex.submit(parse_product_page, p["url"], p): p for p in universe}
        for i, fu in enumerate(as_completed(futs)):
            try:
                res = fu.result()
            except Exception as e:
                res = None
                k = f"{type(e).__name__}: {e}"
                errors[k] = errors.get(k, 0) + 1
            if res:
                with lock:
                    products.append(res)
            if (i + 1) % 200 == 0:
                print("   товаров:", i + 1, "/", len(universe), flush=True)

    for k, v in errors.items():
        print("   ОШИБКА", v, "x", k, flush=True)
    print("   спарсено карточек:", len(products), flush=True)

    print("6/6 изображения...", flush=True)
    download_images(products)

    cats = sanitize(cats)

    data = {
        "categories": cats,
        "products": products,
        "static": static,
    }
    with open(os.path.join(OUT, "catalog.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print("saved:", os.path.join(OUT, "catalog.json"), flush=True)


def sanitize(nodes):
    """Убирает циклы и дубликаты URL в дереве разделов."""
    seen = set()

    def walk(n, path):
        out = []
        for ch in n.get("children") or []:
            u = ch.get("url")
            if u in path or u in seen:
                continue
            seen.add(u)
            out.append(walk(ch, path | {u}))
        n["children"] = out
        return n

    for root in nodes:
        root["children"] = walk(root, {root.get("url")}).get("children", [])
    return nodes


if __name__ == "__main__":
    main()