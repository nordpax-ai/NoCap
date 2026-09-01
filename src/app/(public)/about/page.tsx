import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "About" };

export default async function AboutPage() {
  const news = await prisma.newsItem.findMany({ orderBy: { sortDate: "desc" } });

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-xs tracking-[0.18em] text-slate-lt uppercase">About</p>
      <h1 className="mt-3 text-4xl text-ink sm:text-5xl">A circle, not a network.</h1>
      <p className="accent mt-5 text-xl text-slate">
        Built by people who already called each other — and decided that was the point.
      </p>

      <section className="mt-14 space-y-10">
        <Block title="Where we come from">
          nocap was founded by European deal lawyers who had already been calling
          each other for years. The circle is the continuation of that habit, not
          a new marketplace for introductions.
        </Block>
        <Block title="What we’re for">
          Genuine relationships among people who will run European transactions
          for the next twenty years. Shared knowledge, individual visibility, and
          time together — in a room that stays small enough to remain real.
        </Block>
        <Block title="Why it matters">
          This is an association of individuals. It is small on purpose.
          Membership belongs to the member, not the firm.
        </Block>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl">Latest news</h2>
        <ol className="mt-6 divide-y divide-line border-y border-line">
          {news.map((item) => (
            <li key={item.id} className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-8">
              <span className="w-28 shrink-0 text-sm text-slate-lt">{item.dateLabel}</span>
              <span className="text-ink">{item.title}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-slate-lt">Demo timeline from the public mockup.</p>
      </section>
    </main>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-2xl">{title}</h2>
      <p className="mt-3 leading-relaxed text-slate">{children}</p>
    </div>
  );
}
