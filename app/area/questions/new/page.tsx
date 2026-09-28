import { askQuestion } from "@/lib/actions";

export const metadata = { title: "Ask a question" };

export default async function NewQuestionPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <>
      <h1 className="page-title">Ask a question</h1>
      <p className="help">Every active member is emailed when you post. A deadline is optional. Replies email the people already in the thread.</p>
      {error ? <p className="error">{error}</p> : null}
      <form action={askQuestion} className="stack">
        <div>
          <label className="lbl" htmlFor="title">Title</label>
          <input id="title" name="title" required />
        </div>
        <div>
          <label className="lbl" htmlFor="body">Note</label>
          <textarea id="body" name="body" required />
        </div>
        <div>
          <label className="lbl" htmlFor="deadline">Deadline, optional</label>
          <input id="deadline" name="deadline" type="datetime-local" step={1} />
        </div>
        <div>
          <label className="lbl" htmlFor="attachments">Attachments</label>
          <input id="attachments" name="attachments" type="file" multiple />
        </div>
        <button className="btn solid" type="submit">Post the question</button>
      </form>
    </>
  );
}
