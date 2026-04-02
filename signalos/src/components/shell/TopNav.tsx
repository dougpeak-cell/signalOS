import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Today" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/screener", label: "Screener" },
  { href: "/news", label: "News" },
  { href: "/experts", label: "Experts" },
  { href: "/stocks", label: "Stocks" },
  { href: "/education", label: "Education" },
];

export default function TopNav() {
  const pathname = usePathname();
  const isTodayPage = pathname === "/" || pathname.startsWith("/today");

  return (
    <header className="sticky top-0 z-40 h-13 border-b border-cyan-400/10 bg-black/80 backdrop-blur-xl">
      <div
        className={`mx-auto flex h-full w-full items-center justify-between ${
          isTodayPage
            ? "max-w-410 px-4 md:px-6 xl:px-8 2xl:px-10"
            : "max-w-430 px-4 sm:px-5 md:px-6 xl:px-6 2xl:px-7"
        }`}
      >
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-[15px] font-semibold tracking-[0.32em] text-white"
          >
            SignalOS
          </Link>

          <nav className="hidden sm:flex items-center gap-5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[13px] font-medium text-white/72 transition hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="md:hidden">
          <button
            type="button"
            className="inline-flex h-9 items-center rounded-full border border-white/10 px-3 text-[12px] font-medium text-white/80"
          >
            Menu
          </button>
        </div>
      </div>
    </header>
  );
}