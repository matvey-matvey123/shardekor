import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import Search from "@/components/Search";
import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Поиск по каталогу",
  description:
    "Поиск по каталогу ШарДекор: воздушные шары, свадебная атрибутика, приглашения и аксессуары.",
  alternates: { canonical: "/search/" },
  robots: { index: false, follow: true },
};

export default function SearchPage() {
  const { categories } = getCatalog();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs items={[{ title: "Поиск" }]} />
      <h1 className="font-display mt-6 text-4xl text-ink sm:text-5xl">Поиск</h1>
      <div className="mt-6 rule" />

      <div className="mt-8">
        <Search />
      </div>

      <div className="mt-16">
        <h2 className="mb-4 text-[11px] font-semibold tracking-[0.2em] text-ink-soft uppercase">
          Популярные разделы
        </h2>
        <div className="flex flex-wrap gap-3">
          {categories.map((c) => (
            <a
              key={c.slug}
              href={`/catalog/${c.slug}/`}
              className="rounded-full border border-sand/70 bg-white/60 px-5 py-2.5 text-sm text-ink transition hover:border-rose/50 hover:text-rose"
            >
              {c.title}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}