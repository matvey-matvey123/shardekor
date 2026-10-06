import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProductCard from "@/components/ProductCard";
import OrderBlock from "@/components/OrderBlock";
import Prose from "@/components/Prose";
import { getCatalog, fmtPrice, plainText } from "@/lib/catalog";
import { withBase } from "@/lib/base";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { productBySlug, byCategory } = getCatalog();
  const p = productBySlug[decodeURIComponent(slug)];
  if (!p) notFound();

  const related = (byCategory[p.category_slug] ?? [])
    .filter((x) => x.slug !== p.slug && x.image)
    .slice(0, 4);

  const gallery = [p.big_image, ...p.images].filter(
    (v, i, a): v is string => Boolean(v) && a.indexOf(v) === i
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs
        items={[
          ...p.breadcrumbs.map((b) => ({
            title: b.title,
            href: `/catalog/${b.slug}/`,
          })),
          { title: p.name },
        ]}
      />

      <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
        {/* галерея */}
        <div>
          <div className="overflow-hidden rounded-[1.5rem] border border-sand/70 bg-white/60">
            <div className="aspect-square">
              {p.image ? (
                <img
                  src={withBase(`/img/${p.image}`)}
                  alt={p.name}
                  loading="eager"
                  decoding="async"
                  className="h-full w-full object-contain p-4"
                />
              ) : (
                <div className="grid h-full place-items-center text-ink-soft/40">
                  <svg viewBox="0 0 48 48" className="h-14 w-14" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <circle cx="24" cy="18" r="10" />
                    <path d="M24 28v14M20 42h8" strokeLinecap="round" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {gallery.length > 1 && (
            <div className="mt-4 grid grid-cols-4 gap-3">
              {gallery.slice(1, 5).map((g) => (
                <div
                  key={g}
                  className="aspect-square overflow-hidden rounded-xl border border-sand/60 bg-white/50"
                >
                  <img src={withBase(`/img/${g}`)} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* информация */}
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-rose uppercase">
            {p.category_title}
          </p>
          <h1 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-[2.6rem]">
            {p.name}
          </h1>

          {p.code && <p className="mt-2 text-xs text-ink-soft">Артикул: {p.code}</p>}

          <div className="mt-7 rounded-[1.5rem] border border-sand/70 bg-white/60 p-6">
            <p className="text-[11px] tracking-[0.16em] text-ink-soft uppercase">Цена</p>
            <p className="font-display mt-1 text-4xl text-ink">{fmtPrice(p.price)}</p>
            <p className="mt-2 text-sm text-ink-soft">
              {p.in_stock
                ? p.qty_text && p.qty_text !== "Неограничено"
                  ? `В наличии: ${p.qty_text}`
                  : "В наличии"
                : "Под заказ — уточните сроки"}
            </p>
            <Link href="/contacts/" className="btn-rose mt-5 inline-block">
              Заказать
            </Link>
          </div>

          {p.extra_fields.length > 0 && (
            <dl className="mt-8 space-y-3">
              {p.extra_fields.map(([k, v], i) => (
                <div key={i} className="flex gap-4 border-b border-sand/60 pb-3 text-sm">
                  <dt className="w-40 shrink-0 text-ink-soft">{k}</dt>
                  <dd className="text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          {p.description_html && (
            <div className="mt-8">
              <h2 className="font-display mb-3 text-2xl text-ink">Описание</h2>
              <Prose text={p.description_html} />
            </div>
          )}
        </div>
      </div>

      <div className="mt-16">
        <OrderBlock compact title="Уточнить наличие или заказать доставку?" />
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display mb-5 text-2xl text-ink">
            Смотрите также
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {related.map((r) => (
              <ProductCard key={r.slug} p={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export async function generateStaticParams() {
  const { productBySlug } = getCatalog();
  return Object.keys(productBySlug).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getCatalog().productBySlug[decodeURIComponent(slug)];
  if (!p) return {};
  const desc =
    plainText(p.description_html).slice(0, 160) ||
    `${p.name} — ${fmtPrice(p.price)}. ШарДекор, ${SITE.city}.`;
  return {
    title: p.name,
    description: desc,
    alternates: { canonical: `/product/${p.slug}/` },
    openGraph: {
      title: p.name,
      description: desc,
      type: "website" as const,
      images: p.image ? [`/img/${p.image}`] : undefined,
    },
  };
}