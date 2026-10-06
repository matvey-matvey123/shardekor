# -*- coding: utf-8 -*-
"""
Восстановление полного дерева категорий JoomShopping.

Меню старого сайта даёт только курируемую часть разделов, а 173 категория
реально существуют (по ним привязаны товары). Настоящее родство раскрывают
страницы категорий: блок jshop_categ перечисляет дочерние разделы.

Ключ узла — адрес страницы, а не id: у пустых разделов («ЗАГС», «Для
банкета» и т.п.) в теле страницы нет ни товара, ни category_id, но они
образуют структуру и должны сохраниться.

Выход: out/tree.json
"""
import os
import re
import io
import sys
import json
import time
import hashlib
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from lxml import html as LH

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
CACHE = os.path.join(OUT, "cache")
BASE = "http://xn--80aiduuie1d.xn--p1ai"
H = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120"}
QLIMIT = "?limit=99999"

os.makedirs(CACHE, exist_ok=True)


def fetch(path, tries=3):
    url = BASE + urllib.parse.quote(path, safe="/?&=,.")
    cf = os.path.join(CACHE, hashlib.md5(url.encode("utf-8")).hexdigest() + ".html")
    if os.path.exists(cf):
        try:
            with open(cf, encoding="utf-8") as f:
                return f.read()
        except Exception:
            pass
    for i in range(tries):
        try:
            r = requests.get(url, headers=H, timeout=45)
            if r.status_code == 200:
                r.encoding = "utf-8"
                with open(cf, "w", encoding="utf-8") as f:
                    f.write(r.text)
                return r.text
        except Exception:
            time.sleep(1.0 * (i + 1))
    return None


def norm(u):
    if not u:
        return None
    p = urllib.parse.unquote(u)
    p = re.sub(r"/+", "/", p).split("#")[0].split("?")[0]
    return p.rstrip("/") or "/"


