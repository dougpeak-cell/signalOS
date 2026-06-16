"use client";

export default function DiscordCommunityCard() {
  const discordUrl =
    process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || "https://discord.com";

  return (
    <section className="rounded-3xl border border-cyan-500/20 bg-slate-950/90 p-6 shadow-[0_18px_40px_rgba(0,0,0,0.3)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
        SigiOS Community
      </div>

      <h2 className="mt-3 text-2xl font-semibold text-white">
        Join the SigiOS Trading Floor
      </h2>

      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72">
        Connect with other SigiOS users, discuss market setups, ask questions,
        share ideas, and grow with the community.
      </p>

      <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-6 text-white/58">
        Community Policy: By entering, you agree to respectful discussion.
        Admins may remove posts, images, videos, or members for inappropriate
        language, harassment, spam, disturbing content, misleading promotions,
        or abusive behavior.
      </p>

      <a
        href={discordUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-5 inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/12 px-5 py-2.5 text-sm font-medium text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/18"
      >
        Join Discord Community
      </a>
    </section>
  );
}