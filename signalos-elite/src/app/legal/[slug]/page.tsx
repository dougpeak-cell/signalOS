import Link from "next/link";

const legalContent: Record<string, { title: string; body: string[] }> = {
  "terms-of-use": {
    title: "Terms of Use",
    body: [
      "By accessing or using SigiOS, you agree to these Terms of Use.",
      "SigiOS provides educational, informational, market research, watchlist, portfolio, screener, charting, and AI-assisted tools.",
      "SigiOS does not provide personalized investment advice, financial advice, legal advice, or tax advice.",
      "Smart and Pro subscriptions renew automatically unless canceled. Users may cancel through their account or billing portal.",
      "SigiOS may change, update, remove, or improve features at any time.",
      "Users are responsible for maintaining the accuracy of account, watchlist, and portfolio information they enter.",
      "Markets involve risk. SigiOS is not responsible for trading losses, investment decisions, missed opportunities, data delays, or third-party service interruptions.",
      "Users agree not to misuse, copy, resell, scrape, reverse engineer, or abuse the SigiOS platform.",
    ],
  },
  "privacy-policy": {
    title: "Privacy Policy",
    body: [
      "SigiOS collects information needed to provide and improve the service.",
      "Information we may collect includes name, email address, account status, subscription status, app preferences, watchlists created by users, portfolio holdings entered by users, target prices, notes, usage analytics, diagnostics, and support communications.",
      "Portfolio information entered into SigiOS is user-provided data and is not verified against brokerage accounts.",
      "SigiOS does not collect brokerage usernames, brokerage passwords, Social Security numbers, government identification numbers, or full credit card numbers.",
      "Payments are processed by Stripe. SigiOS does not store full card or banking details.",
      "SigiOS may use third-party providers including Stripe, Supabase, OpenAI, Vercel, Resend, market data providers, and analytics services.",
      "SigiOS uses reasonable safeguards to protect user information, but no online service can guarantee complete security.",
      "Users may contact support@sigios.com with privacy questions or account-related requests.",
    ],
  },
  "financial-disclosure": {
    title: "Financial & Investment Disclosure",
    body: [
      "SigiOS is an educational and informational platform.",
      "Nothing in SigiOS is investment advice, financial advice, tax advice, legal advice, or a recommendation to buy, sell, short, hold, or trade any security, cryptocurrency, option, ETF, or financial product.",
      "All investing and trading involves risk, including possible loss of principal.",
      "Past performance does not guarantee future results.",
      "Market data, price targets, analyst summaries, rankings, scores, signals, screeners, watchlists, and portfolio tools are provided for informational purposes only.",
      "Users are responsible for conducting their own research and making their own investment decisions.",
      "Users should consult qualified financial, tax, or legal professionals before making financial decisions.",
    ],
  },
  "ai-disclosure": {
    title: "AI Disclosure",
    body: [
      "SigiOS uses artificial intelligence technology, including Sigi AI, to generate summaries, market commentary, educational explanations, rankings, insights, and responses to user questions.",
      "AI-generated content may contain errors, omissions, outdated information, incorrect assumptions, or inaccurate conclusions.",
      "AI outputs should not be relied upon as the sole basis for investment, trading, tax, legal, or financial decisions.",
      "Users should independently verify all information before acting on it.",
      "SigiOS does not guarantee the accuracy, completeness, timeliness, or suitability of AI-generated content.",
      "Sigi AI is designed to support education and research, not to replace human judgment or professional advice.",
    ],
  },
};

type LegalPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function LegalPage({ params }: LegalPageProps) {
  const { slug } = await params;
  const page = legalContent[slug];

  if (!page) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-16">
        <section className="w-full rounded-3xl border border-cyan-400/20 bg-[#071018]/80 p-8 text-white shadow-[0_0_30px_rgba(34,211,238,0.08)]">
          <h1 className="text-3xl font-semibold">Page Not Found</h1>
          <div className="mt-6">
            <Link
              href="/settings/sigi#profile"
              className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-500/10 px-5 py-2 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300/60 hover:bg-cyan-400/15"
            >
              Back to Account
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl px-6 py-16">
      <section className="w-full rounded-3xl border border-cyan-400/20 bg-[#071018]/80 p-8 text-white shadow-[0_0_30px_rgba(34,211,238,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
            SigiOS Legal
          </p>

          <Link
            href="/settings/sigi#profile"
            className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-500/10 px-5 py-2 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300/60 hover:bg-cyan-400/15"
          >
            Back to Account
          </Link>
        </div>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight">{page.title}</h1>

        <p className="mt-3 text-sm text-white/55">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className="mt-8 space-y-4 text-base leading-7 text-white/78">
          {page.body.map((item, index) => (
            <p key={`${slug}-${index}`}>{item}</p>
          ))}
        </div>

        <nav className="mt-10 flex flex-wrap gap-3 text-sm font-medium text-cyan-200">
          <Link href="/legal/terms-of-use" className="rounded-full border border-cyan-400/20 px-4 py-2 transition hover:bg-cyan-500/10">
            Terms of Use
          </Link>
          <Link href="/legal/privacy-policy" className="rounded-full border border-cyan-400/20 px-4 py-2 transition hover:bg-cyan-500/10">
            Privacy Policy
          </Link>
          <Link href="/legal/financial-disclosure" className="rounded-full border border-cyan-400/20 px-4 py-2 transition hover:bg-cyan-500/10">
            Financial Disclosure
          </Link>
          <Link href="/legal/ai-disclosure" className="rounded-full border border-cyan-400/20 px-4 py-2 transition hover:bg-cyan-500/10">
            AI Disclosure
          </Link>
        </nav>
        <div className="mt-8">
          <Link
            href="/settings/sigi#profile"
            className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-500/10 px-5 py-2 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300/60 hover:bg-cyan-400/15"
          >
            Return to Account
          </Link>
        </div>
      </section>
    </main>
  );
}