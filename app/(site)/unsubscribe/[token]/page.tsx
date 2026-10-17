import Link from "next/link";
import { pool } from "@/lib/db";
import { readUnsubscribeToken } from "@/lib/unsubscribe";

export const metadata = { title: "Unsubscribe" };
export const dynamic = "force-dynamic";

export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const profileId = readUnsubscribeToken(token);
  let done = false;
  if (profileId) {
    const { rowCount } = await pool.query(`UPDATE profiles SET email_notifications = false WHERE id = $1`, [profileId]);
    done = (rowCount ?? 0) > 0;
  }
  return (
    <div className="wrap inner">
      <div className="mb-form">
        <div className="eyebrow">Private area</div>
        <h1 className="pt">{done ? "You are unsubscribed" : "Link not valid"}</h1>
        <p className="note">
          {done
            ? "You will no longer get notification emails. The bell in the members' area still shows them."
            : "This unsubscribe link is not valid. You can change email settings in your profile."}
        </p>
        <p className="file-note" style={{ marginTop: 18 }}>
          <Link href="/area/profile#email">Turn emails back on in your profile</Link>
        </p>
      </div>
    </div>
  );
}
