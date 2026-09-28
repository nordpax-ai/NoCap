export const metadata = { title: "Export" };

export default function ExportPage() {
  return (
    <>
      <h1 className="page-title">Export</h1>
      <p className="help">
        Download every document, in every version, and the resolutions register. The archive is a zip of files and a JSON copy of the votes. It does not depend on the host once you have it.
      </p>
      <a className="btn solid" href="/api/export">Download everything</a>
    </>
  );
}
