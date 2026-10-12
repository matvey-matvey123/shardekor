"use client";

import { useMemo, useState } from "react";
import venueRaw from "@/data/venue-points.json";
import { withBase } from "@/lib/base";

type VenueData = {
  origin: [number, number];
  size: [number, number];
  points: Record<string, { addr: string; lat: number; lon: number; pct: [number, number] }>;
};

const DATA = venueRaw as unknown as VenueData;

type Venue = {
  name: string;
  addr: string;
  pct: [number, number];
  maps: string;
};

const RAW: Venue[] = Object.entries(DATA.points).map(([name, v]) => ({
  name,
  addr: v.addr,
  pct: v.pct,
  maps: "https://yandex.ru/maps/?text=" + encodeURIComponent(`${name}, ${v.addr}`),
}));

function spread(points: Venue[]): Venue[] {
  const used = new Map<string, Venue>();
  return points.map((p) => {
    let [x, y] = p.pct;
    const key = () => `${Math.round(x * 2)},${Math.round(y * 2)}`;
    let guard = 0;
    while (used.has(key()) && guard < 12) {
      const angle = (guard - 1) * 1.7;
      x = p.pct[0] + Math.cos(angle) * 2.1;
      y = p.pct[1] + Math.sin(angle) * 1.6;
      guard++;
    }
    used.set(key(), p);
    return { ...p, pct: [x, y] };
  });
}

export default function VenueMap() {
  const venues = useMemo(() => spread(RAW), []);
  const [selected, setSelected] = useState<string | null>(null);
  const current = venues.find((v) => v.name === selected) ?? null;

  return (
    <div>
      <section className="mt-10">
        <h2 className="font-display text-2xl leading-snug text-ink sm:text-3xl">
          Свадебные площадки на карте
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
          Нажмите на площадку — её расположение подсветится на карте. Точный адрес
          откроется в Яндекс.Картах.
        </p>
      </section>

      <div className="relative mt-6 overflow-hidden rounded-[1.5rem] border border-sand/80 bg-cream-2">
        <img
          src={withBase("/region-map.png")}
          alt="Карта свадебных площадок"
          loading="lazy"
          decoding="async"
          className="block h-auto w-full"
        />
        {venues.map((v) => {
          const active = current?.name === v.name;
          return (
            <button
              key={v.name}
              type="button"
              onClick={() => setSelected(v.name)}
              aria-label={v.name}
              className={
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none shadow-sm transition sm:text-xs " +
                (active
                  ? "z-20 scale-110 border-rose bg-rose text-white"
                  : "z-10 border-sand bg-white/90 text-ink hover:border-rose hover:text-rose")
              }
              style={{ left: `${v.pct[0]}%`, top: `${v.pct[1]}%` }}
            >
              {v.name}
            </button>
          );
        })}
      </div>

      {current && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-rose/25 bg-rose-soft/40 p-6">
          <div>
            <p className="font-display text-2xl leading-snug text-ink">{current.name}</p>
            <p className="mt-1 text-sm text-ink-soft">{current.addr}</p>
          </div>
          <a
            href={current.maps}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-rose px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink"
          >
            Открыть в Яндекс.Картах
          </a>
        </div>
      )}

      <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {venues.map((v) => (
          <li key={v.name}>
            <button
              type="button"
              onClick={() => setSelected(v.name)}
              className={
                "flex w-full items-start justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition " +
                (current?.name === v.name
                  ? "border-rose bg-rose/10 text-ink"
                  : "border-sand/70 bg-white/70 text-ink hover:border-rose/40")
              }
            >
              <span className="min-w-0">
                <span className="block font-semibold">{v.name}</span>
                <span className="mt-0.5 block text-xs text-ink-soft">{v.addr}</span>
              </span>
              <span className="mt-0.5 shrink-0 text-xs text-rose">На карте</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}