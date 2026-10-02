import { PDFDocument, StandardFonts } from "pdf-lib";

const NOTE = "EXAMPLE PLACEHOLDER. Not an adopted text.\n";

export type SeedVersion = {
  key: string;
  filename: string;
  text: string;
  at: string;
};

export type SeedDocument = {
  area: "register" | "shared";
  category: "charter" | "code_of_conduct" | "minutes" | "resolution" | "shared";
  title: string;
  author: string;
  createdAt: string;
  versions: SeedVersion[];
};

export const seedDocuments: SeedDocument[] = [
  {
    area: "register",
    category: "charter",
    title: "Charter",
    author: "Paolo Piccirilli",
    createdAt: "2025-11-20T10:00:00Z",
    versions: [
      { key: "seed/register/charter-v1.txt", filename: "charter-v1.txt", text: NOTE + "Example charter, version 1.\n", at: "2025-11-20T10:00:00Z" },
      { key: "seed/register/charter-v2.txt", filename: "charter-v2.txt", text: NOTE + "Example charter, version 2.\n", at: "2026-06-02T10:00:00Z" },
      { key: "seed/register/charter-v3.txt", filename: "charter-v3.txt", text: NOTE + "Example charter, version 3.\n", at: "2026-08-18T10:00:00Z" },
    ],
  },
  {
    area: "register",
    category: "code_of_conduct",
    title: "Code of conduct",
    author: "Paolo Piccirilli",
    createdAt: "2026-08-18T10:00:00Z",
    versions: [
      {
        key: "seed/register/code-of-conduct-v2.txt",
        filename: "code-of-conduct-v2.txt",
        text: NOTE + "Example code of conduct.\n",
        at: "2026-08-18T10:00:00Z",
      },
    ],
  },
  ...([
    ["Minutes — founding meeting", "2025-11-20T10:00:00Z", "seed/register/minutes-founding.txt"],
    ["Minutes — January call", "2026-01-15T10:00:00Z", "seed/register/minutes-january.txt"],
    ["Minutes — March call", "2026-03-12T10:00:00Z", "seed/register/minutes-march.txt"],
    ["Minutes — June call", "2026-06-02T10:00:00Z", "seed/register/minutes-june.txt"],
  ] as const).map(
    ([title, at, key]): SeedDocument => ({
      area: "register",
      category: "minutes",
      title,
      author: "Paolo Piccirilli",
      createdAt: at,
      versions: [{ key, filename: "minutes.txt", text: NOTE + title + "\n", at }],
    }),
  ),
  {
    area: "register",
    category: "resolution",
    title: "Resolution — example, uploaded file",
    author: "Paolo Piccirilli",
    createdAt: "2026-08-18T12:00:00Z",
    versions: [
      {
        key: "seed/register/resolution-example.txt",
        filename: "resolution.txt",
        text: NOTE + "An uploaded resolution. It cannot be edited or deleted.\n",
        at: "2026-08-18T12:00:00Z",
      },
    ],
  },
  {
    area: "shared",
    category: "shared",
    title: "Example note on leakage drafting",
    author: "Elena Rossi",
    createdAt: "2026-03-12T09:00:00Z",
    versions: [
      {
        key: "seed/shared/leakage-note.txt",
        filename: "note.txt",
        text: "EXAMPLE. A shared note, not a publication and not a resolution.\n",
        at: "2026-03-12T09:00:00Z",
      },
    ],
  },
];

const publicationTitles: Record<string, string> = {
  "deal-terms-locked-box":
    "Locked box or closing accounts: what the mid-market actually chose this year",
};

export function publicationPdfKey(slug: string): string {
  return `seed/publications/${slug}.pdf`;
}

export async function publicationPdf(title: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  page.drawText("EXAMPLE PUBLICATION — not a real article.", { x: 54, y: 760, size: 14, font });
  page.drawText(title, { x: 54, y: 730, size: 12, font });
  return Buffer.from(await doc.save());
}

export async function seedFile(key: string): Promise<{ body: Buffer; contentType: string } | null> {
  for (const document of seedDocuments) {
    for (const version of document.versions) {
      if (version.key === key) return { body: Buffer.from(version.text), contentType: "text/plain" };
    }
  }
  const match = /^seed\/publications\/(.+)\.pdf$/.exec(key);
  const title = match ? publicationTitles[match[1]] : undefined;
  if (!title) return null;
  return { body: await publicationPdf(title), contentType: "application/pdf" };
}
