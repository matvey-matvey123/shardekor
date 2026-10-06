import Link from "next/link";
import Script from "next/script";
import { getCatalog, pageUrl } from "@/lib/catalog";
import { SITE } from "@/lib/site";

export default function Footer() {
  const { categories } = getCatalog();

  return (
    <footer className="mt-24 border-t border-sand bg-cream-2/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <p className="font-display text-3xl text-ink">
            Шар<span className="text-rose">Декор</span>
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-soft">
            Свадебная атрибутика, воздушные шары и оформление праздника под
            ключ. {SITE.city}.
          </p>
          <p className="mt-5 text-sm text-ink-soft">{SITE.hours}</p>
        </div>

        <nav aria-label="Каталог">
          <p className="mb-3 text-[11px] font-semibold tracking-[0.2em] text-ink-soft uppercase">
            Каталог
          </p>
          <ul className="space-y-2 text-sm">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/catalog/${c.slug}/`} className="text-ink transition hover:text-rose">
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Информация">
          <p className="mb-3 text-[11px] font-semibold tracking-[0.2em] text-ink-soft uppercase">
            Информация
          </p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/contacts/" className="hover:text-rose">Контакты и самовывоз</Link></li>
            <li><Link href={pageUrl("/доставка-и-оплата.html") ?? "#"} className="hover:text-rose">Доставка и оплата</Link></li>
            <li><Link href={pageUrl("/оформление-свадьбы.html") ?? "#"} className="hover:text-rose">Оформление свадьбы</Link></li>
            <li><Link href={pageUrl("/полезная-информация.html") ?? "#"} className="hover:text-rose">Полезная информация</Link></li>
            <li><Link href="/search/" className="hover:text-rose">Поиск</Link></li>
            <li><Link href="/catalog/" className="hover:text-rose">Весь каталог</Link></li>
          </ul>
        </nav>

        <div>
          <p className="mb-3 text-[11px] font-semibold tracking-[0.2em] text-ink-soft uppercase">
            Контакты
          </p>
          <ul className="space-y-2.5 text-sm">
            {SITE.phone && (
              <li>
                <a href={`tel:${SITE.phone.replace(/[^+\d]/g, "")}`} className="font-display text-xl hover:text-rose">
                  {SITE.phone}
                </a>
              </li>
            )}
            {SITE.address.map((a) => (
              <li key={a.title} className="text-ink-soft">
                <span className="block font-medium text-ink">{a.title}</span>
                {a.lines.map((l) => (
                  <span key={l} className="block">{l}</span>
                ))}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex gap-3">
            {SITE.vkGroup && (
              <a
                href={`https://vk.com/club${SITE.vkGroup}`}
                target="_blank"
                rel="noopener noreferrer"
                className="grid h-10 w-10 place-items-center rounded-full border border-ink/15 text-ink-soft transition hover:border-rose hover:text-rose"
                aria-label="ВКонтакте"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M12.8 17.3c-5 0-8.2-3.5-8.4-9.2h2.6c.1 4.2 2.2 6 3.8 6.4V8.1h2.4v3.6c1.6-.2 3.3-2 3.8-3.6h2.4c-.4 2.2-2.2 3.9-3.4 4.6 1.2.6 3.1 2.1 3.9 4.6h-2.7c-.6-1.9-2.1-3.4-4-3.6v3.6z" />
                </svg>
              </a>
            )}
            {SITE.phone && (
              <a
                href={`tel:${SITE.phone.replace(/[^+\d]/g, "")}`}
                className="grid h-10 w-10 place-items-center rounded-full border border-ink/15 text-ink-soft transition hover:border-rose hover:text-rose"
                aria-label="Позвонить"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M5 4h3l1.6 4-2 1.4a12 12 0 0 0 5 5L14 12.4 18 14v3a2 2 0 0 1-2.2 2A16 16 0 0 1 3 6.2 2 2 0 0 1 5 4Z" strokeLinejoin="round" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-sand/70">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-ink-soft sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} ШарДекор. Все права защищены.</p>
          <a
            href="https://yandex.ru/metrika/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-rose"
          >
            Яндекс.Метрика
          </a>
        </div>
      </div>

      {SITE.metrikaId && (
        <Script id="ym" strategy="afterInteractive">
          {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r;a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
ym(${SITE.metrikaId},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});`}
        </Script>
      )}
    </footer>
  );
}