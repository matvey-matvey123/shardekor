# -*- coding: utf-8 -*-
"""
Оптимизация фотографий каталога:
  - скачивает картинки разделов (img_categories)
  - склеивает дубликаты (исходная _A.jpg и полная full_A.jpg — одно фото)
  - делает две WebP-версии: карточка 700px и большая 1300px
  - переписывает catalog.json под новые имена файлов

Запуск: python optimize.py
"""
import os
import re
import json
import shutil
import urllib.parse
from collections import defaultdict

import requests
from PIL import Image, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
IMG = os.path.join(OUT, "img")
IMG_OPT = os.path.join(OUT, "img_opt")
CAT_SRC = "http://xn--80aiduuie1d.xn--p1ai/components/com_jshopping/files/img_categories/"

UA = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120 Safari/537.36"
}

SIZE_CARD = 700
SIZE_BIG = 1300
QUAL_CARD = 76
QUAL_BIG = 80

SKIP = {"noimage.gif", "noimage.png"}


def key_of(name):
    """Убираем префиксы thumb_/full_/cat_ и ведущее _ — получаем имя исходного фото.

    Важно: та же функция применяется и к файлу на диске, и к имени из URL,
    поэтому разбиение должно быть детерминированным и одинаковым для
    `cat_<имя>` и `<имя>`.
    """
    base = name
    while True:
        for pre in ("cat_", "full_", "thumb_"):
            if base.startswith(pre) and len(base) > len(pre):
                base = base[len(pre):]
                break
        else:
            break
    if base.startswith("_"):
        base = base[1:]
    return base


def stage1_download_category_images(catalog):
    urls = set()

    def walk(nodes):
        for n in nodes or []:
            if n.get("image"):
                urls.add(n["image"])
            walk(n.get("children"))

    walk(catalog.get("categories"))
    urls = [u for u in urls
            if isinstance(u, str) and u.startswith("http") and not re.search(r"/noimage\.\w+$", u)]
    print("картинок разделов:", len(urls), flush=True)

    failed = []

    def dl(u):
        name = urllib.parse.unquote(u.rsplit("/", 1)[-1])
        dest = os.path.join(IMG, "cat_" + name)
        if os.path.exists(dest) and os.path.getsize(dest) > 800:
            return
        src = (CAT_SRC + urllib.parse.quote(name)) if "img_categories/" in u else u
        try:
            r = requests.get(src, headers=UA, timeout=60)
            if r.status_code == 200 and len(r.content) > 800:
                with open(dest, "wb") as f:
                    f.write(r.content)
            else:
                failed.append((u, r.status_code, len(r.content)))
        except Exception as e:
            failed.append((u, "err", str(e)))

    from concurrent.futures import ThreadPoolExecutor
    failed = []
    with ThreadPoolExecutor(max_workers=8) as ex:
        list(ex.map(dl, urls))
    print("картинок разделов скачано | не скачалось:", len(failed), flush=True)
    for u, st, sz in failed:
        print("   !", st, sz, u, flush=True)


def stage2_group(catalog):
    """Группируем файлы по исходному фото, выбирая самый крупный как источник."""
    groups = defaultdict(list)
    for fn in os.listdir(IMG):
        p = os.path.join(IMG, fn)
        if not os.path.isfile(p):
            continue
        k = key_of(fn)
        if k in SKIP:
            continue
        groups[k].append((os.path.getsize(p), p, fn))

    out = {}
    for k, lst in groups.items():
        lst.sort(reverse=True)
        out[k] = lst[0][1]
    print("уникальных фото:", len(out), flush=True)
    return out


def make_rendition(src, dest, max_side, quality):
    if os.path.exists(dest) and os.path.getsize(dest) > 500:
        return True
    try:
        im = Image.open(src)
        im = ImageOps.exif_transpose(im)
        if im.mode in ("RGBA", "P", "LA"):
            bg = Image.new("RGB", im.size, (255, 255, 255))
            im = im.convert("RGBA")
            bg.paste(im, mask=im.split()[-1])
            im = bg
        elif im.mode != "RGB":
            im = im.convert("RGB")
        im.thumbnail((max_side, max_side), Image.LANCZOS)
        if im.width < 2 or im.height < 2:
            return False
        im.save(dest, "WEBP", quality=quality, method=4)
        return True
    except Exception as e:
        print("  ! не удалось:", os.path.basename(src), e, flush=True)
        return False


def stage3_renditions(groups):
    os.makedirs(IMG_OPT, exist_ok=True)
    smap = {}
    for i, (k, src) in enumerate(sorted(groups.items())):
        s_dest = os.path.join(IMG_OPT, k + "-s.webp")
        m_dest = os.path.join(IMG_OPT, k + "-m.webp")
        ok_s = make_rendition(src, s_dest, SIZE_CARD, QUAL_CARD)
        ok_m = make_rendition(src, m_dest, SIZE_BIG, QUAL_BIG)
        smap[k] = {
            "s": k + "-s.webp" if ok_s else None,
            "m": k + "-m.webp" if ok_m else None,
        }
        if (i + 1) % 300 == 0:
            print("  ...", i + 1, "/", len(groups), flush=True)
    print("готово рендитчов:", len(smap), flush=True)
    return smap


def stage4_rewire(catalog, smap):
    missing = [0]

    def already(fn):
        """catalog.json уже переписан под WebP — не ломаем повторным запуском."""
        if fn.endswith("-s.webp") or fn.endswith("-m.webp"):
            return fn if os.path.exists(os.path.join(IMG_OPT, fn)) else None
        return False

    def remap(fn):
        if not fn:
            return None
        a = already(fn)
        if a is not False:
            return a
        k = key_of(os.path.basename(fn))
        e = smap.get(k)
        if not e:
            missing[0] += 1
            return None
        return e["m"] or e["s"]

    def card(fn):
        if not fn:
            return None
        a = already(fn)
        if a is not False:
            return a
        k = key_of(os.path.basename(fn))
        e = smap.get(k)
        if not e:
            return None
        return e["s"] or e["m"]

    def walk(nodes):
        for n in nodes or []:
            if n.get("image"):
                raw = n["image"]
                n["image"] = card(raw) or remap(raw)
                if not n["image"]:
                    print("  ! нет рендитча раздела:", n.get("title"), raw, flush=True)
            walk(n.get("children"))

    walk(catalog.get("categories"))

    for p in catalog.get("products", []):
        imgs = [remap(x) for x in (p.get("images") or [])]
        imgs = [x for x in imgs if x]
        big = remap(p.get("big_image"))
        thumb = card(p.get("thumb"))

        first_m = big or (imgs[0] if imgs else None)
        first_s = thumb or (imgs[0] if imgs else big)

        p["image"] = first_s
        p["big_image"] = first_m
        p["images"] = list(dict.fromkeys([first_m] + imgs)) if first_m else imgs

    print("пропущено ссылок:", missing[0], flush=True)
    return catalog


def main():
    with open(os.path.join(OUT, "catalog.json"), encoding="utf-8") as f:
        catalog = json.load(f)

    stage1_download_category_images(catalog)
    groups = stage2_group(catalog)
    smap = stage3_renditions(groups)
    catalog = stage4_rewire(catalog, smap)

    with open(os.path.join(OUT, "catalog.json"), "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=1)
    print("catalog.json обновлён", flush=True)

    total = sum(os.path.getsize(os.path.join(IMG_OPT, x)) for x in os.listdir(IMG_OPT))
    print("итог WebP: %d файлов, %.1f МБ" % (len(os.listdir(IMG_OPT)), total / 1024 / 1024), flush=True)


if __name__ == "__main__":
    main()