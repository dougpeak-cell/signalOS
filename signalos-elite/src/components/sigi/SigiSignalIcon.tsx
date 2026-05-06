import SigiEyeLogo from "@/components/sigi/SigiEyeLogo";

export default function SigiSignalIcon({
  size = 56,
  pulse = true,
}: {
  size?: number;
  pulse?: boolean;
}) {
  const height = Math.round((size * 150) / 260);

  return (
    <div
      className="transition group-hover:scale-105"
      style={{ width: size, height }}
    >
      <SigiEyeLogo className="h-full w-full" animate={pulse} />
    </div>
  );
}