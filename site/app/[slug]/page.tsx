import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import Prose from "@/components/Prose";
import OrderBlock from "@/components/OrderBlock";
import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-static";

export default async function StaticPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { staticPages } = getCatalog();
  const page = staticPages.find((p) => p.url === `/${decodeURIComponent(slug)}/`);
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs items={[{ title: page.title }]} />
      <h1 className="font-display mt-6 text-4xl leading-tight text-ink sm:text-5xl">
        {page.title}
      </h1>
      <div className="mt-6 rule" />
      <div className="mt-8">
        <Prose text={page.html} />
      </div>
      <div className="mt-14">
        <OrderBlock compact />
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  return getCatalog().staticPages.map((p) => ({ slug: p.url.slice(1, -1) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = getCatalog().staticPages.find(
    (p) => p.url === `/${decodeURIComponent(slug)}/`
  );
  if (!page) return {};
  return {
    title: page.title,
    alternates: { canonical: page.url },
    robots: { index: true, follow: true },
  };
}