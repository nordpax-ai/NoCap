import Link from "next/link";

export default function NotFound() {
  return (
    <div className="pub">
      <div className="wrap inner">
        <h1 className="pt">Page not found</h1>
        <p><Link href="/">Back to nocap</Link></p>
      </div>
    </div>
  );
}
