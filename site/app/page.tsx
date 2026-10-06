import Link from "next/link";
import { getCatalog, fmtPrice, pageUrl, type Product } from "@/lib/catalog";
import ProductCard from "@/components/ProductCard";
import OrderBlock from "@/components/OrderBlock";
import { SITE } from "@/lib/site";

const HOME_TEXT =
  "ШарДекор — с нами всегда праздник! Мы помогаем воплотить в реальность все Ваши мечты: подбираем шары, атрибутику и детали для торжества в Волоколамске и Истре. Любая мелочь, которую Вы захотите увидеть на Вашем торжестве, станет задачей №1 — ведь не бывает лишних деталей, бывают оригинальные акценты.";

export default function HomePage() {
  const { categories, byCategory, totals, products } = getCatalog();

  const withImages = categories.filter((c) => c.image && c.productCount > 0);
  const featured = withImages
    .flatMap((c) => byCategory[c.slug] || [])
    .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
    .slice(0, 8);

  const fallback = products.filter((p) => p.image).slice(0, 8);
  const show = featured.length >= 4 ? featured : fallback;

  const topCats = categories
    .map((c) => ({
      ...c,
      products: (byCategory[c.slug] || []).filter((p) => p.image).slice(0, 4),
    }))
    .filter((c) => c.products.length > 0);

  return (
    <>
      {/* ---------------- hero ---------------- */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div className="rise">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose/30 bg-rose-soft/40 px-4 py-1.5 text-[11px] font-semibold tracking-[0.2em] text-rose uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-rose" />
              {SITE.city}
            </p>
            <h1 className="font-display text-[2.6rem] leading-[1.06] text-ink sm:text-6xl">
              Воздушные шары
              <br />
              и свадебная <span className="italic text-rose">атрибутика</span>
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-soft">
              {totals.products.toLocaleString("ru-RU")} товаров для вашего
              праздника: шары, фигуры, приглашения, декор ЗАГС и банкета.
              Оформление под ключ — от {fmtPrice(totals.priceMin)}.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href="#catalog"
                className="rounded-full bg-ink px-7 py-3.5 text-sm font-semibold text-cream transition hover:bg-rose"
              >
                Смотреть каталог
              </a>
              <Link
                href="/contacts/"
                className="rounded-full border border-ink/20 px-7 py-3.5 text-sm font-semibold text-ink transition hover:border-rose hover:text-rose"
              >
                Заказать оформление
              </Link>
            </div>

            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-sand pt-7">
              <div>
                <dt className="text-[11px] tracking-[0.14em] text-ink-soft uppercase">Товаров</dt>
                <dd className="font-display text-3xl text-ink">{totals.products.toLocaleString("ru-RU")}</dd>
              </div>
              <div>
                <dt className="text-[11px] tracking-[0.14em] text-ink-soft uppercase">Разделов</dt>
                <dd className="font-display text-3xl text-ink">{totals.categories}</dd>
              </div>
              <div>
                <dt className="text-[11px] tracking-[0.14em] text-ink-soft uppercase">Лет работы</dt>
                <dd className="font-display text-3xl text-ink">с 2012</dd>
              </div>
            </dl>
          </div>

          <HeroCollage />
        </div>
      </section>

      {/* ---------------- категории ---------------- */}
      <section id="catalog" className="mx-auto max-w-7xl scroll-mt-28 px-4 pt-8 sm:px-6">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="mb-2 text-[11px] font-semibold tracking-[0.22em] text-rose uppercase">Каталог</p>
            <h2 className="font-display text-3xl text-ink sm:text-4xl">Разделы</h2>
          </div>
          <Link href="/catalog/" className="shrink-0 text-sm font-medium text-ink underline decoration-rose/40 underline-offset-4 hover:text-rose">
            Все товары
          </Link>
        </div>
        <div className="mt-4 rule" />

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {topCats.map((c) => (
            <Link
              key={c.slug}
              href={`/catalog/${c.slug}/`}
              className="group relative overflow-hidden rounded-[1.5rem] border border-sand/70 bg-white/60 p-7 transition duration-300 hover:-translate-y-1 hover:border-rose/40 hover:bg-white hover:shadow-[0_24px_55px_-32px_rgba(42,35,32,0.55)]"
            >
              <p className="mb-2 text-[10px] font-semibold tracking-[0.18em] text-ink-soft uppercase">
                {c.productCount} товаров
              </p>
              <h3 className="font-display text-2xl text-ink transition group-hover:text-rose">
                {c.title}
              </h3>
              <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-ink-soft">
                {c.products.map((p) => (
                  <li key={p.slug} className="truncate">
                    {p.name}
                  </li>
                ))}
              </ul>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-rose">
                Перейти
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 transition group-hover:translate-x-1" fill="none">
                  <path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------- популярное ---------------- */}
      {show.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="mb-2 text-[11px] font-semibold tracking-[0.22em] text-rose uppercase">Выбор невесты</p>
              <h2 className="font-display text-3xl text-ink sm:text-4xl">Популярные товары</h2>
            </div>
          </div>
          <div className="mt-4 rule" />

          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {show.map((p, i) => (
              <ProductCard key={p.slug} p={p} priority={i < 4} />
            ))}
          </div>
        </section>
      )}

      {/* ---------------- о компании ---------------- */}
      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <div>
            <p className="mb-2 text-[11px] font-semibold tracking-[0.22em] text-rose uppercase">О нас</p>
            <h2 className="font-display text-3xl text-ink sm:text-4xl">
              Профессиональная организация праздников
            </h2>
            <div className="mt-5 rule" />
            <p className="mt-6 text-[15px] leading-relaxed text-ink-soft">{HOME_TEXT}</p>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
              На нашем сайте собраны все составляющие для красивого оформления
              Вашего торжества. А если не найдёте нужного — изготовим любые
              аксессуары и элементы декора по Вашему желанию.
            </p>
            <Link
              href={pageUrl("/оформление-свадьбы.html") ?? "/catalog/"}
              className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-rose"
            >
              Как мы оформляем свадьбы
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
                <path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </Link>
          </div>

          <OrderBlock title="Расскажем, как будет выглядеть ваш праздник" />
        </div>
      </section>
    </>
  );
}

function HeroCollage() {
  const { products } = getCatalog();
  const pics = products.filter((p) => p.image).slice(0, 5);
  if (pics.length === 0) return null;

  const [a, b, c, d, e] = pics;

  return (
    <div className="relative grid grid-cols-2 gap-4 sm:gap-5">
      <div className="col-span-2 mx-auto w-[78%]">
        <Tile p={a} tall />
      </div>
      <Tile p={b} />
      <Tile p={c} />
      <div className="col-span-2 mt-2 flex items-center justify-center gap-4 rounded-[1.5rem] border border-rose/25 bg-white/70 px-6 py-5 text-center backdrop-blur">
        <p className="font-display text-2xl text-ink sm:text-3xl">
          Оформление под ключ
        </p>
        <p className="text-xs text-ink-soft">ЗАГС · банкет · выездная регистрация</p>
      </div>
      {d && <Tile p={d} />}
      {e && <Tile p={e} />}
    </div>
  );
}

function Tile({ p, tall }: { p?: Product; tall?: boolean }) {
  if (!p || !p.image) return null;
  return (
    <Link
      href={`/product/${p.slug}/`}
      className="group block overflow-hidden rounded-[1.5rem] border border-sand/70 bg-white/60 transition hover:-translate-y-1 hover:border-rose/40 hover:shadow-[0_22px_48px_-32px_rgba(42,35,32,0.5)]"
    >
      <div className={tall ? "aspect-4/3" : "aspect-square"}>
        <img
          src={`/img/${p.image}`}
          alt={p.name}
          loading="eager"
          decoding="async"
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
      </div>
    </Link>
  );
}