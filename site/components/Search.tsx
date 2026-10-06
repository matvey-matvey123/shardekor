"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { withBase } from "@/lib/base";

type Row = [string, string, string, number, string, string];

const nf = new Intl.NumberFormat("ru-RU");

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/["'«»().,!?]/g, "")
    .trim();
}

export default function Search() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const url = new URLSearchParams(window.location.search);
    const start = url.get("q");
    if (start) setQ(start);
    let alive = true;
    setBusy(true);
    fetch(withBase("/search-index.json"))
      .then((r) => r.json())
      .then((d: Row[]) => alive && setRows(d))
      .catch(() => alive && setRows([]))
      .finally(() => alive && setBusy(false));
    input.current?.focus();
    return () => {
      alive = false;
    };
  }, []);

  const results = useMemo(() => {
    if (!rows) return [];
    const t = norm(q);
    if (t.length < 2) return null;
    const parts = t.split(/\s+/).filter(Boolean);
    const out = rows.filter((r) => {
      const hay = norm(`${r[0]} ${r[2]} ${r[5]}`);
      return parts.every((p) => hay.includes(p));
    });
    return out.slice(0, 200);
  }, [rows, q]);

  return (
    <div>
      <div className="relative">
        <svg
          viewBox="0 0 20 20"
          className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <circle cx="9" cy="9" r="6" />
          <path d="m13.5 13.5 4 4" strokeLinecap="round" />
        </svg>
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          placeholder="Например: букет, цифры, приглашения, держатель"
          aria-label="Поиск по каталогу"
          className="w-full rounded-full border border-sand bg-white/80 py-4 pl-14 pr-6 text-base text-ink placeholder:text-ink-soft/60 focus:border-rose focus:outline-none"
        />
      </div>

      <div className="mt-4 min-h-6 text-sm text-ink-soft" aria-live="polite">
        {busy && "Загружаем каталог…"}
        {!busy && results === null && "Введите минимум 2 символа — найдём по товарам и разделам."}
        {!busy && results !== null && (
          <>
            {results.length}{" "}
            {results.length === 1 ? "товар" : results.length < 5 && results.length > 0 ? "товара" : "товаров"}
          </>
        )}
      </div>

      {results && results.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {results.map(([name, slug, cat, price, img, code]) => (
            <Link
              key={slug}
              href={`/product/${slug}/`}
              className="group flex flex-col overflow-hidden rounded-[1.25rem] border border-sand/70 bg-white/70 transition duration-300 hover:-translate-y-1 hover:border-rose/40 hover:bg-white"
            >
              <div className="aspect-4/5 overflow-hidden bg-cream-2">
                {img ? (
                  <img
                    src={withBase(`/img/${img}`)}
                    alt={name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-ink-soft/40">
                    <svg viewBox="0 0 48 48" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.4">
                      <circle cx="24" cy="18" r="10" />
                      <path d="M24 28v14M20 42h8" strokeLinecap="round" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <p className="mb-1.5 truncate text-[10px] font-semibold tracking-[0.16em] text-rose/80 uppercase">
                  {cat}
                </p>
                <h3 className="font-display line-clamp-2 text-lg leading-snug text-ink transition group-hover:text-rose">
                  {name}
                </h3>
                <p className="mt-auto pt-3 font-display text-2xl text-ink">
                  {nf.format(price)} ₽
                </p>
                {code && <p className="text-[11px] text-ink-soft/70">код {code}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {results && results.length === 0 && (
        <p className="mt-8 text-center text-ink-soft">
          Ничего не нашли. Попробуйте другое слово или{" "}
          <Link href="/contacts/" className="text-rose hover:underline">
            спросите у нас
          </Link>
          .
        </p>
      )}
    </div>
  );
}