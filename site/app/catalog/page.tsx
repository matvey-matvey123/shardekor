import type { Metadata } from "next";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Каталог",
  description:
    "Весь каталог ШарДекор: воздушные шары, фольгированные фигуры, свадебная атрибутика, приглашения, декор ЗАГС и банкета, прокат.",
  alternates: { canonical: "/catalog/" },
};

export default function CatalogPage() {
  const { categories, byCategory, products, totals } = getCatalog();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs items={[{ title: "Каталог" }]} />

      <header className="mt-6 max-w-3xl">
        <h1 className="font-display text-4xl leading-tight text-ink sm:text-5xl">Каталог</h1>
        <p className="mt-3 text-sm text-ink-soft">
          {totals.products.toLocaleString("ru-RU")} товаров в {totals.categories} разделах
        </p>
      </header>

      <div className="mt-10 space-y-14">
        {categories.map((cat) => {
          const items = (byCategory[cat.slug] ?? []).filter((p) => p.image);
          if (items.length === 0) return null;
          return (
            <section key={cat.slug} id={cat.slug} className="scroll-mt-28">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl text-ink sm:text-3xl">{cat.title}</h2>
                  {cat.children.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      {cat.children.map((ch) => (
                        <li key={ch.slug}>
                          <Link href={`/catalog/${ch.slug}/`} className="text-ink-soft hover:text-rose">
                            {ch.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Link
                  href={`/catalog/${cat.slug}/`}
                  className="shrink-0 text-sm font-medium text-ink underline decoration-rose/40 underline-offset-4 hover:text-rose"
                >
                  Все {cat.productCount}
                </Link>
              </div>
              <div className="mt-4 rule" />
              <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
                {items.slice(0, 8).map((p, i) => (
                  <ProductCard key={p.slug} p={p} priority={i < 4} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}