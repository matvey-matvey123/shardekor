"use client";

import { useMemo, useState } from "react";
import deliveryRaw from "@/data/delivery-points.json";
import { withBase } from "@/lib/base";

type DeliveryData = {
  origin: [number, number];
  size: [number, number];
  points: Record<string, { price: number; lat: number; lon: number; pct: [number, number] }>;
};

const DATA = deliveryRaw as unknown as DeliveryData;

const POINTS = Object.entries(DATA.points)
  .map(([name, v]) => ({ name, price: v.price, pct: v.pct }))
  .sort((a, b) => a.name.localeCompare(b.name, "ru"));

const nf = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

function priceLabel(p: number) {
  return p === 0 ? "Бесплатно" : `${nf.format(p)} ₽`;
}

function norm(s: string) {
  return s.toLowerCase().replace(/ё/g, "е").trim();
}

export default function DeliveryMap() {
  const [selected, setSelected] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const t = norm(q);
    if (!t) return POINTS;
    return POINTS.filter((p) => norm(p.name).includes(t));
  }, [q]);

  const current = POINTS.find((p) => p.name === selected) ?? null;

  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl leading-snug text-ink sm:text-3xl">
        Карта доставки
      </h2>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
        Нажмите на точку на карте или найдите населённый пункт — увидите
        ориентировочную стоимость доставки.
      </p>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        type="search"
        placeholder="Найти населённый пункт…"
        aria-label="Поиск по городам доставки"
        className="mt-5 w-full max-w-md rounded-full border border-sand bg-white/80 px-5 py-3 text-base text-ink placeholder:text-ink-soft/60 focus:border-rose focus:outline-none"
      />

      <div className="relative mt-6 overflow-hidden rounded-[1.5rem] border border-sand/80 bg-cream-2">
        <img
          src={withBase("/region-map.png")}
          alt="Карта района доставки"
          loading="lazy"
          decoding="async"
          className="block h-auto w-full"
        />
        {POINTS.map((p) => {
          const active = current?.name === p.name;
          const filtered = list.length > 0 && list !== POINTS && !list.includes(p);
          return (
            <button
              key={p.name}
              type="button"
              onClick={() => setSelected(p.name)}
              aria-label={`Доставка в ${p.name}`}
              className={
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none shadow-sm transition sm:text-xs " +
                (active
                  ? "z-20 scale-110 border-rose bg-rose text-white"
                  : filtered
                    ? "z-10 border-sand/60 bg-white/50 text-ink-soft/50"
                    : "z-10 border-sand bg-white/90 text-ink hover:border-rose hover:text-rose")
              }
              style={{ left: `${p.pct[0]}%`, top: `${p.pct[1]}%` }}
            >
              {p.name}
            </button>
          );
        })}
      </div>

      {current && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-rose/25 bg-rose-soft/40 p-6">
          <div>
            <p className="text-sm text-ink-soft">Доставка в {current.name}</p>
            <p className="font-display mt-1 text-3xl text-ink">
              {priceLabel(current.price)}
            </p>
          </div>
          <a
            href={"https://yandex.ru/maps/?text=" + encodeURIComponent(current.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-rose px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink"
          >
            Открыть на карте
          </a>
        </div>
      )}

      <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => (
          <li key={p.name}>
            <button
              type="button"
              onClick={() => setSelected(p.name)}
              className={
                "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition " +
                (current?.name === p.name
                  ? "border-rose bg-rose/10 text-ink"
                  : "border-sand/70 bg-white/70 text-ink hover:border-rose/40")
              }
            >
              <span>{p.name}</span>
              <span className="font-semibold text-rose">{priceLabel(p.price)}</span>
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-4 max-w-2xl text-xs leading-relaxed text-ink-soft/80">
        Ориентировочная стоимость из прайса «Доставка и оплата». Точная цена
        рассчитывается по расстоянию от пункта самовывоза — уточняйте при заказе.
      </p>
    </section>
  );
}