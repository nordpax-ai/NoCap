import { Logo } from "@/components/public/Logo";

export default function HomePage() {
  return (
    <section className="wash flex min-h-[calc(100vh-3.75rem)] items-center justify-center px-6 py-16">
      <div className="mx-auto max-w-xl text-center">
        <div className="flex justify-center">
          <Logo className="pointer-events-none text-[1.6rem] [&_span:last-child]:text-[1.85rem]" />
        </div>
        <p className="accent mt-10 text-[1.65rem] leading-snug text-ink sm:text-[1.9rem]">
          NextGen European Deal Lawyers
        </p>
        <p className="mx-auto mt-6 max-w-[38rem] text-[1.05rem] leading-relaxed text-slate">
          A private European circle for the next generation of lawyers working on
          M&A, private equity, venture capital and corporate transactions. Small
          by design, by invitation, and built by its members.
        </p>
      </div>
    </section>
  );
}
