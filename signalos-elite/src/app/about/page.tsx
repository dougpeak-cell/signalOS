import Link from "next/link";
import SigiWisdomGrid from "@/components/shared/SigiWisdomGrid";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#06111f] px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/today"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-4 py-2 text-sm text-slate-300 transition hover:text-white"
        >
          Back
        </Link>

        <div className="mb-6 inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1 text-xs uppercase tracking-[0.24em] text-emerald-300">
          About SigiOS
        </div>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Why SigiOS Exists
        </h1>

        <div className="mt-10 rounded-3xl border border-white/10 bg-white/3 p-8 backdrop-blur">
          <p className="text-lg leading-8 text-slate-200">
            As the creator of SigiOS, I was inspired to help others because I
            was the person that used to think:
          </p>

          <div className="mt-8 rounded-2xl border border-emerald-400/20 bg-emerald-500/6 p-6 text-center">
            <p className="text-2xl font-semibold italic text-emerald-100">
              &ldquo;I&apos;ve never been good with money. It&apos;s probably too late to build financial security.&rdquo;
            </p>
          </div>

          <div className="mt-8 space-y-6 text-base leading-8 text-slate-300">
            <p>
              I feared investing because I lacked education about the stock
              market. I believed financial knowledge was reserved for people
              born into the right families or circumstances.
            </p>

            <p>
              Over time, I learned that successful investing is not about being
              lucky, connected, or perfect.
            </p>
          </div>

          <div className="mt-10">
            <SigiWisdomGrid />
          </div>

          <div className="mt-10 border-t border-white/10 pt-8">
            <p className="text-lg leading-8 text-slate-200">
              SigiOS was built to help people think clearly, grow responsibly,
              and take control of their future through knowledge and character.
            </p>

            <p className="mt-6 text-base leading-8 text-slate-300">
              This platform exists to encourage confidence, wisdom, and healthy
              wealth for everyday people.
            </p>

            <div className="mt-12 border-t border-white/10 pt-8">
              <p className="text-sm uppercase tracking-[0.24em] text-emerald-300/70">
                Founder Vision
              </p>

              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300 italic">
                &ldquo;Healthy wealth is built through patience, wisdom, discipline,
                and faith during uncertainty.&rdquo;
              </p>

              <div className="mt-6">
                <p className="font-semibold text-white">DCP</p>
                <p className="text-sm text-slate-500">Creator of SigiOS</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 text-sm text-slate-500">
          Built with purpose for everyday investors.
        </div>
      </div>
    </main>
  );
}