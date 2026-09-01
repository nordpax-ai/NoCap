import { avatarHue, initials } from "@/lib/utils";

export function Avatar({
  name,
  photoSrc,
  size = 56,
}: {
  name: string;
  photoSrc?: string | null;
  size?: number;
}) {
  if (photoSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoSrc}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  const hue = avatarHue(name);
  return (
    <span
      aria-hidden
      className="inline-grid place-items-center rounded-full font-[family-name:var(--font-outfit)] font-medium text-ink-deep"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.32,
        background: `linear-gradient(145deg, hsl(${hue} 42% 82%), hsl(${(hue + 40) % 360} 38% 88%))`,
      }}
    >
      {initials(name)}
    </span>
  );
}
