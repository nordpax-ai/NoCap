import PDFDocument from "pdfkit";
import { formatDateTime } from "./utils";
import { recordLabel, type VoteChoice, type VoteOutcome } from "./votes";

type PdfInput = {
  object: string;
  description: string;
  openedAt: Date;
  deadline: Date;
  closedAt: Date | null;
  constitutivePercent: number;
  deliberativePercent: number;
  outcome: VoteOutcome;
  eligible: { name: string }[];
  ballots: { name: string; choice: VoteChoice; createdAt: Date }[];
};

export function renderVotePdf(input: PdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 56 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(11).fillColor("#16181C").text("nocap — resolutions register", { align: "left" });
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor("#5A5F68").text("Downloadable record. The system shows the outcome; it does not interpret it.");
    doc.moveDown(1.2);

    doc.fontSize(16).fillColor("#16181C").text(input.object);
    doc.moveDown(0.6);
    doc.fontSize(10).fillColor("#16181C").text(input.description, { align: "left" });
    doc.moveDown(1);

    doc.fontSize(9).fillColor("#5A5F68");
    doc.text(`Opened: ${formatDateTime(input.openedAt)}`);
    doc.text(`Deadline: ${formatDateTime(input.deadline)}`);
    if (input.closedAt) doc.text(`Closed: ${formatDateTime(input.closedAt)}`);
    doc.moveDown(1);

    doc.fontSize(11).fillColor("#16181C").text("Quorums (set at open)");
    doc.moveDown(0.3);
    doc.fontSize(10);
    doc.text(
      `Constitutive: ${input.constitutivePercent}% of eligible must have voted (abstentions count as participation).`,
    );
    doc.text(`Deliberative: ${input.deliberativePercent}% in favour among votes cast.`);
    doc.moveDown(0.8);

    const o = input.outcome;
    doc.fontSize(11).text("Shown outcome");
    doc.moveDown(0.3);
    doc.fontSize(10);
    doc.text(`Eligible: ${o.eligibleCount}`);
    doc.text(`Voted: ${o.voted}  ·  Not voted: ${o.notVoted}`);
    doc.text(`For: ${o.forCount}  ·  Against: ${o.againstCount}  ·  Abstain: ${o.abstainCount}`);
    doc.text(
      `Participation: ${o.participationPercent.toFixed(1)}%  — constitutive ${o.constitutiveMet ? "met" : "not met"}`,
    );
    doc.text(
      `In favour among votes cast: ${o.inFavourPercent.toFixed(1)}%  — deliberative ${o.deliberativeMet ? "met" : "not met"}`,
    );
    doc.moveDown(0.4);
    doc.fontSize(11).text(`Record: ${recordLabel(o.record)}`);
    doc.moveDown(1.2);

    doc.fontSize(11).text("Eligible voters (frozen at open)");
    doc.moveDown(0.3);
    doc.fontSize(10);
    for (const person of input.eligible) {
      doc.text(`• ${person.name}`);
    }
    doc.moveDown(1);

    doc.fontSize(11).text("Named votes");
    doc.moveDown(0.3);
    doc.fontSize(10);
    if (input.ballots.length === 0) {
      doc.text("No ballots recorded.");
    } else {
      for (const ballot of input.ballots) {
        doc.text(`${ballot.name} — ${ballot.choice} — ${formatDateTime(ballot.createdAt)}`);
      }
    }

    doc.end();
  });
}
