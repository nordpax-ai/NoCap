export const metadata = { title: "Privacy policy" };

const CONTACT = "piccirillifrancescopaolo@gmail.com";

export default function PrivacyPage() {
  return (
    <div className="wrap inner">
      <div className="eyebrow">Privacy</div>
      <h1 className="pt">Privacy policy</h1>
      <p className="updated-line">Last updated: 12 October 2026</p>
      <div className="prose">
        <h2>1. Controller</h2>
        <p>
          The controller of personal data is nocap (the “Club”), an informal association governed by Italian law.
          Contact: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. Website:{" "}
          <a href="https://nocap-law.com">https://nocap-law.com</a>.
        </p>
        <p>
          This policy covers the Club’s website, its members’ area and its public channels, including the Club’s LinkedIn page.
        </p>

        <h2>2. Personal data processed</h2>
        <ul>
          <li>
            <strong>Visitors to the website:</strong> technical data needed to deliver the website, including IP address, browser data and access logs.
          </li>
          <li>
            <strong>Members:</strong> name, e-mail address, firm, role, jurisdiction, photograph, biography, professional profile links, log-in data, votes, participation in the Club’s activities and content submitted through the members’ area.
          </li>
          <li>
            <strong>Nominees and applicants:</strong> the data provided in the nomination or application form: name, e-mail address, firm, role, jurisdiction, professional profile link and the reasons for the nomination or application.
          </li>
          <li>
            <strong>Persons who contact the Club:</strong> the data contained in their communications.
          </li>
        </ul>
        <p>The Club does not request special categories of personal data.</p>

        <h2>3. Purposes and legal bases</h2>
        <table>
          <thead>
            <tr>
              <th>Purpose</th>
              <th>Legal basis (GDPR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Operating the website and the members’ area, including their security</td>
              <td>Legitimate interest, art. 6(1)(f)</td>
            </tr>
            <tr>
              <td>Managing membership: admission, renewal, votes, meetings and communications to members</td>
              <td>Performance of the membership agreement, art. 6(1)(b)</td>
            </tr>
            <tr>
              <td>Publishing, under the member’s name, the pieces written under the editorial rota</td>
              <td>Performance of the membership agreement, art. 6(1)(b)</td>
            </tr>
            <tr>
              <td>Assessing applications</td>
              <td>Steps taken at the applicant’s request, art. 6(1)(b)</td>
            </tr>
            <tr>
              <td>Assessing nominations made by members</td>
              <td>Legitimate interest of the Club in assessing candidates, art. 6(1)(f)</td>
            </tr>
            <tr>
              <td>Publishing a member’s name, photograph, biography and other content concerning them on the Club’s public website and channels</td>
              <td>Consent, art. 6(1)(a), given separately for each item or category of content and revocable at any time</td>
            </tr>
            <tr>
              <td>Complying with legal obligations</td>
              <td>Legal obligation, art. 6(1)(c)</td>
            </tr>
          </tbody>
        </table>
        <p>Personal data is not used for marketing or profiling, and no decision is taken solely by automated means.</p>

        <h2>4. Data of nominees</h2>
        <p>
          Where a member nominates a candidate, the Club receives the candidate’s data from that member. The Club provides the candidate with this policy when it first contacts them, and in any case within one month of receiving the nomination. A candidate who does not wish to be considered may ask for their data to be erased.
        </p>

        <h2>5. Recipients</h2>
        <ul>
          <li>
            <strong>Members:</strong> profile data is visible to the other members in the members’ area and may be used only for the purposes of the Club.
          </li>
          <li>The Co-Chairmen and the Secretary, for the administration of the Club.</li>
          <li>A web agency, which manages the website and the Club’s LinkedIn page, as processor under a data processing agreement.</li>
          <li>Hosting, database and e-mail delivery providers, as processors or sub-processors.</li>
          <li>LinkedIn, for content published on the Club’s page, which LinkedIn processes as an independent controller under its own policy.</li>
          <li>Public authorities, where required by law.</li>
        </ul>
        <p>Personal data is not sold or otherwise made available to third parties.</p>

        <h2>6. Transfers outside the EEA</h2>
        <p>
          The database is hosted in the European Union (Supabase, Frankfurt, EU). Some of the Club’s providers are established in the United States, and data may be accessed from or transferred there. Such transfers rely on the European Commission’s adequacy decision for the EU-U.S. Data Privacy Framework, where the recipient is certified, or on the standard contractual clauses adopted by the Commission. A copy of the relevant safeguards is available on request.
        </p>

        <h2>7. Retention</h2>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Retention</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Members’ data</td>
              <td>For the duration of membership and 12 months after it ends</td>
            </tr>
            <tr>
              <td>Minutes and outcome of votes</td>
              <td>For the life of the Club, as part of its records</td>
            </tr>
            <tr>
              <td>Nominations and applications not followed by admission</td>
              <td>6 months from the decision</td>
            </tr>
            <tr>
              <td>Content published with consent</td>
              <td>Until consent is withdrawn</td>
            </tr>
            <tr>
              <td>Technical logs</td>
              <td>30 days</td>
            </tr>
          </tbody>
        </table>
        <p>Data may be kept longer where required by law.</p>

        <h2>8. Your rights</h2>
        <p>
          You may ask the Club for access to your data, its rectification or erasure, the restriction of its processing and its portability. You may object to processing based on legitimate interest, and withdraw consent at any time without affecting processing carried out before withdrawal. Requests go to{" "}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
        <p>
          You may also lodge a complaint with the Garante per la protezione dei dati personali (www.garanteprivacy.it) or with the supervisory authority of the country where you live or work, or where the alleged infringement took place.
        </p>

        <h2>9. Cookies</h2>
        <p>
          The website uses only technical cookies necessary for its operation and for logging in to the members’ area (session cookie). These cookies do not require consent and are not used for profiling, analytics or tracking.
        </p>

        <h2>10. Changes to this policy</h2>
        <p>
          The Club may update this policy. The current version is published on the website with the date of its last update, and material changes are notified to members through the members’ area.
        </p>
      </div>
    </div>
  );
}
