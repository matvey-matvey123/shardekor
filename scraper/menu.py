# -*- coding: utf-8 -*-
"""Пересобирает out/menu.json — оригинальное боковое меню разделов со старого сайта.

Запуск: python menu.py  (картинки страницы уже в кэше, интернет не нужен)
"""
import io
import json
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")

import scrape  # noqa: E402

page = scrape.fetch("/")
if not page:
    raise SystemExit("главная страница недоступна")
cats = scrape.parse_menu(scrape.tree(page))
cats = scrape.uniq(cats)
cats = scrape.sanitize(cats)

dest = os.path.join(OUT, "menu.json")
with open(dest, "w", encoding="utf-8") as f:
    json.dump(cats, f, ensure_ascii=False, indent=1)


def count(ns):
    return sum(1 + count(n.get("children", [])) for n in ns)


print("меню сохранено:", dest, "| узлов:", count(cats))
