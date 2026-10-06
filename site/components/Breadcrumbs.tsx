import Link from "next/link";

export default function Breadcrumbs({
  items,
}: {
  items: { title: string; href?: string }[];
}) {
  return (
    <nav aria-label="Хлебные крошки" className="text-xs text-ink-soft sm:text-[13px]">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <li>
          <Link href="/" className="transition hover:text-rose">
            Главная
          </Link>
        </li>
        {items.map((it, i) => (
          <li key={it.href ?? i} className="flex items-center gap-2">
            <span className="opacity-40">/</span>
            {it.href ? (
              <Link href={it.href} className="transition hover:text-rose">
                {it.title}
              </Link>
            ) : (
              <span className="text-ink">{it.title}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}