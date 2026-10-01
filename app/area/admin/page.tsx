import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { inviteMember, setMemberStatus } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { pool } from "@/lib/db";

export const metadata = { title: "Admin" };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string; invited?: string }> }) {
  await requireAdmin();
  const { error, invited } = await searchParams;
  const { rows } = await pool.query<{
    id: string;
    display_name: string;
    email: string;
    role: string;
    status: string;
  }>(`SELECT id, display_name, email, role, status FROM profiles ORDER BY status, display_name`);
  return (
    <>
      <h1 className="page-title">Members</h1>
      <p className="help">One admin role, shared by the chair and the technical lead. Invite a member and they receive a link to set a password. Deactivating someone hides them from the public page. Their questions, comments and votes stay.</p>
      {invited ? <p className="banner">Invite sent.</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <ActionForm action={inviteMember} className="stack">
        <div>
          <label className="lbl" htmlFor="name">Name</label>
          <input id="name" name="name" required />
        </div>
        <div>
          <label className="lbl" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required />
        </div>
        <SubmitButton className="btn solid">Send invite</SubmitButton>
      </ActionForm>
      <table style={{ marginTop: 28 }}>
        <thead>
          <tr><th>Name</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {rows.map((member) => (
            <tr key={member.id}>
              <td>
                {member.display_name}
                <div className="by">{member.email} · {member.role}</div>
              </td>
              <td>{member.status}</td>
              <td>
                {member.status === "active" ? (
                  <ActionForm action={setMemberStatus}>
                    <input type="hidden" name="profile_id" value={member.id} />
                    <input type="hidden" name="status" value="deactivated" />
                    <SubmitButton className="act">Deactivate</SubmitButton>
                  </ActionForm>
                ) : null}
                {member.status === "deactivated" ? (
                  <ActionForm action={setMemberStatus}>
                    <input type="hidden" name="profile_id" value={member.id} />
                    <input type="hidden" name="status" value="active" />
                    <SubmitButton className="act">Reactivate</SubmitButton>
                  </ActionForm>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: 22 }}><a href="/area/publications/new">Add a publication</a></p>
      <p><a href="/area/applications">Applications</a></p>
      <p><a href="/area/admin/outbox">Email outbox</a></p>
    </>
  );
}
