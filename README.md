# nocap

Public website and members’ area for **nocap** (styled lowercase) — a non-profit association of individual European deal lawyers. Invitation-only. Not yet incorporated. NordPax is building the site. Contact: Paolo Piccirilli.

All UI and automated emails are in **English**. The site is usable on mobile.

This repository is the application only. **Do not deploy from this PR.** Hosting will be in the EU later. No production domain, LinkedIn URL, or committee inbox is invented here.

## How to run locally

Requirements: Node.js 20.9+ and npm.

```bash
cp .env.example .env
# set AUTH_SECRET to a long random string
npm install
npx prisma db push
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful scripts:

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm test` | Quorum / vote-outcome unit tests |
| `npm run db:reset` | Wipe the local SQLite file and re-seed |
| `npm run build` | Production build (no deploy) |

SQLite file: `prisma/dev.db`. Uploads: `data/uploads/` (gitignored).

## Demo seed vs real data

The seed is **DEMO only**. It exists so the public mockup and the members’ area can be reviewed. Real profiles, publications and documents will later come from members themselves.

**Seed admin (local only)**

- Email: `paolo@example.com`
- Password: `nocap-admin`
- Shown in the logged-in header as Paolo Piccirilli / PP

**Seed public members (DEMO profiles)**

These six people are mockup placeholders. They appear on the public Members page until deactivated. Password for each: `nocap-demo`.

| Name | City | Email |
| --- | --- | --- |
| Elena Rossi | Milan | elena.rossi@example.com |
| Lukas Brandt | Frankfurt | lukas.brandt@example.com |
| Sofie Jansen | Amsterdam | sofie.jansen@example.com |
| Camille Baptiste | Paris | camille.baptiste@example.com |
| Andrés Vidal | Madrid | andres.vidal@example.com |
| Erik Lindqvist | Stockholm | erik.lindqvist@example.com |

Also seeded as demo: six publication titles, the About news timeline, placeholder official documents, a shared-folder note, one question, one closed vote (immutable PDF record) and one open vote.

When a member is deactivated, their public profile disappears. Their questions, comments and past votes remain.

## Environment variables

See `.env.example`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Local default: `file:./dev.db`. For EU production later, switch Prisma to `postgresql` and point at a European-hosted database. |
| `AUTH_SECRET` | yes | JWT session secret. |
| `APP_URL` | yes | Origin used in invite and reset links. Local: `http://localhost:3000`. |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `SMTP_FROM` | no | **TODO.** If unset, emails are written to the `EmailLog` table and stdout. No real inbox is configured. |
| `SECRETARY_EMAIL` | no | Optional. If unset, the private-area explainer says “write to the Secretary” without an address. |
| `APPLICATIONS_INBOX` | no | Optional notify target for membership notes. |
| `LINKEDIN_URL` | no | Unused unless you choose to surface it later. Do not invent one. |

## What is in the product

Wordmarks in `public/brand/` are a faithful Outfit “nocap” mark (navy for paper pages, cream for the dark About chrome). Replace those files with Paolo’s extracted PNGs if they differ.

**Public site** (paper / coral / periwinkle — not NordPax navy/gold)

- Home: logo, the line “NextGen European Deal Lawyers”, and the short description. No apply CTA.
- About, Members, Publications, Membership, Private area explainer, privacy stub.
- Sticky nav with a lock / Private area control always on the right.
- Membership form (name, firm and city, email, nominated by, why, CV PDF ≤5MB, required privacy acceptance). Stored locally; optional email via env.

**Members’ area** (`/app`, invite-only)

- No open registration. Admin invites; the member sets a password from the link. Password reset by email (or email log).
- Dashboard → profile, documents, questions, votes. Questions and votes are separate.
- Profile edits feed the public Members page.
- Documents: official register (admin upload) and shared folder (all members). Versioned, searchable by title, downloadable, bulk zip.
- Questions: any member opens; comments; email on create and on reply; opener can nudge.
- Votes: admin only opens; mandatory deadline; For / Against / Abstain; public named roll-call; vote cannot be changed; eligible list frozen at open.
- Quorums set at open: constitutive = % of eligible who voted (abstentions count); deliberative = % in favour among votes cast. If constitutive fails, the record is shown as invalid. The system **shows** the outcome; it does not interpret it.
- Closed votes cannot be edited or deleted, including by admin. Each closed vote produces a downloadable PDF; the full resolutions register is also downloadable as a zip.

**Out of scope:** in-app chat, push, extra roles, calendar, payments, native app.

## Stack

Next.js (App Router), TypeScript, Tailwind, Prisma 6 + SQLite for local development, JWT cookie sessions, local disk uploads, PDFKit for vote records. Chosen so the same app can later run on EU-hosted Node + Postgres without a US-only platform lock-in. This PR does not deploy anywhere.
