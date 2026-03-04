export const metadata = {
  title: "Terms of Service",
  description: "Terms of Service for this stock analytics platform.",
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

export default function TermsPage() {
  const effectiveDate = "March 3, 2026";

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-14">
        <header className="space-y-3">
          <p className="text-sm text-neutral-500">Legal</p>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            Terms of Service
          </h1>
          <p className="text-sm text-neutral-600">
            Effective date: <span className="font-medium">{effectiveDate}</span>
          </p>
          <div className="h-px w-full bg-neutral-200" />
        </header>

        <div className="mt-10 space-y-10">
          <Section title="1. Agreement to these Terms">
            <p>
              By accessing or using this website, application, or any related
              services (the “Service”), you agree to be bound by these Terms of
              Service (“Terms”). If you do not agree, do not use the Service.
            </p>
          </Section>

          <Section title="2. The Service">
            <p>
              The Service provides stock market analytics, screening tools,
              research insights, and related features. Features may change over
              time as we improve the product.
            </p>
          </Section>

          <Section title="3. No Investment Advice">
            <p>
              The Service is provided for informational and educational purposes
              only. We are not a broker-dealer, investment adviser, or tax
              adviser. Nothing on the Service constitutes financial, legal, tax,
              or investment advice, nor is it a recommendation to buy or sell
              any security.
            </p>
            <p>
              Investing involves risk, including loss of principal. You are
              solely responsible for your investment decisions.
            </p>
          </Section>

          <Section title="4. Accounts">
            <ul>
              <li>
                You are responsible for maintaining the confidentiality of your
                account credentials.
              </li>
              <li>
                You agree to provide accurate information and keep it updated.
              </li>
              <li>
                You are responsible for all activity that occurs under your
                account.
              </li>
            </ul>
          </Section>

          <Section title="5. Subscriptions, Billing, and Payments">
            <p>
              Certain features may require a paid subscription. Subscription
              pricing and plan details are displayed at checkout and/or on our
              pricing page.
            </p>
            <ul>
              <li>
                Payments are processed by Stripe. We do not store your full card
                details.
              </li>
              <li>
                Subscriptions renew automatically each billing cycle unless
                canceled.
              </li>
              <li>
                You can cancel at any time from your account settings (or by
                contacting support).
              </li>
            </ul>
            <p>
              See our Billing Policy for additional details regarding
              cancellations and refunds.
            </p>
          </Section>

          <Section title="6. Acceptable Use">
            <p>You agree not to:</p>
            <ul>
              <li>Use the Service for unlawful purposes.</li>
              <li>
                Reverse engineer, decompile, or attempt to extract source code
                from the Service except where allowed by law.
              </li>
              <li>
                Interfere with or disrupt the Service (including by automated
                scraping, probing, or excessive requests).
              </li>
              <li>
                Access the Service in a way intended to avoid fees or usage
                limits.
              </li>
            </ul>
          </Section>

          <Section title="7. Intellectual Property">
            <p>
              We (and our licensors) retain all rights, title, and interest in
              and to the Service, including all software, designs, text, and
              content. You may not copy, modify, distribute, or create
              derivative works except as expressly permitted.
            </p>
          </Section>

          <Section title="8. Third-Party Services and Market Data">
            <p>
              The Service may rely on third-party data sources and services.
              Market data may be delayed, incomplete, or inaccurate. We are not
              responsible for third-party services, data availability, or
              accuracy.
            </p>
          </Section>

          <Section title="9. Disclaimers">
            <p>
              THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT
              WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING IMPLIED
              WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
              AND NON-INFRINGEMENT.
            </p>
          </Section>

          <Section title="10. Limitation of Liability">
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE WILL NOT BE LIABLE FOR
              ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
              DAMAGES, OR ANY LOSS OF PROFITS, DATA, USE, OR GOODWILL, ARISING
              OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE.
            </p>
          </Section>

          <Section title="11. Termination">
            <p>
              We may suspend or terminate your access to the Service at any time
              if we reasonably believe you violated these Terms or if necessary
              to protect the Service. You may stop using the Service at any
              time.
            </p>
          </Section>

          <Section title="12. Changes to these Terms">
            <p>
              We may update these Terms from time to time. If we make material
              changes, we will update the effective date and may provide
              additional notice. Continued use of the Service after changes
              becomes effective constitutes acceptance.
            </p>
          </Section>

          <Section title="13. Contact">
            <p>
              Questions about these Terms? Contact us at{" "}
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
            <p className="mt-6 text-xs text-neutral-500">
              © {new Date().getFullYear()} Your Company. All rights reserved.
            </p>
          </footer>
        </div>
      </div>
    </main>
  );
}
