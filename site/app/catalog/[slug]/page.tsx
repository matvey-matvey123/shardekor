import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import OrderBlock from "@/components/OrderBlock";
import { getCatalog } from "@/lib/catalog";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { categoryBySlug, byCategory } = getCatalog();
  const cat = categoryBySlug[decodeURIComponent(slug)];
  if (!cat) return null;

  const crumbs: { title: string; href: string }[] = [];
  {
    const chain: string[] = [];
    let cur: string | undefined = cat.slug;
    while (cur) {
      chain.unshift(cur);
      cur = categoryBySlug[cur]?.parentSlug ?? undefined;
    }
    for (const s of chain) {
      crumbs.push({ title: categoryBySlug[s].title, href: `/catalog/${s}/` });
    }
  }

  const products = byCategory[cat.slug] ?? [];
  const withImages = products.filter((p) => p.image);
  const rest = products.filter((p) => !p.image);

  const LIMIT = 120;
  const shown = withImages.slice(0, LIMIT);
  const hidden = withImages.length - shown.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs items={[{ title: "Каталог", href: "/catalog/" }, ...crumbs]} />

      <header className="mt-6 max-w-3xl">
        <h1 className="font-display text-4xl leading-tight text-ink sm:text-5xl">
          {cat.title}
        </h1>
        <p className="mt-3 text-sm text-ink-soft">
          {cat.productCount > 0
            ? `${cat.productCount} ${plural(cat.productCount)} в разделе`
            : "Раздел каталога"}
        </p>
        {cat.description && cat.description.length > 12 && (
          <div className="mt-5 text-[15px] leading-relaxed whitespace-pre-line text-ink-soft">
            {cat.description.slice(0, 1200)}
          </div>
        )}
      </header>

      {cat.children.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-[11px] font-semibold tracking-[0.2em] text-ink-soft uppercase">
            Подразделы
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cat.children.map((ch) => (
              <Link
                key={ch.slug}
                href={`/catalog/${ch.slug}/`}
                className="group flex items-center justify-between gap-3 rounded-2xl border border-sand/70 bg-white/60 px-5 py-4 transition hover:border-rose/40 hover:bg-white"
              >
                <span>
                  <span className="font-display block text-lg text-ink transition group-hover:text-rose">
                    {ch.title}
                  </span>
                  <span className="text-xs text-ink-soft">{ch.productCount} шт</span>
                </span>
                <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-rose" fill="none">
                  <path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      {withImages.length > 0 && (
        <>
          <div className="mt-14 mb-5 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-[11px] font-semibold tracking-[0.2em] text-ink-soft uppercase">
              Товары
            </h2>
            <p className="text-sm text-ink-soft">
              показано {shown.length} из {withImages.length}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {shown.map((p, i) => (
              <ProductCard key={p.slug} p={p} priority={i < 8} />
            ))}
          </div>

          {hidden > 0 && (
            <div className="mt-6 rounded-2xl border border-sand/70 bg-white/50 px-5 py-4 text-sm text-ink-soft">
              Ещё {hidden} товаров в этом разделе. Выберите подраздел выше или
              воспользуйтесь{" "}
              <Link href="/search/" className="font-medium text-rose hover:underline">
                поиском
              </Link>
              .
            </div>
          )}
        </>
      )}

      {rest.length > 0 && (
        <details className="mt-12 rounded-2xl border border-sand/70 bg-white/50 p-5">
          <summary className="cursor-pointer text-sm font-medium text-ink">
            Показать ещё {rest.length} без фото
          </summary>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {rest.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/product/${p.slug}/`}
                  className="text-sm text-ink-soft transition hover:text-rose"
                >
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="mt-16">
        <OrderBlock title="Не нашли то, что искали?" />
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  const { categoryBySlug } = getCatalog();
  return Object.keys(categoryBySlug).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = getCatalog().categoryBySlug[decodeURIComponent(slug)];
  if (!cat) return {};
  const title = cat.title;
  const desc = cat.description
    ? cat.description.replace(/\s+/g, " ").slice(0, 160)
    : `${title} — ШарДекор, ${cat.productCount} товаров. ${SITE.city}.`;
  return {
    title,
    description: desc,
    alternates: { canonical: `/catalog/${cat.slug}/` },
    openGraph: { title, description: desc, type: "website" as const },
  };
}

function plural(n: number) {
  const m100 = n % 100;
  const m10 = n % 10;
  if (m100 > 4 && m100 < 20) return "товаров";
  if (m10 === 1) return "товар";
  if (m10 > 1 && m10 < 5) return "товара";
  return "товаров";
}