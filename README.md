# nocap

Public website and members' reserved area for nocap, a private European circle of deal lawyers.

The functional specification is the source of truth. The public site and the reserved area follow that specification. Visual design follows the client's mockups: Outfit, Manrope and Instrument Serif on the public site; Inter and Newsreader in the reserved area.

## Stack

- **Next.js** (App Router) for the public pages and the reserved area. One process, server-rendered, easy to run in the EU.
- **PostgreSQL** for every record. The web process connects as `nocap_app`. Migrations and the seed connect as `nocap_owner`. Row Level Security allows only `nocap_app`. A future Supabase Data API, if pointed at this database, does not grant `anon` or `authenticated` any access.
- **Application sessions**, not a hosted auth product. An admin invites a member. The member sets a password from the email link. Password reset uses the same kind of link. This keeps the club off a single vendor's auth service.
- **Files** on local disk, or on any S3-compatible store (including Supabase Storage in an EU project).
- **Email** through a small adapter. `log` writes each message to `var/emails` and shows it at `/dev/mail` in development. `smtp` sends through any provider.

Postgres, the files and the mail adapter can all live in the EU. A full export is a zip of the documents and the resolutions register. Nothing required to read that archive lives only inside a vendor console.

## Local setup

Requirements: Node.js 22, PostgreSQL 16.

```bash
npm install
cp .env.example .env.local
npm run db:setup
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000.

`db:setup` creates the `nocap` database and the two local roles (`nocap_owner` / `nocap_app`, passwords `nocap_owner` / `nocap_app`). Change those passwords before any shared environment.

### Demo sign-in

Seeded people are examples. They are not real biographies.

| Who | Email | Password |
| --- | --- | --- |
| Admin (example chair) | `paolo.piccirilli@example.invalid` | `example-password` |
| Member | `elena.rossi@example.invalid` | `example-password` |

Clara Example is deactivated. She stays in the historical vote and in a question thread, and she does not appear on the public members page. A pending invite is written to `var/emails/000-seed-invite.json`.

Logged messages are listed at http://localhost:3000/dev/mail while `EMAIL_PROVIDER=log` and the app is not in production.

### What the seed contains

- Public pages with the mockup's example copy, marked as example where it is not a real fact.
- An official register (charter with three versions, code of conduct, minutes, one resolution) and a shared note.
- Example publications. One of them has an example PDF. The detail page is a placeholder.
- An open question, a closed vote that carried, a closed vote that is invalid because the constitutive quorum was not met, and an open admission vote.
- Dates are stored in UTC and shown in `APP_TIMEZONE` (default `Europe/Rome`).

`npm run verify` repeats the main flows against a running dev server: invite, set password, public profile, application, question email, frozen electorate, automatic close, both quorums (including the invalid case and abstentions in the deliberative count), database immutability, the PDF record, bulk download and the full export. It changes the database. Run `npm run db:seed` again afterwards to restore the demo.

## Reserved area

Sign-in is at `/login`. There is no open signup.

- **Profile.** Photo, firm, city, practice area, contacts, and the role, biography and jurisdiction shown on the public members page. Firm is not published.
- **Documents.** Official register (admin uploads) and shared folder (any member uploads). Versions, title search, download, and a zip of the ticked files.
- **Questions.** Any member opens one. Replies are comments, with attachments and an optional deadline. Opening emails every active member. A reply emails the people already in the thread. The author can send a reminder.
- **Votes.** An admin opens a vote with a subject, a description, attachments, a deadline, and two quorums. Eligible voters are the active members at that moment, and the list does not change. Choices are For, Against and Abstain. The vote is open: everyone can see who voted what. A ballot cannot be edited. While the vote is open the page shows who has voted, who has not, and the deadline. The admin can remind people who have not voted.
- **Close.** At the deadline the vote closes (on the next visit to the reserved area, on a full export, or via `POST /api/jobs/close-votes` with `Authorization: Bearer $CRON_SECRET`). Constitutive quorum is the share of eligible voters who cast a ballot. Abstentions count as participation. Deliberative quorum is the share of For among votes cast, and abstentions are part of that count. If the constitutive quorum is not met, the outcome is invalid. The page states the outcome and the counts. It does not interpret them.
- **Record.** Each closed vote has a PDF: subject, eligible voters, each named vote with the time it was cast, the quorums, and the outcome.
- **Applications.** The public membership form emails the Founding Committee and stores the application, including the CV, for members.
- **Export.** `/area/export` downloads every document version and the resolutions register.

Closed votes and resolutions cannot be updated or deleted, including by the database owner. That is enforced with triggers and grants, not only by hiding buttons.

## Deploy in the EU

Do not point this app at a US-only region. A working layout:

1. **Database.** PostgreSQL 16 in an EU region. Supabase's EU (Frankfurt) project is a direct fit: run the SQL in `db/migrations` as the owner, and set `DATABASE_URL` to a role equivalent to `nocap_app`. Do not put the owner URL in the running app. Do not enable the Data API for these tables; the policies admit only the application role.
2. **App.** Any Node host in the EU (a small VM, Fly.io `fra`, or a container platform with an EU region). `npm run build && npm run start`. Set `APP_URL` to `https://nocap-law.com` once that domain is connected. It is not connected yet.
3. **Files.** `STORAGE_PROVIDER=s3` with an EU bucket. For Supabase Storage use the project's S3 endpoint and `S3_REGION=eu-central-1`. Or keep `STORAGE_PROVIDER=local` on a disk that is backed up.
4. **Email.** Set `EMAIL_PROVIDER=smtp` and the `SMTP_*` variables. The provider is an open choice; pick one that processes mail in the EU if that is a requirement.
5. **Clock.** A scheduled `POST /api/jobs/close-votes` every few minutes closes votes whose deadline has passed even if nobody visits. The reserved area also closes them on the next request.
6. **Secrets.** Only through the environment. Start from `.env.example`. Use long random values for `CRON_SECRET` and the database passwords.

