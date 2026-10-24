/**
 * Local checks for the flows the spec requires.
 * Run with the dev server on http://localhost:3000 and a fresh seed.
 */
import { inflateRawSync, inflateSync } from "zlib";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { DateTime } from "luxon";
import JSZip from "jszip";
import { Pool } from "pg";
import puppeteer, { type Browser, type ElementHandle, type Page } from "puppeteer-core";
import { loadEnv } from "./load-env";

loadEnv();

const BASE = process.env.APP_URL || "http://localhost:3000";
const SHOTS = "/opt/cursor/artifacts/screenshots";
const CHROME = process.env.CHROME_PATH || "/usr/local/bin/google-chrome";
const APP = process.env.DATABASE_URL!;
const OWNER = process.env.DATABASE_URL_OWNER!;
const ZONE = process.env.APP_TIMEZONE || "Europe/Rome";

const failures: string[] = [];

function visibleText(html: string): string {
  return html.replace(/<!--.*?-->/gs, "");
}

function pdfText(bytes: Buffer): string {
  const chunks: Buffer[] = [];
  let index = 0;
  while (index < bytes.length) {
    const marker = bytes.indexOf(0x78, index);
    if (marker < 0) break;
    let decoded: Buffer | null = null;
    for (const inflate of [inflateSync, inflateRawSync]) {
      try {
        decoded = inflate(bytes.subarray(marker));
        break;
      } catch {
        decoded = null;
      }
    }
    if (decoded && decoded.includes(Buffer.from("Tj"))) chunks.push(decoded);
    index = marker + 1;
  }
  const combined = Buffer.concat(chunks).toString("latin1");
  return [...combined.matchAll(/<([0-9A-Fa-f]+)>/g)]
    .map((match) => Buffer.from(match[1], "hex").toString("latin1"))
    .join("\n");
}

function check(name: string, ok: boolean, detail = ""): void {
  if (ok) {
    console.log(`PASS  ${name}`);
  } else {
    const line = detail ? `${name} — ${detail}` : name;
    failures.push(line);
    console.error(`FAIL  ${line}`);
  }
}

