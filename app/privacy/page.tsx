export const metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for this stock analytics platform.",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold tracking-tight text-neutral-900">
        {title}
      </h2>
      <div className="prose prose-neutral max-w-none prose-p:leading-relaxed prose-li:leading-relaxed">
        {children}
      </div>
    </section>
  );
}

// SignalOS HomePage landing component
export function HomePage() {
  return (
    <main style={{ fontFamily: "sans-serif", padding: "40px" }}>
      <h1>SignalOS</h1>
      <p>
        SignalOS is an AI-powered stock analysis platform providing
        market insights, conviction scores, and portfolio analytics.
      </p>
      <p>
        SignalOS provides financial analytics tools and does not provide
        investment advice or execute trades.
      </p>
    </main>
  );
}

function LegalLinks() {
  return (
    <div className="flex flex-wrap gap-4 text-sm text-neutral-600">
      <a className="underline underline-offset-4" href="/terms">
        Terms
      </a>
      <a className="underline underline-offset-4" href="/privacy">
        Privacy
      </a>
      <a className="underline underline-offset-4" href="/contact">
        Contact
      </a>
    </div>
  );
}

export default function PrivacyPage() {
  const effectiveDate = "March 3, 2026";

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-14">
        <header className="space-y-3">
          <p className="text-sm text-neutral-500">Legal</p>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            Privacy Policy
          </h1>
          <p className="text-sm text-neutral-600">
            Effective date: <span className="font-medium">{effectiveDate}</span>
          </p>
          <div className="h-px w-full bg-neutral-200" />
        </header>

        <div className="mt-10 space-y-10">
          <Section title="1. Overview">
            <p>
              This Privacy Policy explains how we collect, use, and share
              information when you use the Service. If you have questions,
              contact{" "}
              <a
                className="underline underline-offset-4"
                href="mailto:support@yourdomain.com"
              >
                support@yourdomain.com
              </a>
              .
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <ul>
              <li>
                <strong>Account information:</strong> such as email address and
                authentication details (managed through our auth provider).
              </li>
              <li>
                <strong>Usage data:</strong> interactions with features,
                diagnostic logs, and approximate device/browser information.
              </li>
              <li>
                <strong>Payment information:</strong> payment method and billing
                details are processed by Stripe; we do not store full payment
                card numbers.
              </li>
              <li>
                <strong>Support communications:</strong> information you include
                when contacting support.
              </li>
            </ul>
          </Section>

          <Section title="3. How We Use Information">
            <ul>
              <li>Provide, maintain, and improve the Service.</li>
              <li>Authenticate users and secure accounts.</li>
              <li>Process payments and manage subscriptions.</li>
              <li>
                Monitor performance, prevent fraud/abuse, and troubleshoot
                issues.
              </li>
              <li>Communicate updates, receipts, and support responses.</li>
            </ul>
          </Section>

          <Section title="4. Cookies and Analytics">
            <p>
              We may use cookies or similar technologies for authentication,
              preferences, and analytics. You can control cookies through your
              browser settings, though some features may not work properly if
              cookies are disabled.
            </p>
          </Section>

          <Section title="5. How We Share Information">
            <p>We do not sell your personal information. We may share data:</p>
            <ul>
              <li>
                <strong>Service providers:</strong> such as hosting, analytics,
                and customer support tools.
              </li>
              <li>
                <strong>Payments:</strong> Stripe processes payments and
                subscriptions.
              </li>
              <li>
                <strong>Legal:</strong> if required by law or to protect rights,
                safety, and security.
              </li>
              <li>
                <strong>Business transfers:</strong> if we are involved in a
                merger, acquisition, or sale of assets.
              </li>
            </ul>
          </Section>

          <Section title="6. Data Retention">
            <p>
              We retain information as long as necessary to provide the Service,
              comply with legal obligations, resolve disputes, and enforce our
              agreements. We may retain and use aggregated or de-identified
              information for analytics.
            </p>
          </Section>

          <Section title="7. Security">
            <p>
              We implement reasonable administrative, technical, and physical
              safeguards designed to protect your information. No method of
              transmission or storage is 100% secure.
            </p>
          </Section>

          <Section title="8. Your Choices">
            <ul>
              <li>
                You can update account information within your profile or by
                contacting support.
              </li>
              <li>You can cancel your subscription at any time.</li>
              <li>
                You may request access, correction, or deletion of your personal
                data, subject to applicable law.
              </li>
            </ul>
          </Section>

          <Section title="9. Children’s Privacy">
            <p>
              The Service is not intended for children under 13 (or the minimum
              age required in your jurisdiction). We do not knowingly collect
              personal information from children.
            </p>
          </Section>

          <Section title="10. Changes to this Policy">
            <p>
              We may update this Privacy Policy from time to time. We will
              update the effective date and may provide additional notice for
              material changes. Your continued use of the Service means you
              accept the updated Policy.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>
              If you have questions or requests related to privacy, contact{" "}
              <a
                className="underline underline-offset-4"
                href="mailto:support@yourdomain.com"
              >
                support@yourdomain.com
              </a>
              .
            </p>
          </Section>

          <footer className="pt-8">
            <div className="h-px w-full bg-neutral-200" />
              <div className="mt-6 mb-2">
                <LegalLinks />
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                © {new Date().getFullYear()} Your Company. All rights reserved.
              </p>
          </footer>
        </div>
      </div>
    </main>
  );
}
