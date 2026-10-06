import Link from "next/link";
import type { ReactNode } from "react";
import { getCatalog, pageUrl } from "@/lib/catalog";
import { SITE } from "@/lib/site";

function Logo() {
  return (
    <Link href="/" className="group flex shrink-0 items-center gap-2.5">
      <span className="relative grid h-10 w-10 place-items-center rounded-full bg-rose-soft/70 ring-1 ring-rose/25 transition group-hover:ring-rose/50">
        <svg viewBox="0 0 32 32" className="h-5 w-5 text-rose" fill="none">
          <circle cx="16" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M16 20v8M13.5 28h5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="leading-none">
        <span className="font-display block text-2xl font-semibold tracking-wide text-ink">
          Шар<span className="text-rose">Декор</span>
        </span>
        <span className="mt-0.5 block text-[10px] font-medium tracking-[0.22em] text-ink-soft uppercase">
          свадебный декор
        </span>
      </span>
    </Link>
  );
}

export default function Header() {
  const { categories } = getCatalog();

  return (
    <>
      <div className="border-b border-sand/60 bg-cream-2/70">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 text-xs text-ink-soft sm:px-6">
          <p>
            {SITE.city}, {SITE.region} · доставка по области
          </p>
          <p className="hidden sm:block">{SITE.hours}</p>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-sand/60 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 sm:px-6">
          <Logo />

          <nav className="ml-auto hidden items-center gap-1 lg:flex">
            <CatalogMenu />
            <NavLink href={pageUrl("/оформление-свадьбы.html") ?? "/catalog/"}>
              Оформление свадьбы
            </NavLink>
            <NavLink href={pageUrl("/доставка-и-оплата.html") ?? "/catalog/"}>
              Доставка
            </NavLink>
            <NavLink href="/contacts/">Контакты</NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-3 lg:ml-4">
            <Link
              href="/search/"
              aria-label="Поиск по каталогу"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink/15 text-ink-soft transition hover:border-rose hover:text-rose"
            >
              <svg viewBox="0 0 20 20" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="9" cy="9" r="6" />
                <path d="m13.5 13.5 4 4" strokeLinecap="round" />
              </svg>
            </Link>
            <Link
              href="/contacts/"
              className="hidden rounded-full border border-ink/15 px-5 py-2.5 text-sm font-medium text-ink transition hover:border-rose hover:text-rose sm:inline-block"
            >
              Заказать
            </Link>
            <Link
              href="/contacts/"
              aria-label="Заказать"
              className="rounded-full bg-rose px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink sm:hidden"
            >
              Заказать
            </Link>
          </div>
        </div>

        <nav className="no-scrollbar flex gap-1 overflow-x-auto border-t border-sand/40 px-4 py-2 text-sm lg:hidden">
          <MenuGroup items={categories} />
        </nav>
      </header>
    </>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full px-3.5 py-2 font-medium text-ink transition hover:bg-cream-2 hover:text-rose"
    >
      {children}
    </Link>
  );
}

function CatalogMenu() {
  const { categories } = getCatalog();
  return (
    <div className="group relative">
      <Link
        href="/catalog/"
        className="flex items-center gap-1 rounded-full px-3.5 py-2 font-semibold text-ink transition hover:bg-cream-2 hover:text-rose"
      >
        Каталог
        <svg viewBox="0 0 12 12" className="h-3 w-3 opacity-50" fill="none">
          <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </Link>

      <div className="invisible absolute left-0 top-full z-50 w-[min(96vw,1040px)] -translate-y-1 pt-2 opacity-0 transition duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        <div className="grid max-h-[70vh] grid-cols-2 gap-x-8 gap-y-4 overflow-y-auto rounded-2xl border border-sand bg-white/95 p-6 shadow-[0_18px_50px_-24px_rgba(42,35,32,0.45)] backdrop-blur md:grid-cols-3">
          {categories.map((cat) => (
            <div key={cat.slug}>
              <Link
                href={`/catalog/${cat.slug}/`}
                className="font-display block text-lg font-medium text-ink transition hover:text-rose"
              >
                {cat.title}
              </Link>
              {cat.children.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {cat.children.slice(0, 8).map((ch) => (
                    <li key={ch.slug}>
                      <Link
                        href={`/catalog/${ch.slug}/`}
                        className="text-[13px] text-ink-soft transition hover:text-rose"
                      >
                        {ch.title}
                      </Link>
                    </li>
                  ))}
                  {cat.children.length > 8 && (
                    <li>
                      <Link
                        href={`/catalog/${cat.slug}/`}
                        className="text-[13px] font-medium text-rose transition hover:underline"
                      >
                        все {cat.children.length} подразделов →
                      </Link>
                    </li>
                  )}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MenuGroup({ items }: { items: ReturnType<typeof getCatalog>["categories"] }) {
  return (
    <>
      <Link
        href="/catalog/"
        className="rounded-full px-3.5 py-2 font-semibold text-ink transition hover:bg-cream-2 hover:text-rose"
      >
        Каталог
      </Link>
      {items.map((cat) => (
        <div key={cat.slug} className="group relative">
          <Link
            href={`/catalog/${cat.slug}/`}
            className="flex items-center gap-1 rounded-full px-3.5 py-2 font-medium text-ink transition hover:bg-cream-2 hover:text-rose"
          >
            {cat.title}
            <svg viewBox="0 0 12 12" className="h-3 w-3 opacity-50" fill="none">
              <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </Link>

          {cat.children.length > 0 && (
            <div className="invisible absolute left-0 top-full z-50 w-[620px] -translate-y-1 pt-2 opacity-0 transition duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-2xl border border-sand bg-white/95 p-5 shadow-[0_18px_50px_-24px_rgba(42,35,32,0.45)] backdrop-blur">
                {cat.children.map((ch) => (
                  <div key={ch.slug}>
                    <Link
                      href={`/catalog/${ch.slug}/`}
                      className="font-display block text-lg text-ink transition hover:text-rose"
                    >
                      {ch.title}
                    </Link>
                    {ch.children.length > 0 && (
                      <ul className="mt-1 mb-2 space-y-0.5">
                        {ch.children.map((g) => (
                          <li key={g.slug}>
                            <Link
                              href={`/catalog/${g.slug}/`}
                              className="text-[13px] text-ink-soft transition hover:text-rose"
                            >
                              {g.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
      <Link
        href={pageUrl("/оформление-свадьбы.html") ?? "/catalog/"}
        className="rounded-full px-3.5 py-2 font-medium text-ink transition hover:bg-cream-2 hover:text-rose"
      >
        Оформление свадьбы
      </Link>
      <Link
        href={pageUrl("/доставка-и-оплата.html") ?? "/catalog/"}
        className="rounded-full px-3.5 py-2 font-medium text-ink transition hover:bg-cream-2 hover:text-rose"
      >
        Доставка
      </Link>
      <Link
        href="/contacts/"
        className="rounded-full px-3.5 py-2 font-medium text-ink transition hover:bg-cream-2 hover:text-rose"
      >
        Контакты
      </Link>
    </>
  );
}