import { SITE } from "@/lib/site";
import { withBase } from "@/lib/base";

export default function OrderBlock({
  title = "Хотите узнать актуальную цену и наличие?",
  compact,
}: {
  title?: string;
  compact?: boolean;
}) {
  return (
    <aside
      className={
        "rounded-[1.5rem] border border-rose/25 bg-gradient-to-br from-rose-soft/50 to-cream-2/60 " +
        (compact ? "p-6" : "p-8 sm:p-10")
      }
    >
      <h2 className="font-display text-2xl leading-snug text-ink sm:text-3xl">
        {title}
      </h2>
      <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-ink-soft">
        Напишите нам — подскажем по наличию, подберём похожие варианты и
        рассчитаем оформление под ваш праздник.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        {SITE.phone && (
          <a
            href={`tel:${SITE.phone.replace(/[^+\d]/g, "")}`}
            className="rounded-full bg-rose px-6 py-3 text-sm font-semibold text-white transition hover:bg-ink"
          >
            Позвонить {SITE.phone}
          </a>
        )}
        {SITE.telegram && (
          <a
            href={`https://t.me/${SITE.telegram.replace(/^@/, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-ink/20 px-6 py-3 text-sm font-semibold text-ink transition hover:border-rose hover:text-rose"
          >
            Написать в Telegram
          </a>
        )}
        {SITE.whatsapp && (
          <a
            href={`https://wa.me/${SITE.whatsapp.replace(/[^\d]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-ink/20 px-6 py-3 text-sm font-semibold text-ink transition hover:border-rose hover:text-rose"
          >
            WhatsApp
          </a>
        )}
        {SITE.email && (
          <a
            href={`mailto:${SITE.email}`}
            className="rounded-full border border-ink/20 px-6 py-3 text-sm font-semibold text-ink transition hover:border-rose hover:text-rose"
          >
            {SITE.email}
          </a>
        )}
        {!SITE.phone && !SITE.telegram && !SITE.whatsapp && !SITE.email && (
          <a
            href={withBase("/contacts/")}
            className="rounded-full bg-rose px-6 py-3 text-sm font-semibold text-white transition hover:bg-ink"
          >
            Перейти в контакты
          </a>
        )}
      </div>
      <p className="mt-5 text-xs text-ink-soft/80">
        {SITE.city} · {SITE.hours}
      </p>
    </aside>
  );
}