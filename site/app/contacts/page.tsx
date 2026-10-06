import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import OrderBlock from "@/components/OrderBlock";
import { SITE } from "@/lib/site";
import { pageUrl } from "@/lib/catalog";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Контакты",
  description:
    "Контакты ШарДекор: пункты самовывоза в Волоколамске и Истре, доставка по Московской области, оформление свадьбы шарами.",
  alternates: { canonical: "/contacts/" },
};

export default function ContactsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs items={[{ title: "Контакты" }]} />

      <header className="mt-6">
        <h1 className="font-display text-4xl leading-tight text-ink sm:text-5xl">Контакты</h1>
        <p className="mt-3 text-sm text-ink-soft">
          {SITE.city} · {SITE.hours}
        </p>
      </header>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <div className="rounded-[1.5rem] border border-sand/70 bg-white/60 p-7">
          <h2 className="font-display text-2xl text-ink">Как связаться</h2>
          <ul className="mt-5 space-y-4 text-sm">
            {SITE.phone && (
              <li>
                <span className="block text-[11px] tracking-[0.16em] text-ink-soft uppercase">Телефон</span>
                <a href={`tel:${SITE.phone.replace(/[^+\d]/g, "")}`} className="font-display text-2xl hover:text-rose">
                  {SITE.phone}
                </a>
              </li>
            )}
            {SITE.email && (
              <li>
                <span className="block text-[11px] tracking-[0.16em] text-ink-soft uppercase">Почта</span>
                <a href={`mailto:${SITE.email}`} className="hover:text-rose">{SITE.email}</a>
              </li>
            )}
            <li>
              <span className="block text-[11px] tracking-[0.16em] text-ink-soft uppercase">Время работы</span>
              <span>{SITE.hours}</span>
            </li>
            <li>
              <span className="block text-[11px] tracking-[0.16em] text-ink-soft uppercase">Мы в соцсетях</span>
              {SITE.vkGroup && (
                <a
                  href={`https://vk.com/club${SITE.vkGroup}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-rose"
                >
                  ВКонтакте
                </a>
              )}
            </li>
          </ul>
          {!SITE.phone && (
            <p className="mt-6 rounded-xl border border-rose/30 bg-rose-soft/40 px-4 py-3 text-sm text-ink-soft">
              Телефон и другие способы связи будут добавлены — уточните их у
              владельца сайта.
            </p>
          )}
        </div>

        <div className="space-y-4">
          {SITE.address.map((a) => (
            <div key={a.title} className="rounded-[1.5rem] border border-sand/70 bg-white/60 p-7">
              <h2 className="font-display text-xl text-ink">{a.title}</h2>
              <address className="mt-3 text-sm not-italic leading-relaxed text-ink-soft">
                {a.lines.map((l) => (
                  <span key={l} className="block">{l}</span>
                ))}
              </address>
              {a.note && (
                <p className="mt-3 inline-block rounded-full bg-rose-soft/50 px-3 py-1 text-xs text-rose">
                  {a.note}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-[1.5rem] border border-sand/70 bg-white/60 p-7">
        <h2 className="font-display text-2xl text-ink">Доставка и оплата</h2>
        <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-ink-soft">
          <li>Минимальной суммы заказа для курьерской доставки нет.</li>
          <li>Оплата наличными, переводом на карту или на телефон.</li>
          <li>Доставку выполняет собственная курьерская служба.</li>
          <li>Самовывоз из пунктов выдачи — со скидкой 10%.</li>
        </ul>
        <a href={pageUrl("/доставка-и-оплата.html") ?? "#"} className="mt-5 inline-block text-sm font-semibold text-rose hover:underline">
          Подробные тарифы доставки
        </a>
      </div>

      <div className="mt-10">
        <OrderBlock title="Обсудим ваш праздник?" />
      </div>
    </div>
  );
}