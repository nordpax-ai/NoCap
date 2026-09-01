import type { Metadata } from "next";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Publications" };

export default async function PublicationsPage() {
  const pieces = await prisma.publication.findMany({
    orderBy: { publishedAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-xs tracking-[0.18em] text-slate-lt uppercase">Publications</p>
      <h1 className="mt-3 text-4xl text-ink sm:text-5xl">
        Written by members, for people who do the work.
      </h1>
      <p className="mt-5 leading-relaxed text-slate">
        Short pieces from the circle. Not a magazine. Not a thought-leadership feed.
      </p>

      <ul className="mt-12 divide-y divide-line border-y border-line">
        {pieces.map((p) => (
          <li key={p.id} className="py-6">
            <p className="text-xs tracking-[0.14em] text-coral uppercase">{p.category}</p>
            <h2 className="mt-2 text-2xl leading-snug">
              <Link href={`/publications/${p.slug}`} className="hover:text-ink-soft">
                {p.title}
              </Link>
            </h2>
            <p className="mt-2 text-sm text-slate-lt">
              {p.authorName} · {formatDate(p.publishedAt)}
            </p>
            <p className="mt-3 leading-relaxed text-slate">{p.excerpt}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
