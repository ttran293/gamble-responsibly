import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy · Jelly",
  description: "How Jelly collects, uses, shares, and keeps personal information, and how to ask for access or deletion."
};

const sections = [
  ["who", "Who we are"],
  ["applies", "Who this notice applies to"],
  ["collect", "Information we collect"],
  ["use", "Why we use it"],
  ["bases", "Legal bases"],
  ["others", "Information from someone else"],
  ["recipients", "Who receives it"],
  ["cookies", "Cookies and on-device storage"],
  ["retention", "How long we keep it"],
  ["security", "Security"],
  ["rights", "Your choices and rights"],
  ["children", "Children"],
  ["transfers", "International transfers"],
  ["automated", "Automated processing"],
  ["changes", "Changes"],
  ["contact", "How to contact us"]
] as const;

export default function PrivacyPage() {
  return (
    <main className="privacy-page">
      <header className="nav">
        <Link className="brand" href="/"><img src="/jelly-logo.gif?v=3" alt="" />Jelly</Link>
        <nav className="home-nav" aria-label="Site">
          <Link href="/">Home</Link>
        </nav>
      </header>
      <article className="privacy-doc">
        <p className="eyebrow">Privacy notice</p>
        <h1>Privacy</h1>
        <p className="privacy-meta">Effective September 27, 2026</p>
        <p>This notice describes how Jelly handles personal information. It covers the elements an online privacy notice is expected to include under ISO/IEC 29184, the information GDPR Articles 13 and 14 require when personal data is collected, and the categories used in a California notice at collection. It describes this application as it works today.</p>

        <nav className="privacy-toc" aria-label="On this page">
          <ol>
            {sections.map(([id, label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}
          </ol>
        </nav>

        <section id="who">
          <h2>Who we are</h2>
          <p>Jelly is a private tool for tracking a gambling habit and a goal to gamble less or stop, and for inviting someone you care about to use it. The operator of this website is the controller of the personal information described here.</p>
          <p>We have not appointed a data protection officer or a representative in the European Union or the United Kingdom. The production site is <a href="https://gamble-responsibly.vercel.app">gamble-responsibly.vercel.app</a>.</p>
        </section>

        <section id="applies">
          <h2>Who this notice applies to</h2>
          <ul>
            <li>People who create an account or sign in</li>
            <li>People who send an invitation, and people whose email address is entered so an invitation can be sent</li>
            <li>People who use the public pages, including the demo</li>
            <li>People whose goal, habit details, or messages are saved in an account</li>
          </ul>
        </section>

        <section id="collect">
          <h2>Information we collect</h2>
          <p>We collect information you give us, information created when you use Jelly, and a small amount of technical information needed to run the service.</p>
          <h3>Information you provide</h3>
          <table className="privacy-table">
            <thead>
              <tr><th scope="col">Category</th><th scope="col">Examples</th><th scope="col">When</th></tr>
            </thead>
            <tbody>
              <tr><td>Identifiers</td><td>Name and email address</td><td>Account creation, sign-in, and invitations</td></tr>
              <tr><td>Credentials</td><td>A hash of your password. We do not store the password itself.</td><td>Account creation and password sign-in</td></tr>
              <tr><td>Goal and habit details</td><td>Goal, focus areas, types of gambling, frequency, triggers, pause action, a reduce target, and a stop date</td><td>When you save onboarding answers</td></tr>
              <tr><td>Demo activity choices</td><td>Selected sample apps and demo dataset version</td><td>When you save onboarding answers while signed in</td></tr>
              <tr><td>Limits and plan progress</td><td>Guardrail settings and notices you save, and checklist items you mark done</td><td>When you save them while signed in</td></tr>
              <tr><td>Messages</td><td>Chat messages you send, replies, and a safety flag such as crisis or betting advice</td><td>After you accept the chat disclosure</td></tr>
              <tr><td>Invitations</td><td>Sender name, sender email, recipient email, and an optional note</td><td>When someone requests an invitation</td></tr>
              <tr><td>Emergency contact</td><td>The link between an account and a contact, including the time consent was recorded</td><td>When you create an account from an invitation</td></tr>
            </tbody>
          </table>
          <h3>Information collected as you use Jelly</h3>
          <table className="privacy-table">
            <thead>
              <tr><th scope="col">Category</th><th scope="col">Examples</th><th scope="col">When</th></tr>
            </thead>
            <tbody>
              <tr><td>Session data</td><td>Session token, expiry, IP address, and browser user agent</td><td>When you sign in</td></tr>
              <tr><td>Email and sign-in records</td><td>Verification records, and magic-link tokens stored in hashed form</td><td>When we send those emails</td></tr>
              <tr><td>On-device demo storage</td><td>Demo connection choices and demo guardrail or insight choices in this browser</td><td>When you use the demo</td></tr>
            </tbody>
          </table>
          <h3>Sensitive information</h3>
          <p>Goal, habit, limit, and chat content can describe gambling behavior. Chat can also include distress or crisis. We treat that information as sensitive. We use it to provide Jelly to you. We do not use it for advertising, and we do not sell it.</p>
          <h3>What we do not collect for the demo</h3>
          <p>Jelly does not connect to a bank, sportsbook, or payment account. Charts and connected activity in the demo use synthetic fixture data, not your financial accounts. We do not use advertising or analytics cookies. We do not sell personal information, and we do not share it for cross-context behavioral advertising.</p>
        </section>

        <section id="use">
          <h2>Why we use it</h2>
          <ul>
            <li>Create and protect your account, and keep you signed in</li>
            <li>Save the goal, limits, and plan progress you choose</li>
            <li>Send email the product requires: address verification, a magic-link sign-in, a confirmation to the person who requested an invitation, the invitation after that person confirms, and an emergency-contact request to the person you ask</li>
            <li>Provide chat replies and check messages for crisis language, after you accept the chat disclosure</li>
            <li>Remember an emergency-contact relationship when you create an account from an invitation, or when someone you ask accepts a request to be your emergency contact</li>
            <li>Keep the service reliable and limit misuse of invitations</li>
            <li>Show demo fixtures, and remember demo choices on your device</li>
          </ul>
          <p>A name, email address, and password are required to create an account. You choose the habit details you enter. Features that depend on a goal, a limit, or chat need the information those features use. You can browse the public pages without an account. You can use Jelly without naming an emergency contact.</p>
        </section>

        <section id="bases">
          <h2>Legal bases</h2>
          <p>If the GDPR, UK GDPR, or Swiss data protection law applies, we rely on these bases:</p>
          <ul>
            <li><strong>Contract.</strong> Providing the account and the features you use.</li>
            <li><strong>Consent.</strong> Sending chat content, and a short summary of your goal, focus, triggers, and pause action, to OpenAI. Adding an emergency contact when you create an account from an invitation, or when you request one and they accept. Emailing an invitation at the sender's request. Emailing an emergency-contact request.</li>
            <li><strong>Legitimate interests.</strong> Securing accounts and sessions, and limiting misuse of invitations. Those interests are limited to running Jelly. They do not include advertising.</li>
          </ul>
          <p>You can withdraw chat consent by stopping use of chat and asking us to delete the thread. You can choose not to create an account from an invitation, and you can ignore an emergency-contact request. Withdrawal does not undo processing that has already happened.</p>
        </section>

        <section id="others">
          <h2>Information from someone else</h2>
          <p>If someone enters your email address to invite you, we receive that address, the sender’s name and email address, and any note they wrote, from the sender. We email you the invitation directly. The sender's email address has not been confirmed. You can ignore the invitation.</p>
          <p>Creating an account from the invitation is your choice. If you do, the sender becomes your emergency contact. They do not receive your habit record, spending, goal, dashboard, or chat.</p>
          <p>If someone with a Jelly account asks you to be their emergency contact, we email you their name, their email address, and a link. The link expires in 72 hours. You can ignore that email. If you accept, you do not receive their habit record, spending, goal, dashboard, or chat.</p>
        </section>

        <section id="recipients">
          <h2>Who receives it</h2>
          <p>Service providers process personal information for us, for the purposes in this notice.</p>
          <ul>
            <li><strong>Vercel</strong> hosts the application.</li>
            <li><strong>Timescale</strong> stores account and product data in the application database.</li>
            <li><strong>Resend</strong> delivers verification email, sign-in links, invitations, and emergency-contact requests.</li>
            <li><strong>OpenAI</strong> generates chat replies and checks message text for crisis language. We send your message and a summary of your goal, focus areas, triggers, and pause action. Chat completion requests are sent with storage disabled. We still keep the conversation in our database for the period below. OpenAI receives this information only after you accept the chat disclosure.</li>
            <li><strong>Google Fonts</strong> receives the IP address and browser data your browser sends when it loads the typeface used on these pages.</li>
          </ul>
          <p>An emergency contact does not get access to your habit record, spending, goal details, dashboard, or conversations. A notice to an emergency contact, if one is sent, is limited to the fact that you are struggling or asked to be contacted.</p>
          <p>We may disclose information if the law requires it, or to protect someone from imminent harm. We do not sell personal information.</p>
        </section>

        <section id="cookies">
          <h2>Cookies and on-device storage</h2>
          <ul>
            <li>A sign-in cookie keeps your session. A session lasts up to 30 days and can refresh while you use Jelly. “Stay signed in on this device” uses that session. The cookie is strictly necessary for a signed-in account.</li>
            <li>We do not set analytics or advertising cookies.</li>
            <li>The public demo may store connection choices in <code>sessionStorage</code> and guardrail or insight choices in <code>localStorage</code>. That data stays in your browser until you clear it. Public demo choices are not your account record.</li>
            <li>Sample dashboards on the public site are page content. They are not saved as your activity.</li>
          </ul>
        </section>

        <section id="retention">
          <h2>How long we keep it</h2>
          <ul>
            <li>Account, profile, guardrails, plan progress, and emergency-contact records are kept while the account exists, and removed when a deletion request is completed.</li>
            <li>Sessions end when they expire, normally within 30 days of the last refresh, or when you sign out.</li>
            <li>A magic-link sign-in expires after 10 minutes.</li>
            <li>An invitation expires after 72 hours unless it is accepted first. Confirmation links sent for older invitation requests expire after 24 hours.</li>
            <li>An emergency-contact request link expires after 72 hours unless it is accepted first.</li>
            <li>Chat threads and messages are deleted 90 days after the thread was last updated. You can ask us to delete them sooner.</li>
            <li>Demo data in the browser remains until you clear site data for this site.</li>
          </ul>
        </section>

        <section id="security">
          <h2>Security</h2>
          <p>The production site uses HTTPS. Passwords are stored as hashes. Invitation tokens, emergency-contact request tokens, and magic-link tokens are stored in hashed form. Reading account data requires a signed-in session. No method of storage or transmission is perfectly secure.</p>
        </section>

        <section id="rights">
          <h2>Your choices and rights</h2>
          <p>Depending on where you live, you can ask to access the personal information we hold, correct it, delete it, receive a portable copy, object to or restrict certain processing, withdraw consent, or appeal a refusal. If you are in the EEA, the United Kingdom, or Switzerland, you can also lodge a complaint with a data protection authority.</p>
          <p>California residents can ask for the categories and specific pieces of personal information we collected, the categories of sources, the business or commercial purposes, and the categories of third parties we disclosed it to. You can ask us to delete information and to correct inaccurate information. We do not sell or share personal information as those terms are used in the California Consumer Privacy Act. We do not use sensitive personal information to infer characteristics for advertising. We will not discriminate against you for making a request.</p>
          <p>Jelly does not yet offer a self-serve export or delete control in the product. Use the contact method below. We confirm a request with the email address on the account, or with the email address that received a Jelly message if you have no account. We may refuse a request when the law allows it, including when we cannot verify that it is yours.</p>
        </section>

        <section id="children">
          <h2>Children</h2>
          <p>Jelly is meant for adults. It is not directed to children under 13, and we do not knowingly collect personal information from a child under 13. If you believe a child under 13 has given us personal information, contact us and we will delete it.</p>
        </section>

        <section id="transfers">
          <h2>International transfers</h2>
          <p>We and our service providers may process information in the United States, where the host, database, email, and chat providers operate. If you use Jelly from another country, your information is transferred there. Privacy rules in those locations can differ from the rules where you live.</p>
        </section>

        <section id="automated">
          <h2>Automated processing</h2>
          <p>Plan text, activity checks, and chat safety classification describe information you entered or synthetic demo data. They can choose a fixed support reply. They do not block a sportsbook, move money, diagnose a condition, or produce a decision that has a legal or similarly significant effect. You decide what to do next.</p>
        </section>

        <section id="changes">
          <h2>Changes</h2>
          <p>We will post changes on this page and update the effective date. If a change needs new consent, we will ask before using your information in that new way.</p>
        </section>

        <section id="contact">
          <h2>How to contact us</h2>
          <p>To ask for access, correction, or deletion, contact the operator of Jelly from the email address on your account, with the subject “Privacy request,” so we can verify that the request is yours. If you do not have an account, use the email address that received the Jelly message and describe that message.</p>
          <p>A dedicated privacy address and a postal address are not published on this page. When a dedicated address is available, it will be listed here.</p>
          <p><Link href="/">Return to the homepage</Link></p>
        </section>
      </article>
    </main>
  );
}
