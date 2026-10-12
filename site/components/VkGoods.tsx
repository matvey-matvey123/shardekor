"use client";

import goodsRaw from "@/data/vk-goods.json";

type GoodsData = {
  items: {
    name: string;
    price?: string;
    image?: string;
    link: string;
  }[];
};

const DATA = goodsRaw as GoodsData;

export default function VkGoods() {
  const items = DATA.items;
  return (
    <section className="mt-14">
      <h2 className="font-display text-2xl leading-snug text-ink sm:text-3xl">
        Наши товары во ВКонтакте
      </h2>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
        На основном каталоге есть полная витрина. Во ВКонтакте выкладываем новинки и
        актуальное наличие — заглядывайте.
      </p>

      {items.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {items.map((g, i) => (
            <a
              key={i}
              href={g.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col overflow-hidden rounded-[1.25rem] border border-sand/70 bg-white/70 transition duration-300 hover:-translate-y-1 hover:border-rose/40 hover:bg-white"
            >
              {g.image && (
                <div className="aspect-4/5 overflow-hidden bg-cream-2">
                  <img
                    src={g.image}
                    alt={g.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                  />
                </div>
              )}
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-display line-clamp-2 text-lg leading-snug text-ink transition group-hover:text-rose">
                  {g.name}
                </h3>
                {g.price && (
                  <p className="mt-auto pt-3 font-display text-2xl text-ink">{g.price}</p>
                )}
                <span className="mt-2 text-xs font-semibold text-rose">Открыть в VK →</span>
              </div>
            </a>
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-4 rounded-[1.5rem] border border-sand/80 bg-white/60 p-6">
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl leading-snug text-ink">
            Полная витрина — во ВКонтакте
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Посмотреть все товары, подписки и новые поступления
          </p>
        </div>
        <a
          href="https://vk.com/market-75987459?screen=group"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-rose px-6 py-3 text-sm font-semibold text-white transition hover:bg-ink"
        >
          Смотреть товары в VK
        </a>
      </div>
    </section>
  );
}