import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = { title: "Privacy and your data" };

const UPDATED = "17 October 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="space-y-2 text-[15px] leading-relaxed text-muted [&_strong]:font-semibold [&_strong]:text-ink">{children}</div>
    </section>
  );
}

/** The privacy notice: what Polaris keeps, what it sends to the AI, and the owner's controls. */
export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-8 px-4 py-10 sm:px-6">
      <header className="space-y-3">
        <p className="flex items-center gap-2 eyebrow text-star-400">
          <ShieldCheck className="size-4" aria-hidden /> Privacy notice
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-balance">Privacy and your data</h1>
        <p className="mt-2 text-sm text-faint">Last updated {UPDATED}</p>
      </header>

      <div className="panel space-y-2 p-5 text-[15px] leading-relaxed">
        <p className="font-semibold">The short version</p>
        <ul className="list-disc space-y-1.5 pl-5 text-muted">
          <li>Your business data stays in this browser. Polaris has no accounts and no database.</li>
          <li>When you use an AI feature, the details it needs are sent to NVIDIA Nemotron models on Nebius to write the answer.</li>
          <li>No ads, no trackers, and your data is never sold. You can back it up or delete it at any time.</li>
        </ul>
      </div>

      <Section title="What Polaris keeps, and where">
        <p>
          Your business profile, money records, products and costs, missions, saved studio ideas and chats with Lumi are
          saved in <strong>this browser on this device</strong>. They aren&apos;t uploaded to an account, so they don&apos;t
          follow you to another device, and anyone who uses this browser can see them.
        </p>
        <p>
          Clearing this browser&apos;s site data deletes them for good. Use <strong>Your data → Download a backup</strong> to keep
          a copy.
        </p>
      </Section>

      <Section title="What goes to the AI, and when">
        <p>Only when you use a feature that needs it, and only for that answer:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Chatting with Lumi:</strong> your messages, your business name and description, your level, a summary of your
            money and missions, and the page you&apos;re on. On a money tab this includes that month&apos;s sheet rows.
          </li>
          <li>
            <strong>Missions, studio tools, check-ups, Wrapped and mission reviews:</strong> your business details and the summary
            of numbers the answer is about.
          </li>
          <li>
            <strong>Importing a bank statement:</strong> the file&apos;s contents. In PDF, CSV and Excel files, card and account
            numbers are blanked out before the AI reads them. <strong>Photos are sent as they are</strong>, so cover account
            numbers before taking one, or use a PDF or CSV instead.
          </li>
        </ul>
        <p>
          These requests go to <strong>Nebius Token Factory</strong>, which runs the NVIDIA Nemotron models (and an open Gemma
          model to read photos). Nebius handles the data under its own terms. Its{" "}
          <a
            href="https://docs.tokenfactory.nebius.com/legal/privacy-policy"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-star-300 underline decoration-star-300/40 underline-offset-4 transition-colors hover:decoration-star-300"
          >
            privacy policy
          </a>{" "}
          describes what it keeps, including some inputs and outputs used to make its models respond faster.
        </p>
      </Section>

      <Section title="What Polaris's own server does">
        <p>
          It passes your request to the AI and sends the answer straight back. It stores nothing, and its logs record only that
          something failed, never what you sent.
        </p>
      </Section>

      <Section title="How it's protected">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Everything travels over an encrypted connection (HTTPS) once Polaris is online.</li>
          <li>The AI key stays on the server and never reaches your browser.</li>
          <li>The AI can only be reached from the Polaris app itself, with fair-use limits per visitor.</li>
          <li>Pages can&apos;t load code from other sites or be shown inside other sites.</li>
        </ul>
      </Section>

      <Section title="Your controls">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Download a backup</strong> or <strong>restore one</strong> from Your data.
          </li>
          <li>
            <strong>Delete all my data</strong> in Your data removes everything Polaris saved in this browser.
          </li>
          <li>On a shared computer, delete your data when you&apos;re done, or use your own browser profile.</li>
        </ul>
      </Section>

      <Section title="Changes">
        <p>If Polaris starts keeping or sending anything new, this notice will say so before it happens, with a new date above.</p>
      </Section>

      <p className="text-sm">
        <Link href="/" className="inline-flex min-h-11 items-center font-medium text-star-300 underline-offset-4 hover:underline">
          Back to Polaris
        </Link>
      </p>
    </main>
  );
}
