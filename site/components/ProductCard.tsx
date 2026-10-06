import Link from "next/link";
import type { Product } from "@/lib/catalog";
import { fmtPrice } from "@/lib/catalog";
import { withBase } from "@/lib/base";

export default function ProductCard({
  p,
  priority,
}: {
  p: Product;
  priority?: boolean;
}) {
  return (
    <Link
      href={`/product/${p.slug}/`}
      className="group flex flex-col overflow-hidden rounded-[1.25rem] border border-sand/70 bg-white/70 transition duration-300 hover:-translate-y-1 hover:border-rose/40 hover:bg-white hover:shadow-[0_22px_50px_-30px_rgba(42,35,32,0.55)]"
    >
      <div className="relative aspect-4/5 overflow-hidden bg-cream-2">
        {p.image ? (
          <img
            src={withBase(`/img/${p.image}`)}
            alt={p.name}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid h-full place-items-center text-ink-soft/50">
            <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.4">
              <circle cx="24" cy="18" r="10" />
              <path d="M24 28v14M20 42h8" strokeLinecap="round" />
            </svg>
          </div>
        )}
        {!p.in_stock && (
          <span className="absolute left-3 top-3 rounded-full bg-ink/80 px-3 py-1 text-[11px] font-medium text-white">
            Под заказ
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="mb-1.5 text-[10px] font-semibold tracking-[0.16em] text-rose/80 uppercase">
          {p.category_title}
        </p>
        <h3 className="font-display line-clamp-2 text-lg leading-snug text-ink transition group-hover:text-rose">
          {p.name}
        </h3>
        <div className="mt-auto flex items-baseline gap-2 pt-3">
          <span className="font-display text-2xl text-ink">{fmtPrice(p.price)}</span>
          {p.code && (
            <span className="ml-auto text-[11px] text-ink-soft/70">код {p.code}</span>
          )}
        </div>
      </div>
    </Link>
  );
}