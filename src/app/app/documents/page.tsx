import { uploadDocumentAction } from "@/app/actions/documents";
import { FlashForm } from "@/components/FlashForm";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { q } = await searchParams;
  const query = (q || "").trim();

  const documents = await prisma.document.findMany({
    where: query ? { title: { contains: query } } : undefined,
    include: {
      versions: { orderBy: { version: "desc" }, include: { uploadedBy: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const official = documents.filter((d) => d.area === "OFFICIAL");
  const shared = documents.filter((d) => d.area === "SHARED");

  return (
    <main>
      <p className="text-xs tracking-[0.16em] text-[var(--ink-3)] uppercase">Documents</p>
      <h1 className="mt-2 text-4xl">The papers</h1>
      <p className="mt-3 max-w-xl text-[var(--ink-2)]">
        Official register — charter, code of conduct, minutes, resolutions — is
        uploaded by the administrator. The shared folder is for every member.
      </p>

      <form className="mt-8 flex flex-wrap gap-2" method="get">
        <input
          className="field max-w-sm"
          name="q"
          defaultValue={query}
          placeholder="Search by title"
        />
        <button className="rounded-full border border-[var(--rule)] px-4 py-2 text-sm" type="submit">
          Search
        </button>
        <a
          className="rounded-full border border-[var(--rule)] px-4 py-2 text-sm"
          href="/api/documents/bulk?area=OFFICIAL"
        >
          Download official
        </a>
        <a
          className="rounded-full border border-[var(--rule)] px-4 py-2 text-sm"
          href="/api/documents/bulk?area=SHARED"
        >
          Download shared
        </a>
      </form>

      <Section
        title="Official register"
        hint="Admin upload only. All members can read and download."
        docs={official}
        canUpload={user.role === "ADMIN"}
        area="OFFICIAL"
      />
      <Section
        title="Shared folder"
        hint="All members upload and read."
        docs={shared}
        canUpload
        area="SHARED"
      />
    </main>
  );
}

function Section({
  title,
  hint,
  docs,
  canUpload,
  area,
}: {
  title: string;
  hint: string;
  docs: {
    id: string;
    title: string;
    area: string;
    versions: {
      id: string;
      version: number;
      filename: string;
      storagePath: string;
      createdAt: Date;
      uploadedBy: { name: string };
    }[];
  }[];
  canUpload: boolean;
  area: "OFFICIAL" | "SHARED";
}) {
  return (
    <section className="mt-12">
      <h2 className="text-2xl">{title}</h2>
      <p className="mt-1 text-sm text-[var(--ink-3)]">{hint}</p>
      {canUpload ? (
        <FlashForm action={uploadDocumentAction} className="mt-5 grid max-w-xl gap-3" success="Uploaded.">
          <input type="hidden" name="area" value={area} />
          <input className="field" name="title" placeholder="Title" required />
          <input className="field" type="file" name="file" required />
          <button type="submit" className="inline-flex w-fit rounded-full bg-[var(--ink)] px-4 py-2 text-sm text-[var(--paper)]">
            Upload
          </button>
        </FlashForm>
      ) : null}
      <ul className="mt-6 divide-y divide-[var(--rule)] border-y border-[var(--rule)]">
        {docs.length === 0 ? (
          <li className="py-5 text-sm text-[var(--ink-3)]">Nothing here yet.</li>
        ) : (
          docs.map((doc) => {
            const latest = doc.versions[0];
            return (
              <li key={doc.id} className="py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg">{doc.title}</h3>
                    {latest ? (
                      <p className="mt-1 text-sm text-[var(--ink-3)]">
                        v{latest.version} · {latest.filename} · {latest.uploadedBy.name} ·{" "}
                        {formatDateTime(latest.createdAt)}
                      </p>
                    ) : null}
                  </div>
                  {latest ? (
                    <a
                      className="text-sm underline"
                      href={`/api/files/${latest.storagePath}?download=1`}
                    >
                      Download
                    </a>
                  ) : null}
                </div>
                {doc.versions.length > 1 ? (
                  <details className="mt-2 text-sm text-[var(--ink-2)]">
                    <summary>Earlier versions</summary>
                    <ul className="mt-2 space-y-1">
                      {doc.versions.slice(1).map((v) => (
                        <li key={v.id}>
                          <a className="underline" href={`/api/files/${v.storagePath}?download=1`}>
                            v{v.version} {v.filename}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
                {canUpload ? (
                  <FlashForm action={uploadDocumentAction} className="mt-3 flex flex-wrap items-center gap-2" success="New version stored.">
                    <input type="hidden" name="area" value={area} />
                    <input type="hidden" name="documentId" value={doc.id} />
                    <input className="field max-w-xs" type="file" name="file" required />
                    <button type="submit" className="text-sm underline">
                      Add version
                    </button>
                  </FlashForm>
                ) : null}
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
