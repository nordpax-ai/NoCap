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
      <p className="eyebrow">Publications</p>
      <h1 className="pt mt-4">Written by members, for people who do the work.</h1>
      <p className="lede mt-5">
        Short pieces from the circle. Not a magazine. Not a thought-leadership feed.
      </p>

      <ul className="mt-12 divide-y divide-line border-y border-line">
        {pieces.map((p) => (
          <li key={p.id} className="py-6">
            <p className="pub-kicker">{p.category}</p>
            <h2 className="pub-title mt-2 text-[1.55rem] leading-snug">
              <Link href={`/publications/${p.slug}`} className="hover:text-ink-soft">
                {p.title}
              </Link>
            </h2>
            <p className="mt-2 text-sm text-slate-lt">
              {p.authorName} · {formatDate(p.publishedAt)}
            </p>
            <p className="mt-3 text-slate">{p.excerpt}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