The future public domain is `nocap-law.com`. Contact addresses in the example env file are placeholders.

## Backup and export

Two copies, on purpose:

- **Database.** `pg_dump` of the `nocap` database, taken in the EU and stored in the EU. This is the full backup, including applications, questions, votes and sessions.
- **Documents and resolutions, with no provider in the loop.** Any member can download `/api/export` (linked from the reserved area). The zip contains every file version and `resolutions/register.json` plus a PDF for each closed vote. Reading it does not require this app or the database host.

Restoring is: create an empty database, `psql` the dump, put the files back under the storage root (or into the bucket), and start the app.

## Open items

These are not decided by the specification. They are implemented in a way that is easy to change.

- **Copy the spec does not mention.** The membership page still says membership is "capped per firm and per jurisdiction", and the steps still say "Committee" and "Secretary". Those words come from the mockup.
- **Publication detail.** A publication has a page and an optional PDF. Whether the real format is a page, a PDF, or both is open.
- **Placeholders to replace.** Example member names, biographies and the absence of real photos. Example publications. The privacy policy, which is marked as a draft and is not legal advice. The logo is the mockup PNG, not a vector master. `CONTACT_EMAIL` and `FOUNDING_COMMITTEE_EMAIL`.
- **Account and domain ownership.** `nocap-law.com` is not connected. No hosting account has been created by this repository.
- **Email provider.** Local development logs mail. Production SMTP is not chosen.
- **Timezone.** Deadlines typed into the forms are read as `Europe/Rome`. Confirm that with the club if another zone is intended.
- **Deliberative quorum.** "For" is divided by every ballot cast, abstentions included, because the specification describes that quorum as the share of For over votes cast. Abstentions also count toward the constitutive quorum.
- **Reactivation.** An admin can reactivate a member. The specification only requires deactivation. The public page follows the current status.
