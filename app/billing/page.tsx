export const metadata = {
  title: "Billing Policy",
  description: "Billing, cancellation, and refund policy for subscriptions.",
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

export default function BillingPage() {
  const effectiveDate = "March 3, 2026";

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-14">
        <header className="space-y-3">
          <p className="text-sm text-neutral-500">Legal</p>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            Billing Policy
          </h1>
          <p className="text-sm text-neutral-600">
            Effective date: <span className="font-medium">{effectiveDate}</span>
          </p>
          <div className="h-px w-full bg-neutral-200" />
        </header>

        <div className="mt-10 space-y-10">
          <Section title="1. Subscription Plans">
            <p>
              We offer paid subscription plans that provide access to premium
              features. Plan pricing, included features, and billing cadence are
              displayed during checkout and/or on our pricing page.
            </p>
          </Section>

          <Section title="2. Billing and Renewal">
            <ul>
              <li>
                Subscriptions are billed in advance on a recurring basis (e.g.,
                monthly or annually depending on the plan selected).
              </li>
              <li>
                Your subscription will automatically renew at the end of each
                billing period unless you cancel before renewal.
              </li>
              <li>
                Payments are processed by Stripe. We do not store full card
                details.
              </li>
            </ul>
          </Section>

          <Section title="3. Cancellation">
            <p>
              You can cancel your subscription at any time from your account
              settings (or by contacting support). Cancellation stops future
              renewals. You will retain access to paid features until the end of
              your current billing period.
            </p>
          </Section>

          <Section title="4. Refunds">
            <p>
              Except where required by law, we do not provide refunds or credits
              for partial billing periods, unused time, downgrades, or unused
              features.
            </p>
            <p>
              If you believe you were billed in error, contact support and we’ll
              review the issue.
            </p>
          </Section>

          <Section title="5. Failed Payments">
            <p>
              If a payment fails, we may retry the payment method on file. If we
              cannot successfully charge your payment method, your subscription
              may be suspended or canceled.
            </p>
          </Section>

          <Section title="6. Price Changes">
            <p>
              We may change subscription prices from time to time. If we change
              pricing for an existing subscription, we will provide reasonable
              notice where required.
            </p>
          </Section>

          <Section title="7. Contact">
            <p>
              Billing questions? Contact{" "}
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
