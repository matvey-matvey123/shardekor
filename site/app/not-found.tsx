import Link from "next/link";
import { getCatalog } from "@/lib/catalog";

export default function NotFound() {
  const { categories } = getCatalog();
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-28 text-center sm:py-40">
      <p className="font-display text-7xl text-rose/30">404</p>
      <h1 className="font-display -mt-6 text-4xl text-ink sm:text-5xl">Страница не найдена</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
        Возможно, товар больше не продаётся или адрес введён с ошибкой.
        Посмотрите каталог — там есть всё для вашего праздника.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/catalog/" className="rounded-full bg-rose px-6 py-3 text-sm font-semibold text-white transition hover:bg-ink">
          В каталог
        </Link>
        <Link href="/" className="rounded-full border border-ink/20 px-6 py-3 text-sm font-semibold text-ink transition hover:border-rose hover:text-rose">
          На главную
        </Link>
      </div>
      <ul className="mt-12 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-ink-soft">
        {categories.map((c) => (
          <li key={c.slug}>
            <Link href={`/catalog/${c.slug}/`} className="hover:text-rose">{c.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}