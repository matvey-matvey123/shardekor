# -*- coding: utf-8 -*-
import json, os, io, sys, collections
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
t = json.load(open(os.path.join(OUT, "tree.json"), encoding="utf8"))
nodes = {n["url"]: n for n in t["nodes"]}
kids = {n["url"]: n["child_urls"] for n in t["nodes"]}
print("узлов:", len(nodes), "корней:", len(t["roots"]),
      "с детьми:", sum(1 for n in t["nodes"] if n["child_urls"]))
print("без товаров:", sum(1 for n in t["nodes"] if n["products"] == 0))
print("товаров:", sum(n["products"] for n in t["nodes"]))
depth = collections.Counter()


def walk(u, d):
    depth[d] += 1
    for c in kids.get(u, []):
        walk(c, d + 1)


for r in t["roots"]:
    walk(r, 0)
print("по глубине:", dict(sorted(depth.items())))


def show(u, d=0, seen=frozenset()):
    if u in seen:
        print("  " * d + "...цикл " + u)
        return
    n = nodes.get(u)
    if not n:
        print("  " * d + "??? " + u)
        return
    print("  " * d + "%s  (id=%s, товаров=%s)" % (n["title"], n["id"], n["products"]))
    for c in kids[u]:
        show(c, d + 1, seen | {u})


for r in t["roots"]:
    show(r)
    print()
