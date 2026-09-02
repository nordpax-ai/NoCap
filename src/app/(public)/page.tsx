import { Logo } from "@/components/public/Logo";

export default function HomePage() {
  return (
    <section className="wash flex min-h-[calc(100vh-3.75rem)] items-center justify-center px-6 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <div className="flex justify-center">
          <Logo size="home" decorative />
        </div>
        <p className="home-tagline mt-10">NextGen European Deal Lawyers</p>
        <div className="home-rule mt-7" />
        <p className="home-desc mx-auto mt-7 max-w-[38rem]">
          A private European circle for the next generation of lawyers working on
          M&A, private equity, venture capital and corporate transactions. Small
          by design, by invitation, and built by its members.
        </p>
      </div>
    </section>
  );
}