def clean(s):
    if not s:
        return None
    s = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", s, flags=re.S | re.I)
    s = re.sub(r"<br\s*/?>", "\n", s, flags=re.I)
    s = re.sub(r"</(p|div|li|tr|h\d)>", "\n", s, flags=re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    for a, b in (("&nbsp;", " "), ("&quot;", '"'), ("&laquo;", "\u00ab"),
                 ("&raquo;", "\u00bb"), ("&ndash;", "\u2013"), ("&mdash;", "\u2014"),
                 ("&amp;", "&"), ("&#39;", "'"), ("&lt;", "<"), ("&gt;", ">")):
        s = s.replace(a, b)
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n\s*\n\s*\n+", "\n\n", s)
    return s.strip() or None


def parse_page(path, page):
    root = LH.fromstring("<div>%s</div>" % page)
    m = re.search(r"category_id=(\d+)", page)
    cid = int(m.group(1)) if m else None
    if cid is None:
        m = re.search(r"/category/view/(\d+)", path)
        cid = int(m.group(1)) if m else None
    h1 = root.xpath("//h1")
    title = re.sub(r"\s+", " ", h1[0].text_content()).strip() if h1 else ""
    title = re.sub(r"\s*\(Код:.*?\)\s*$", "", title).strip()
    desc = root.xpath("//div[contains(@class,'category_description')]")
    desc_html = clean(LH.tostring(desc[0], encoding="unicode")) if desc else None

    child_urls = []
    child_images = {}
    for blk in root.xpath("//div[contains(@class,'jshop_categ')]"):
        a = blk.xpath(".//a[contains(@class,'product_link')] | .//a[contains(@href,'.html')]")
        if not a:
            continue
        u = norm(a[0].get("href"))
        if not u or not u.endswith(".html") or u == norm(path):
            continue
        if u not in child_urls:
            child_urls.append(u)
        im = blk.xpath(".//img[contains(@class,'jshop_img')]/@src")
        if im and "noimage" not in im[0]:
            child_images[u] = absolutize(im[0])

    return {
        "id": cid,
        "title": title,
        "url": norm(path),
        "description": desc_html,
        "child_urls": child_urls,
        "child_images": child_images,
    }


def absolutize(u):
    if not u:
        return None
    if u.startswith("http"):
        return u
    return BASE + (u if u.startswith("/") else "/" + u)


def main():
    data = json.load(open(os.path.join(OUT, "catalog.json"), encoding="utf8"))

    # адрес категории -> id: берём из путей товаров
    url_to_id = {}
    for p in data["products"]:
        pid = p.get("category_id")
        u = norm(p["url"])
        if not u or not pid:
            continue
        d = "/".join(u.strip("/").split("/")[:-1])
        if d and "product/view" not in d:
            url_to_id.setdefault("/" + d, pid)

    # зерно: страницы категорий из товаров + адреса из старого меню
    all_cids = sorted({p.get("category_id") for p in data["products"] if p.get("category_id")})
    seeds = ["/home/category/view/%d.html" % c for c in all_cids]
    menu_urls = []
    menu_file = os.path.join(OUT, "menu.json")
    if os.path.exists(menu_file):
        menu_src = json.load(open(menu_file, encoding="utf8"))
    else:
        menu_src = data.get("menu") or data.get("categories") or []

    def walk(n):
        menu_urls.append(n["url"])
        for c in n.get("children", []):
            walk(c)
    for c in menu_src:
        walk(c)

    nodes = {}
    image_of = {}
    pending = []
    seen = set()
    for p in seeds + menu_urls:
        if p and p not in seen and p != "/home.html":
            seen.add(p)
            pending.append(p)

    round_no = 0
    while pending:
        round_no += 1
        print("раунд %d: %d страниц" % (round_no, len(pending)), flush=True)
        fresh = []
        with ThreadPoolExecutor(max_workers=8) as ex:
            futs = {}
            for p in pending:
                q = p
                if re.fullmatch(r"/home/category/view/\d+\.html", p):
                    q = p + QLIMIT
                futs[ex.submit(fetch, q)] = p
            for fu in as_completed(futs):
                path = futs[fu]
                page = fu.result()
                if not page:
                    print("  ! не открылось", path, flush=True)
                    continue
                info = parse_page(path, page)
                u = info["url"]
                prev = nodes.get(u)
                if prev is None or len(info["child_urls"]) > len(prev["child_urls"]):
                    nodes[u] = info
                if info["id"] is not None:
                    url_to_id.setdefault(u, info["id"])
                for cu, im in info.get("child_images", {}).items():
                    if im:
                        image_of.setdefault(cu, im)
                for cu in info["child_urls"]:
                    if cu not in seen:
                        seen.add(cu)
                        fresh.append(cu)
        pending = fresh

    # картинки разделов из старого меню (на случай если родитель не дал)
    def walk_menu(ns):
        for n in ns or []:
            im = n.get("image")
            if im and "noimage" not in im:
                image_of.setdefault(norm(n["url"]), absolutize(im))
            walk_menu(n.get("children"))
    walk_menu(menu_src)

    # связываем: child_url -> id
    for u, n in nodes.items():
        if n["id"] is None:
            n["id"] = url_to_id.get(u)
    for u, n in nodes.items():
        n["child_urls"] = [c for c in n["child_urls"] if c != u]

    # узлы без заголовка (страницу ещё не открывали) — докачиваем
    empty = [u for u, n in nodes.items() if not n["title"]]
    if empty:
        print("докачиваем %d страниц без заголовка" % len(empty), flush=True)
        with ThreadPoolExecutor(max_workers=8) as ex:
            for fu in as_completed([ex.submit(fetch, u) for u in empty]):
                fu.result()
        for u in empty:
            page = fetch(u)
            if page:
                info = parse_page(u, page)
                if info["title"]:
                    nodes[u] = info

    # id -> адрес (для привязки товаров); канонический адрес — не /category/view/
    # канонический адрес: обязательно *.html, и не /category/view/
    id_to_url = {}
    for u, n in sorted(nodes.items(), key=lambda kv: (not kv[0].endswith(".html"),
                                                      kv[0].startswith("/home/category/view/"),
                                                      -len(kv[1]["child_urls"]))):
        if n["id"] is not None:
            id_to_url.setdefault(n["id"], u)
    # у какой-то id канонический адрес оказался не *.html (например главная «/») —
    # подменяем на адрес вида /home/category/view/<id>.html
    for i, u in list(id_to_url.items()):
        if u.endswith(".html"):
            continue
        vu = "/home/category/view/%d.html" % i
        if vu not in nodes:
            nodes[vu] = dict(nodes[u])
            nodes[vu]["url"] = vu
        id_to_url[i] = vu
        print("не-.html канон для id=%d (%s) → %s" % (i, u, vu), flush=True)

    # склеиваем дубли: одна и та же категория открывается и по старому SEF-адресу,
    # и по /home/category/view/<id>.html — оставляем канонический
    dup = {u: id_to_url[n["id"]] for u, n in nodes.items()
           if n["id"] is not None and u != id_to_url[n["id"]]}
    if dup:
        for u, d in dup.items():
            if d in nodes:
                nodes[d]["child_urls"] = list(dict.fromkeys(nodes[d]["child_urls"] + nodes[u]["child_urls"]))
        for u in dup:
            nodes.pop(u, None)
        for n in nodes.values():
            n["child_urls"] = [dup.get(c, c) for c in n["child_urls"]]
        for u, n in nodes.items():
            n["child_urls"] = [c for c in n["child_urls"] if c in nodes and c != u]
        print("склеено дублей:", len(dup), flush=True)

    # товары по категориям
    # товары без раздела (в старой базе у них пустой category_id) → «РАЗНОЕ»
    raznoe = next((u for u, n in nodes.items() if n["title"].strip().upper() == "РАЗНОЕ"), None)
    if raznoe and nodes[raznoe].get("id") is not None:
        rid = nodes[raznoe]["id"]
        moved = 0
        for p in data["products"]:
            if not p.get("category_id"):
                p["category_id"] = rid
                moved += 1
        if moved:
            print("без раздела → «РАЗНОЕ»:", moved, flush=True)

    prods_by_url = {}
    for p in data["products"]:
        pid = p.get("category_id")
        u = id_to_url.get(pid)
        if u is None:
            if pid is None:
                continue
            u = "/home/category/view/%d.html" % pid
            if u not in nodes:
                nodes[u] = {"id": pid, "title": "", "url": u, "description": None, "child_urls": []}
            id_to_url.setdefault(pid, u)
        prods_by_url.setdefault(u, []).append(p["url"])

    # выкидываем узлы, которых нет в nodes, из child_urls
    for n in nodes.values():
        n["child_urls"] = [c for c in n["child_urls"] if c in nodes]

    # корни
    is_child = set()
    for n in nodes.values():
        is_child.update(n["child_urls"])
    roots = sorted(u for u in nodes if u not in is_child)

    # убираем пустые листья (нет товаров и нет детей), пока не стабилизируется
    while True:
        drop = [u for u, n in nodes.items() if not n["child_urls"] and u not in prods_by_url]
        if not drop:
            break
        for u in drop:
            del nodes[u]
        for n in nodes.values():
            n["child_urls"] = [c for c in n["child_urls"] if c in nodes]
    is_child = set()
    for n in nodes.values():
        is_child.update(n["child_urls"])
    roots = sorted(u for u in nodes if u not in is_child)

    # --- товары в поддереве (для сортировки)
    subtree = {}

    def count_sub(u, stack):
        if u in subtree:
            return subtree[u]
        if u in stack or u not in nodes:
            return 0
        t = len(prods_by_url.get(u, []))
        for c in nodes[u]["child_urls"]:
            t += count_sub(c, stack | {u})
        subtree[u] = t
        return t

    for u in list(nodes):
        count_sub(u, frozenset())

    # --- группировка корней в разделы (sections.json, правится руками)
    sec_path = os.path.join(HERE, "sections.json")
    sections = []
    if os.path.exists(sec_path):
        sections = json.load(open(sec_path, encoding="utf8")).get("sections", [])

    by_title = {}
    for u in roots:
        by_title.setdefault(nodes[u]["title"].strip(), []).append(u)
    by_id = {nodes[u]["id"]: u for u in roots if nodes[u].get("id") is not None}

    root_set = set(roots)
    used = set()
    ordered = []          # ("one", url) или ("group", title, [url...])
    override = {}         # url -> заголовок раздела
    for s in sections:
        stitle = s.get("title") or ""
        members = []
        for t in s.get("roots", []):
            for u in by_title.get(t.strip(), []):
                if u in root_set and u not in used:
                    used.add(u)
                    members.append(u)
        for i in s.get("ids", []):
            u = by_id.get(int(i))
            if u and u in root_set and u not in used:
                used.add(u)
                members.append(u)
        if not members:
            continue
        members.sort(key=lambda u: -subtree.get(u, 0))
        if len(members) == 1:
            override[members[0]] = stitle
            ordered.append(("one", members[0]))
        else:
            ordered.append(("group", stitle, members))
    rest = [u for u in roots if u not in used]
    rest.sort(key=lambda u: -subtree.get(u, 0))
    ordered += [("one", u) for u in rest]

    # --- картинки: свои → по id → из детей → из товара
    image_by_id = {}

    def url_id(u):
        n = nodes.get(u)
        if n and n.get("id") is not None:
            return n["id"]
        return url_to_id.get(u)

    for u, im in image_of.items():
        if im:
            i = url_id(u)
            if i is not None:
                image_by_id.setdefault(i, im)
    for u, n in nodes.items():
        im = image_of.get(u)
        if im and n.get("id") is not None:
            image_by_id.setdefault(n["id"], im)

    prod_img = {}
    for p in data["products"]:
        i = p.get("category_id")
        im = p.get("image")
        if i is not None and im:
            prod_img.setdefault(i, im)

    def pick_image(u, n, children):
        for c in (image_of.get(u), image_by_id.get(n.get("id"))):
            if c:
                return c
        for ch in children:
            if ch.get("image"):
                return ch["image"]
        return prod_img.get(n.get("id"))

    def to_raw(u, stack):
        n = nodes[u]
        kids = [c for c in n["child_urls"] if c in nodes and c not in stack]
        children = [to_raw(c, stack | {u}) for c in kids]
        return {
            "id": n["id"],
            "title": override.get(u, n["title"]),
            "url": u,
            "slug": re.sub(r"\.html$", "", u.strip("/").split("/")[-1]),
            "image": pick_image(u, n, children),
            "description_html": n["description"],
            "children": children,
        }

    raw_cats = []
    for item in ordered:
        if item[0] == "one":
            raw_cats.append(to_raw(item[1], frozenset()))
        else:
            children = [to_raw(u, frozenset()) for u in item[2]]
            raw_cats.append({
                "id": None,
                "title": item[1],
                "url": "",
                "slug": "",
                "image": next((c["image"] for c in children if c.get("image")), None),
                "description_html": None,
                "synthetic": True,
                "children": children,
            })

    # --- сохраняем дерево в catalog.json (картинки продукта не трогаем)
    data["categories"] = raw_cats
    data["menu"] = menu_src
    data["sections"] = [it[1] if it[0] == "group" else override.get(it[1], nodes[it[1]]["title"])
                        for it in ordered]
    with open(os.path.join(OUT, "catalog.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print("catalog.json: дерево разделов записано", flush=True)

    flat = []
    for u, n in sorted(nodes.items()):
        flat.append({
            "id": n["id"],
            "title": n["title"],
            "url": u,
            "description": n["description"],
            "child_urls": n["child_urls"],
            "products": len(prods_by_url.get(u, [])),
        })
    with open(os.path.join(OUT, "tree.json"), "w", encoding="utf-8") as f:
        json.dump({"roots": roots, "sections": data["sections"], "nodes": flat},
                  f, ensure_ascii=False, indent=1)

    print("\nкатегорий:", len(flat))
    print("корней (до группировки):", len(roots), " верхнего уровня:", len(raw_cats))
    print("с детьми:", sum(1 for n in flat if n["child_urls"]))
    print("без товаров:", sum(1 for n in flat if n["products"] == 0))
    print("товаров разложено:", sum(len(v) for v in prods_by_url.values()), "из", len(data["products"]))


if __name__ == "__main__":
    main()