async function emailsSince(since: number): Promise<{ subject: string; to: string[]; text: string; at: string }[]> {
  const dir = path.join(process.cwd(), "var", "emails");
  const files = await readdir(dir);
  const out = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const raw = JSON.parse(await readFile(path.join(dir, file), "utf8"));
    if (new Date(raw.at).getTime() + 500 >= since) out.push(raw);
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

function romeInput(secondsAhead: number): string {
  return DateTime.now().setZone(ZONE).plus({ seconds: secondsAhead }).toFormat("yyyy-LL-dd'T'HH:mm:ss");
}

async function freshPage(browser: Browser): Promise<Page> {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.setDefaultTimeout(25000);
  return page;
}

async function goto(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
}

async function login(page: Page, email: string, password: string): Promise<void> {
  await goto(page, `${BASE}/login`);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await clickButton(page, "Enter");
  await page.waitForFunction(() => location.pathname.startsWith("/area"), { timeout: 30000 });
}

async function clickButton(page: Page, text: string): Promise<void> {
  await page.locator(`button::-p-text(${text})`).click();
}

async function shot(page: Page, name: string, width: number): Promise<void> {
  await page.setViewport({ width, height: width < 500 ? 844 : 1000, deviceScaleFactor: 1 });
  await page.reload({ waitUntil: "networkidle0", timeout: 60000 });
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
}

async function expectDenied(pool: Pool, sql: string, label: string): Promise<void> {
  try {
    await pool.query(sql);
    check(label, false, "statement succeeded");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    check(label, /permission denied|cannot be modified|cannot be changed|cannot be deleted|resolutions cannot/i.test(message), message.split("\n")[0]);
  }
}

async function main(): Promise<void> {
  await mkdir(SHOTS, { recursive: true });
  const app = new Pool({ connectionString: APP });
  const owner = new Pool({ connectionString: OWNER });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const ids = await snapshotIds(app);
    const paolo = await app.query<{ id: string }>(
      `SELECT id FROM profiles WHERE email = 'paolo.piccirilli@example.invalid'`,
    );
    await app.query(
      `INSERT INTO notifications (recipient_id, kind, title, body, href, event_key)
       VALUES ($1, 'question_opened', 'Question: Annual meeting — venue options', 'Example notice for the bell.', $2, $3)
       ON CONFLICT (recipient_id, event_key) DO UPDATE SET read_at = NULL`,
      [paolo.rows[0].id, `/area/questions/${ids.question}`, `shot:bell:${paolo.rows[0].id}`],
    );
    if (!process.env.SKIP_SHOTS) await screenshots(browser, ids);

    const clara = await app.query(`SELECT status FROM profiles WHERE email = 'clara.example@example.invalid'`);
    check("seeded Clara is deactivated", clara.rows[0]?.status === "deactivated");

    const publicPage = await freshPage(browser);
    await goto(publicPage, `${BASE}/members`);
    const membersHtml = await publicPage.content();
    check("public members include Elena", membersHtml.includes("Elena Rossi"));
    check("deactivated Clara is absent from the public page", !membersHtml.includes("Clara Example"));
    await publicPage.close();

    const claraLogin = await freshPage(browser);
    await goto(claraLogin, `${BASE}/login`);
    await claraLogin.locator("#email").fill("clara.example@example.invalid");
    await claraLogin.locator("#password").fill("example-password");
    await clickButton(claraLogin, "Enter");
    await claraLogin.waitForFunction(() => location.search.includes("error") || location.pathname.startsWith("/area"), { timeout: 20000 });
    check("deactivated member cannot sign in", claraLogin.url().includes("error"));
    await claraLogin.close();

    const started = Date.now();
    const admin = await freshPage(browser);
    await login(admin, "paolo.piccirilli@example.invalid", "example-password");
    await goto(admin, `${BASE}/area/profile`);
    const paoloProfile = await admin.content();
    check(
      "Paolo's demo photo is the initials placeholder",
      paoloProfile.includes(">PP<") && !paoloProfile.includes("/api/photos/"),
    );

    await goto(admin, `${BASE}/area/admin`);
    await admin.locator("#name").fill("Verify Example");
    await admin.locator("#email").fill("verify.member@example.invalid");
    await clickButton(admin, "Send invite");
    await admin.waitForFunction(() => location.search.includes("invited"), { timeout: 20000 });
    const inviteMail = (await emailsSince(started)).find((mail) => mail.subject.includes("invited"));
    const join = inviteMail?.text.match(/https?:\/\/\S+\/join\/\S+/)?.[0];
    check("invite email contains a set-password link", Boolean(join), inviteMail?.subject || "no invite email");

    const joiner = await freshPage(browser);
    await goto(joiner, join!);
    await joiner.locator("#password").fill("verify-pass-1");
    await clickButton(joiner, "Save and enter");
    await joiner.waitForFunction(() => location.pathname.startsWith("/area"), { timeout: 30000 });
    check("invite link sets a password and opens the dashboard", joiner.url().includes("/area"));

    await goto(joiner, `${BASE}/area/profile`);
    const badPhoto = path.join(SHOTS, "not-a-photo.txt");
    await mkdir(SHOTS, { recursive: true });
    await writeFile(badPhoto, "this is not an image");
    const photoInput = (await joiner.$("#photo")) as ElementHandle<HTMLInputElement> | null;
    await photoInput?.uploadFile(badPhoto);
    await clickButton(joiner, "Save profile");
    await joiner.waitForFunction(() => document.body.innerText.includes("could not be read"), { timeout: 20000 });
    check("an unreadable photo shows a clear error", (await joiner.content()).includes("could not be read"));

    await joiner.locator("#public_role").fill("Associate · corporate");
    await joiner.locator("#bio").fill("Example verification biography. Not a real person.");
    await joiner.locator("#city").fill("Lyon");
    await joiner.locator("#jurisdiction").fill("France");
    await joiner.locator("#firm").fill("Example Firm");
    await joiner.$("#photo").then((input) => input?.evaluate((node) => {
      (node as HTMLInputElement).value = "";
    }));
    await clickButton(joiner, "Save profile");
    await joiner.waitForFunction(() => location.search.includes("saved"), { timeout: 20000 });

    const members = await freshPage(browser);
    await goto(members, `${BASE}/members`);
    const afterProfile = await members.content();
    check(
      "public members stay the original placeholders",
      afterProfile.includes("Elena Rossi") &&
        afterProfile.includes("Paolo Piccirilli") &&
        afterProfile.includes("Milan") &&
        afterProfile.includes("Private equity and carve-outs") &&
        !afterProfile.includes("Verify Example") &&
        !afterProfile.includes("Lyon") &&
        !afterProfile.includes("Example verification biography"),
    );
    check("public members page omits the private firm", !afterProfile.includes("Example Firm"));
    const savedHtml = await joiner.content();
    check("profile save confirms success", savedHtml.includes("Profile saved."));
    await members.close();

    const membership = await freshPage(browser);
    const membershipResponse = await membership.goto(`${BASE}/membership`, { waitUntil: "networkidle0", timeout: 60000 });
    check("membership page is removed", membershipResponse?.status() === 404);
    const membershipHtml = await membership.content();
    check("membership is not in the public menu", !membershipHtml.includes(">Membership<"));
    await membership.close();

    const beforeQuestion = Date.now();
    const elena = await freshPage(browser);
    await login(elena, "elena.rossi@example.invalid", "example-password");
    const active = await app.query<{ email: string }>(`SELECT email FROM profiles WHERE status = 'active' ORDER BY email`);
    await goto(elena, `${BASE}/area/questions/new`);
    await elena.locator("#title").fill("Verify question about warranty notes");
    await elena.locator("#body").fill("Example question posted during local verification.");
    await clickButton(elena, "Post the question");
    await elena.waitForFunction(() => /\/area\/questions\/[0-9a-f-]{36}/.test(location.pathname), { timeout: 30000 });
    const questionUrl = elena.url().split("?")[0];
    const questionMails = (await emailsSince(beforeQuestion)).filter((mail) => mail.subject.startsWith("Question:"));
    const expected = new Set(active.rows.map((row) => row.email));
    expected.delete("elena.rossi@example.invalid");
    const mailed = new Set(questionMails.flatMap((mail) => mail.to));
    check(
      "a new question emails every other active member",
      questionMails.length > 0 && [...expected].every((email) => mailed.has(email)) && !mailed.has("elena.rossi@example.invalid"),
      `expected ${[...expected].join(", ")}, got ${[...mailed].join(", ")}`,
    );

    await goto(admin, questionUrl);
    await admin.locator("#body").fill("Example reply from the chair during verification.");
    await clickButton(admin, "Reply");
    await admin.waitForFunction(() => document.body.innerText.includes("Example reply from the chair"), { timeout: 20000 });
    const replyMail = (await emailsSince(beforeQuestion)).find((mail) => mail.subject.startsWith("Reply:"));
    check("a reply emails the member who opened the question", Boolean(replyMail?.to.includes("elena.rossi@example.invalid")));
    check("a reply does not email the person who wrote it", !replyMail?.to.includes("paolo.piccirilli@example.invalid"));

    const beforeVote = Date.now();
    await goto(admin, `${BASE}/area/votes/new`);
    await admin.locator("#subject").fill("Verify frozen electorate");
    await admin.locator("#description").fill("Example vote opened during verification. The electorate freezes now.");
    await admin.$eval("#deadline", (element) => (element as HTMLInputElement).removeAttribute("min"));
    await admin.locator("#deadline").fill(romeInput(3600));
    await admin.locator("#quorum_constitutive").fill("50");
    await admin.locator("#quorum_deliberative").fill("50");
    await clickButton(admin, "Open the vote");
    await admin.waitForFunction(() => location.search.includes("error"), { timeout: 20000 });
    check("a vote shorter than 48 hours is refused", (await admin.content()).includes("longer than 48 hours"));
    await admin.locator("#subject").fill("Verify frozen electorate");
    await admin.locator("#description").fill("Example vote opened during verification. The electorate freezes now.");
    await admin.$eval("#deadline", (element) => (element as HTMLInputElement).removeAttribute("min"));
    await admin.locator("#deadline").fill(romeInput(49 * 3600 + 120));
    await admin.locator("#quorum_constitutive").fill("50");
    await admin.locator("#quorum_deliberative").fill("50");
    await clickButton(admin, "Open the vote");
    await admin.waitForFunction(() => /\/area\/votes\/[0-9a-f-]{36}/.test(location.pathname), { timeout: 30000 });
    const frozenVoteId = new URL(admin.url()).pathname.split("/").pop()!;
    const openMails = (await emailsSince(beforeVote)).filter((mail) => mail.subject.startsWith("Vote open:"));
    const openTo = new Set(openMails.flatMap((mail) => mail.to));

    const electorate = await app.query<{ email: string }>(
      `SELECT p.email FROM vote_electorate e JOIN profiles p ON p.id = e.profile_id WHERE e.vote_id = $1`,
      [frozenVoteId],
    );
    const frozenEmails = electorate.rows.map((row) => row.email);
    check(
      "opening a vote emails the other eligible members",
      frozenEmails.filter((email) => email !== "paolo.piccirilli@example.invalid").every((email) => openTo.has(email)),
      [...openTo].join(", "),
    );
    check("opening a vote does not email the admin who opened it", !openTo.has("paolo.piccirilli@example.invalid"));
    check("new active member is on the frozen list", frozenEmails.includes("verify.member@example.invalid"));
    check("deactivated Clara is not on a vote opened after she left", !frozenEmails.includes("clara.example@example.invalid"));

    await goto(admin, `${BASE}/area/admin`);
    await admin.locator("#name").fill("Late Example");
    await admin.locator("#email").fill("late.member@example.invalid");
    await clickButton(admin, "Send invite");
    await admin.waitForFunction(() => location.search.includes("invited"), { timeout: 20000 });
    const afterLate = await app.query(
      `SELECT 1 FROM vote_electorate e JOIN profiles p ON p.id = e.profile_id
       WHERE e.vote_id = $1 AND p.email = 'late.member@example.invalid'`,
      [frozenVoteId],
    );
    check("a member invited after the vote opens is not eligible", afterLate.rowCount === 0);

    const closedCode = await app.query<{ eligible: string }>(
      `SELECT count(*)::int AS eligible FROM vote_electorate e
       JOIN votes v ON v.id = e.vote_id
       WHERE v.subject = 'Adoption of the code of conduct'`,
    );
    check("the earlier closed vote still includes Clara", Number(closedCode.rows[0].eligible) === 8);

    await goto(admin, `${BASE}/area/votes/${frozenVoteId}`);
    const adminOpen = visibleText(await admin.content());
    check(
      "an open vote shows the roll and who has not yet voted",
      adminOpen.includes("Roll call") && /0 of \d+ voted/.test(adminOpen) && adminOpen.includes("outstanding"),
      adminOpen.includes("Roll call") ? "count or reminder text did not match" : "roll call missing",
    );
    await goto(elena, `${BASE}/area/votes/${frozenVoteId}`);
    const openHtml = await elena.content();
    check("the open vote names eligible members", openHtml.includes("Paolo Piccirilli") && openHtml.includes("Verify Example"));
    const beforeRemind = Date.now();
    await goto(admin, `${BASE}/area/votes/${frozenVoteId}`);
    await admin.locator("button.nudge").click();
    await admin.waitForFunction(() => location.search.includes("reminded"), { timeout: 20000 });
    const remindMail = (await emailsSince(beforeRemind)).find((mail) => mail.subject.startsWith("Reminder:"));
    check("the admin can remind members who have not voted", Boolean(remindMail && remindMail.to.length > 0));

    await cast(admin, frozenVoteId, "For");
    await goto(elena, `${BASE}/area/votes/${frozenVoteId}`);
    const named = await elena.content();
    check("the vote is open: the choice is visible", named.includes("Paolo Piccirilli") && named.includes("For"));

    const longDeadline = romeInput(49 * 3600 + 300);
    const invalidId = await openShortVote(admin, {
      subject: "Verify constitutive quorum fails",
      deadline: longDeadline,
      qc: "90",
      qd: "50",
    });
    const notCarriedId = await openShortVote(admin, {
      subject: "Verify deliberative quorum counts abstentions",
      deadline: longDeadline,
      qc: "1",
      qd: "60",
    });
    const carriedId = await openShortVote(admin, {
      subject: "Verify both quorums met",
      deadline: longDeadline,
      qc: "1",
      qd: "50",
    });
    await cast(admin, invalidId, "For");
    await cast(admin, notCarriedId, "For");
    await cast(elena, notCarriedId, "Abstain");
    await cast(admin, carriedId, "For");
    await cast(joiner, carriedId, "For");
    await expireVote(owner, invalidId);
    await expireVote(owner, notCarriedId);
    await expireVote(owner, carriedId);
    const cron = await fetch(`${BASE}/api/jobs/close-votes`, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    check("close-votes job accepts the cron secret", cron.ok, String(cron.status));

    await assertOutcome(app, invalidId, "invalid");
    await assertOutcome(app, notCarriedId, "not_carried");
    await assertOutcome(app, carriedId, "carried");

    const cookies = await admin.cookies();
    const cookie = cookies.map((item) => `${item.name}=${item.value}`).join("; ");
    const record = await fetch(`${BASE}/api/votes/${invalidId}/record`, { headers: { cookie } });
    const recordBytes = Buffer.from(await record.arrayBuffer());
    const recordText = pdfText(recordBytes);
    check("closed vote PDF downloads", record.ok && recordBytes.subarray(0, 4).toString() === "%PDF");
    check(
      "PDF record names the subject, the voter and the invalid outcome",
      recordText.includes("Verify constitutive quorum fails") &&
        recordText.includes("Paolo Piccirilli") &&
        recordText.includes("Invalid"),
      recordText.slice(0, 240),
    );

    const seededInvalid = await app.query<{ id: string }>(
      `SELECT id FROM votes WHERE subject = 'Example: quorum not met'`,
    );
    const seededPdf = await fetch(`${BASE}/api/votes/${seededInvalid.rows[0].id}/record`, { headers: { cookie } });
    const seededText = pdfText(Buffer.from(await seededPdf.arrayBuffer()));
    check(
      "seeded invalid vote record states why it did not pass",
      seededText.includes("Invalid") &&
        seededText.includes("Constitutive quorum not reached") &&
        seededText.includes("Example: quorum not met"),
    );

    await immutability(app, owner, invalidId);

    const docs = await app.query<{ id: string }>(`SELECT id FROM documents LIMIT 2`);
    const bulkBody = new FormData();
    for (const doc of docs.rows) bulkBody.append("ids", doc.id);
    const bulk = await fetch(`${BASE}/api/documents/bulk`, { method: "POST", headers: { cookie }, body: bulkBody });
    const bulkZip = await JSZip.loadAsync(Buffer.from(await bulk.arrayBuffer()));
    check("bulk download is a zip of the selected documents", bulk.ok && Object.keys(bulkZip.files).length >= 2, String(bulk.status));

    const full = await fetch(`${BASE}/api/export`, { headers: { cookie } });
    const fullZip = await JSZip.loadAsync(Buffer.from(await full.arrayBuffer()));
    const names = Object.keys(fullZip.files);
    check("full export includes the resolutions register", names.includes("resolutions/register.json"));
    check(
      "full export includes document versions and vote records",
      names.some((name) => name.startsWith("documents/register/")) && names.some((name) => name.startsWith("resolutions/") && name.endsWith(".pdf")),
    );
    const register = JSON.parse(await fullZip.file("resolutions/register.json")!.async("string"));
    check("register export lists the invalid outcome", register.resolutions.some((row: { outcome: string }) => row.outcome === "invalid"));

    await admin.close();
    await elena.close();
    await joiner.close();
  } finally {
    await browser.close();
    await app.end();
    await owner.end();
  }

  if (failures.length) {
    console.error(`\n${failures.length} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll checks passed.");
}

async function snapshotIds(pool: Pool): Promise<{ question: string; openVote: string; invalidVote: string }> {
  const question = await pool.query<{ id: string }>(`SELECT id FROM questions WHERE title = 'Annual meeting — venue options'`);
  const openVote = await pool.query<{ id: string }>(`SELECT id FROM votes WHERE subject = 'Admission of a nominated candidate'`);
  const invalidVote = await pool.query<{ id: string }>(`SELECT id FROM votes WHERE subject = 'Example: quorum not met'`);
  return { question: question.rows[0].id, openVote: openVote.rows[0].id, invalidVote: invalidVote.rows[0].id };
}

async function screenshots(browser: Browser, ids: { question: string; openVote: string; invalidVote: string }): Promise<void> {
  const page = await freshPage(browser);
  const publicRoutes: [string, string][] = [
    ["/", "home"],
    ["/about", "about"],
    ["/members", "members"],
    ["/publications", "publications"],
    ["/login", "login"],
  ];
  for (const [route, name] of publicRoutes) {
    await goto(page, `${BASE}${route}`);
    await shot(page, `${name}-desktop`, 1440);
    await shot(page, `${name}-mobile`, 390);
  }
  await login(page, "paolo.piccirilli@example.invalid", "example-password");
  const areaRoutes: [string, string][] = [
    ["/area", "dashboard"],
    ["/area/documents", "documents"],
    [`/area/questions/${ids.question}`, "question"],
    [`/area/votes/${ids.openVote}`, "vote-open"],
    [`/area/votes/${ids.invalidVote}`, "vote-invalid"],
    ["/area/how-it-works", "how-it-works"],
  ];
  for (const [route, name] of areaRoutes) {
    await goto(page, `${BASE}${route}`);
    await shot(page, `${name}-desktop`, 1440);
    await shot(page, `${name}-mobile`, 390);
  }
  await goto(page, `${BASE}/area`);
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.click("button.bell-btn");
  await page.waitForSelector(".bell-panel");
  await page.screenshot({ path: path.join(SHOTS, "notifications-desktop.png"), fullPage: true });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.screenshot({ path: path.join(SHOTS, "notifications-mobile.png"), fullPage: true });
  await page.close();
  console.log(`Screenshots written to ${SHOTS}`);
}

async function expireVote(owner: Pool, id: string): Promise<void> {
  const client = await owner.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT set_config('nocap.closing_vote', 'on', true)`);
    await client.query(
      `UPDATE votes SET deadline = now() - interval '1 minute' WHERE id = $1 AND status = 'open'`,
      [id],
    );
    await client.query("COMMIT");
  } finally {
    client.release();
  }
}

async function openShortVote(
  page: Page,
  options: { subject: string; deadline: string; qc: string; qd: string },
): Promise<string> {
  await goto(page, `${BASE}/area/votes/new`);
  await page.locator("#subject").fill(options.subject);
  await page.locator("#description").fill("Example vote used to check automatic close and the two quorums.");
  await page.locator("#deadline").fill(options.deadline);
  await page.locator("#quorum_constitutive").fill(options.qc);
  await page.locator("#quorum_deliberative").fill(options.qd);
  await clickButton(page, "Open the vote");
  await page.waitForFunction(() => /\/area\/votes\/[0-9a-f-]{36}/.test(location.pathname), { timeout: 30000 });
  return new URL(page.url()).pathname.split("/").pop()!;
}

async function cast(page: Page, voteId: string, label: "For" | "Against" | "Abstain"): Promise<void> {
  await goto(page, `${BASE}/area/votes/${voteId}`);
  await page.locator(`button::-p-text(${label})`).click();
  await page.waitForFunction(
    (text) => document.body.innerText.includes(`Recorded: ${text}`),
    { timeout: 20000 },
    label,
  );
}

async function assertOutcome(pool: Pool, id: string, outcome: string): Promise<void> {
  const { rows } = await pool.query<{ status: string; outcome: string; constitutive_met: boolean; deliberative_met: boolean }>(
    `SELECT status, outcome, constitutive_met, deliberative_met FROM votes WHERE id = $1`,
    [id],
  );
  const row = rows[0];
  check(
    `vote ${outcome} closed with that outcome`,
    row?.status === "closed" && row.outcome === outcome,
    JSON.stringify(row),
  );
}

async function immutability(app: Pool, owner: Pool, voteId: string): Promise<void> {
  await expectDenied(app, `UPDATE votes SET subject = 'changed' WHERE id = '${voteId}'`, "app role cannot update a closed vote");
  await expectDenied(owner, `UPDATE votes SET subject = 'changed' WHERE status = 'closed'`, "owner cannot update a closed vote");
  await expectDenied(owner, `DELETE FROM resolutions`, "owner cannot delete a resolution");
  await expectDenied(app, `UPDATE ballots SET choice = 'against'`, "app role cannot change a ballot");
  await expectDenied(app, `DELETE FROM ballots`, "app role cannot delete a ballot");
  await expectDenied(
    app,
    `UPDATE profiles SET role = 'admin' WHERE email = 'elena.rossi@example.invalid'`,
    "app role cannot change a member role",
  );
  await expectDenied(app, `INSERT INTO vote_electorate (vote_id, profile_id) SELECT '${voteId}', id FROM profiles LIMIT 1`, "app role cannot edit the electorate");
  await expectDenied(owner, `DELETE FROM votes WHERE status = 'closed'`, "owner cannot delete a closed vote");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
