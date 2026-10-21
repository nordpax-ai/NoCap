import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { saveAssignment } from "@/lib/article-actions";
import type { Assignment } from "@/lib/articles";

export function AssignmentForm({
  members,
  assignment,
}: {
  members: { id: string; display_name: string }[];
  assignment?: Assignment;
}) {
  return (
    <ActionForm action={saveAssignment} className="stack">
      {assignment ? <input type="hidden" name="assignment_id" value={assignment.id} /> : null}
      <div>
        <label className="lbl" htmlFor="member_id">Member</label>
        <select id="member_id" name="member_id" defaultValue={assignment?.member_id} required>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.display_name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="lbl" htmlFor="plan_month">Plan month</label>
        <input id="plan_month" name="plan_month" type="number" min={1} max={24} defaultValue={assignment?.plan_month ?? 1} required />
      </div>
      <div>
        <label className="lbl" htmlFor="theme">Theme / title brief</label>
        <input id="theme" name="theme" defaultValue={assignment?.theme} required />
      </div>
      <div>
        <label className="lbl" htmlFor="format_notes">Format notes</label>
        <input id="format_notes" name="format_notes" defaultValue={assignment?.format_notes ?? ""} />
      </div>
      <div>
        <label className="lbl" htmlFor="guidance">Guidance / structure</label>
        <textarea id="guidance" name="guidance" rows={10} defaultValue={assignment?.guidance ?? ""} />
      </div>
      <div>
        <label className="lbl" htmlFor="due_date">Text due</label>
        <input id="due_date" name="due_date" type="date" defaultValue={assignment?.due_date} required />
      </div>
      <div>
        <label className="lbl" htmlFor="publication_date">Publication date</label>
        <input id="publication_date" name="publication_date" type="date" defaultValue={assignment?.publication_date} required />
      </div>
      {assignment ? null : (
        <label className="choice-line">
          <input type="checkbox" name="notify" value="on" defaultChecked />
          <span>Notify the member now (bell and email)</span>
        </label>
      )}
      <SubmitButton className="btn solid">{assignment ? "Save assignment" : "Create assignment"}</SubmitButton>
    </ActionForm>
  );
}
