"use client";

type DiscordInviteButtonProps = {
  label?: string;
  className?: string;
};

export default function DiscordInviteButton({
  label = "Join Discord Community",
  className,
}: DiscordInviteButtonProps) {
  const discordUrl =
    process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || "https://discord.com";

  return (
    <a
      href={discordUrl}
      target="_blank"
      rel="noreferrer"
      className={
        className ??
        "inline-flex items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/12 px-5 py-2.5 text-sm font-medium text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/18"
      }
    >
      {label}
    </a>
  );
}