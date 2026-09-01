import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const piece = await prisma.publication.findUnique({ where: { slug } });
  return { title: piece?.title ?? "Publication" };
}

export default async function PublicationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const piece = await prisma.publication.findUnique({ where: { slug } });
  if (!piece) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <Link href="/publications" className="text-sm text-slate hover:text-ink">
        ← Publications
      </Link>
      <p className="mt-8 text-xs tracking-[0.14em] text-coral uppercase">{piece.category}</p>
      <h1 className="mt-3 text-4xl">{piece.title}</h1>
      <p className="mt-3 text-sm text-slate-lt">
        {piece.authorName} · {formatDate(piece.publishedAt)}
      </p>
      <div className="mt-8 space-y-4 whitespace-pre-wrap leading-relaxed text-slate">
        {piece.body}
      </div>
    </main>
  );
}
