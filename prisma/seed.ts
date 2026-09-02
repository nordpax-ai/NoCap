import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const UPLOAD_ROOT = path.join(process.cwd(), "data", "uploads");

async function writeText(subdir: string, filename: string, body: string) {
  const dir = path.join(UPLOAD_ROOT, subdir);
  await mkdir(dir, { recursive: true });
  const storagePath = path.join(subdir, filename);
  await writeFile(path.join(UPLOAD_ROOT, storagePath), body, "utf8");
  return storagePath;
}

async function main() {
  const already = await prisma.user.findUnique({ where: { email: "paolo@example.com" } });
  if (already) {
    console.log("Seed already present; skipping.");
    return;
  }

  const passwordHash = await bcrypt.hash("nocap-demo", 12);
  const adminHash = await bcrypt.hash("nocap-admin", 12);

  const paolo = await prisma.user.create({
    data: {
      email: "paolo@example.com",
      passwordHash: adminHash,
      name: "Paolo Piccirilli",
      role: "ADMIN",
      status: "ACTIVE",
      firm: "—",
      city: "Milan",
      practiceArea: "Corporate / M&A",
      jurisdiction: "Italy",
      bio: "Seed administrator for local development. Not a public demo profile.",
      contacts: "paolo@example.com",
      slug: "paolo-piccirilli",
      isDemo: true,
    },
  });

  const members = [
    {
      email: "elena.rossi@example.com",
      name: "Elena Rossi",
      firm: "Independent counsel",
      city: "Milan",
      practiceArea: "M&A",
      jurisdiction: "Italy",
      bio: "Works on mid-market Italian and cross-border acquisitions. Cares about clean closings more than long decks.",
      slug: "elena-rossi",
    },
    {
      email: "lukas.brandt@example.com",
      name: "Lukas Brandt",
      firm: "Independent counsel",
      city: "Frankfurt",
      practiceArea: "Private equity",
      jurisdiction: "Germany",
      bio: "Private equity and corporate transactions out of Frankfurt. Often the one who reads the locked-box schedule twice.",
      slug: "lukas-brandt",
    },
    {
      email: "sofie.jansen@example.com",
      name: "Sofie Jansen",
      firm: "Independent counsel",
      city: "Amsterdam",
      practiceArea: "Venture capital",
      jurisdiction: "Netherlands",
      bio: "Venture and growth deals. Writes the term sheet the way she would want to read it at 11pm.",
      slug: "sofie-jansen",
    },
    {
      email: "camille.baptiste@example.com",
      name: "Camille Baptiste",
      firm: "Independent counsel",
      city: "Paris",
      practiceArea: "M&A",
      jurisdiction: "France",
      bio: "French and cross-border M&A. Interested in how European practice actually converges, not how slides say it does.",
      slug: "camille-baptiste",
    },
    {
      email: "andres.vidal@example.com",
      name: "Andrés Vidal",
      firm: "Independent counsel",
      city: "Madrid",
      practiceArea: "Corporate",
      jurisdiction: "Spain",
      bio: "Corporate and private M&A from Madrid. Membership is personal — the letterhead is not the point.",
      slug: "andres-vidal",
    },
    {
      email: "erik.lindqvist@example.com",
      name: "Erik Lindqvist",
      firm: "Independent counsel",
      city: "Stockholm",
      practiceArea: "Private equity",
      jurisdiction: "Sweden",
      bio: "Nordic PE and corporate work. Prefers a short note that is right to a long memo that is almost right.",
      slug: "erik-lindqvist",
    },
  ];

  const createdMembers = [];
  for (const m of members) {
    createdMembers.push(
      await prisma.user.create({
        data: {
          ...m,
          passwordHash,
          role: "MEMBER",
          status: "ACTIVE",
          contacts: m.email,
          isDemo: true,
        },
      }),
    );
  }

  const [elena, lukas, sofie, camille, andres, erik] = createdMembers;

  await prisma.newsItem.createMany({
    data: [
      {
        dateLabel: "Mar 2026",
        title: "First seats open in the Nordics",
        sortDate: new Date("2026-03-01"),
        isDemo: true,
      },
      {
        dateLabel: "Feb 2026",
        title: "Deal-terms pulse among members",
        sortDate: new Date("2026-02-01"),
        isDemo: true,
      },
      {
        dateLabel: "Jan 2026",
        title: "First virtual meeting",
        sortDate: new Date("2026-01-15"),
        isDemo: true,
      },
      {
        dateLabel: "Nov 2025",
        title: "nocap is founded",
        sortDate: new Date("2025-11-01"),
        isDemo: true,
      },
    ],
  });

  const publications = [
    {
      slug: "locked-box-what-market-still-means",
      title: "What “market” still means on a locked-box SPA",
      category: "Practice",
      authorName: "Elena Rossi",
      publishedAt: new Date("2026-02-18"),
      excerpt:
        "A short note on leakage, interest and the clauses people still treat as boilerplate until they are not.",
      body: "Demo article. Written in the tone members would use with each other: short, specific, and for people who do the work.\n\nThis seed piece is placeholder copy. Real publications will be written by members.",
    },
    {
      slug: "mac-clauses-after-a-quiet-year",
      title: "MAC clauses after a quiet year",
      category: "Practice",
      authorName: "Lukas Brandt",
      publishedAt: new Date("2026-02-04"),
      excerpt: "What survived the last cycle, and what only looks like it did.",
      body: "Demo article. Placeholder body for the public publications list.",
    },
    {
      slug: "wi-exclusions-that-move-the-price",
      title: "W&I: the exclusions that actually move the price",
      category: "Insurance",
      authorName: "Camille Baptiste",
      publishedAt: new Date("2026-01-22"),
      excerpt: "A buyer-side list of the exclusions that change the conversation, not the brochure.",
      body: "Demo article. Placeholder body for the public publications list.",
    },
    {
      slug: "governing-law-four-jurisdiction-pe",
      title: "Governing law in a four-jurisdiction PE deal",
      category: "Cross-border",
      authorName: "Sofie Jansen",
      publishedAt: new Date("2026-01-09"),
      excerpt: "How the circle talked through a real allocation of law, not a default to London.",
      body: "Demo article. Placeholder body for the public publications list.",
    },
    {
      slug: "earn-outs-that-survive-the-board",
      title: "Earn-outs that survive the first board meeting",
      category: "Private equity",
      authorName: "Andrés Vidal",
      publishedAt: new Date("2025-12-12"),
      excerpt: "Metrics, control and the sentences that later become the dispute.",
      body: "Demo article. Placeholder body for the public publications list.",
    },
    {
      slug: "minutes-not-mythology",
      title: "Minutes, not mythology: how we record a circle vote",
      category: "Governance",
      authorName: "Erik Lindqvist",
      publishedAt: new Date("2025-11-28"),
      excerpt: "Why a named roll-call and an immutable PDF matter more than a show of hands.",
      body: "Demo article. Placeholder body for the public publications list.",
    },
  ];

  for (const p of publications) {
    await prisma.publication.create({ data: { ...p, isDemo: true } });
  }

  const charterPath = await writeText(
    "official",
    "charter-v1.txt",
    "DEMO — Charter of nocap (placeholder).\n\nThis is seed content for local development. Replace with the real instrument when adopted.\n",
  );
  const conductPath = await writeText(
    "official",
    "code-of-conduct-v1.txt",
    "DEMO — Code of conduct (placeholder).\n\nMembership is personal. The circle is small on purpose.\n",
  );
  const pulsePath = await writeText(
    "shared",
    "deal-terms-pulse-feb-2026.txt",
    "DEMO — Notes from the February 2026 deal-terms pulse. Shared folder seed file.\n",
  );

  const charter = await prisma.document.create({
    data: {
      title: "Charter (draft placeholder)",
      area: "OFFICIAL",
      uploadedById: paolo.id,
    },
  });
  await prisma.documentVersion.create({
    data: {
      documentId: charter.id,
      version: 1,
      filename: "charter-v1.txt",
      storagePath: charterPath,
      uploadedById: paolo.id,
    },
  });

  const conduct = await prisma.document.create({
    data: {
      title: "Code of conduct (draft placeholder)",
      area: "OFFICIAL",
      uploadedById: paolo.id,
    },
  });
  await prisma.documentVersion.create({
    data: {
      documentId: conduct.id,
      version: 1,
      filename: "code-of-conduct-v1.txt",
      storagePath: conductPath,
      uploadedById: paolo.id,
    },
  });

  const pulse = await prisma.document.create({
    data: {
      title: "Deal-terms pulse — February 2026 notes",
      area: "SHARED",
      uploadedById: elena.id,
    },
  });
  await prisma.documentVersion.create({
    data: {
      documentId: pulse.id,
      version: 1,
      filename: "deal-terms-pulse-feb-2026.txt",
      storagePath: pulsePath,
      uploadedById: elena.id,
    },
  });

  const question = await prisma.question.create({
    data: {
      title: "Nordic seats — what “first seats” should mean in practice",
      body: "Demo question. If we open a small Nordic cohort, what should the invitation letter actually say about capacity, time together, and the fact that membership is personal?",
      authorId: erik.id,
      deadline: new Date("2026-09-30T17:00:00Z"),
    },
  });
  await prisma.questionComment.create({
    data: {
      questionId: question.id,
      authorId: sofie.id,
      body: "Demo comment. I would keep the letter short and say the seat belongs to the person, not the firm.",
    },
  });

  const allActive = [paolo, ...createdMembers];

  const closed = await prisma.vote.create({
    data: {
      object: "Adopt the working name “nocap” for the circle",
      description:
        "DEMO closed vote. Record is immutable. The system shows the numbers; it does not interpret them.",
      deadline: new Date("2026-01-20T18:00:00Z"),
      constitutivePercent: 50,
      deliberativePercent: 66,
      openedById: paolo.id,
      openedAt: new Date("2026-01-10T10:00:00Z"),
      closedAt: new Date("2026-01-20T18:00:00Z"),
    },
  });

  for (const u of allActive) {
    await prisma.voteEligible.create({
      data: { voteId: closed.id, userId: u.id, nameSnapshot: u.name },
    });
  }

  const closedBallots: Array<[string, string, string]> = [
    [paolo.id, "FOR", "2026-01-10T12:00:00Z"],
    [elena.id, "FOR", "2026-01-11T09:10:00Z"],
    [lukas.id, "FOR", "2026-01-11T15:40:00Z"],
    [sofie.id, "FOR", "2026-01-12T08:05:00Z"],
    [camille.id, "ABSTAIN", "2026-01-13T11:22:00Z"],
    [andres.id, "FOR", "2026-01-14T16:00:00Z"],
    [erik.id, "FOR", "2026-01-15T07:45:00Z"],
  ];
  for (const [userId, choice, at] of closedBallots) {
    await prisma.ballot.create({
      data: { voteId: closed.id, userId, choice, createdAt: new Date(at) },
    });
  }

  const open = await prisma.vote.create({
    data: {
      object: "Confirm the first Nordic invitation cohort (demo)",
      description:
        "DEMO open vote. For / Against / Abstain. A vote cannot be changed. Eligible voters were frozen at open.",
      deadline: new Date("2026-12-15T18:00:00Z"),
      constitutivePercent: 50,
      deliberativePercent: 66,
      openedById: paolo.id,
      openedAt: new Date("2026-08-20T10:00:00Z"),
    },
  });
  for (const u of allActive) {
    await prisma.voteEligible.create({
      data: { voteId: open.id, userId: u.id, nameSnapshot: u.name },
    });
  }
  await prisma.ballot.create({
    data: { voteId: open.id, userId: paolo.id, choice: "FOR", createdAt: new Date("2026-08-20T11:00:00Z") },
  });
  await prisma.ballot.create({
    data: { voteId: open.id, userId: elena.id, choice: "FOR", createdAt: new Date("2026-08-21T09:00:00Z") },
  });

  console.log("Seeded demo admin, six public members, publications, documents, questions and votes.");
  console.log("Admin login: paolo@example.com / nocap-admin");
  console.log("Member login (any demo member): e.g. elena.rossi@example.com / nocap-demo");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
