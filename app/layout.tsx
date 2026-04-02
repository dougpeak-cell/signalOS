console.log('Loaded app/layout.tsx');
import "./globals.css";
import Link from "next/link";
import { AuthButton } from "@/components/AuthButton";

export const metadata = {
  title: "CampusKings",
  description: "CBB player outcome predictions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="container topbar-inner">
            <Link href="/" className="brand">
              SignalOS
            </Link>

            <nav className="nav">
              <Link href="/" className="navlink">
                Today
              </Link>
              <Link href="/predicted" className="navlink">
                Predicted
              </Link>
              <Link href="/watchlist" className="navlink">
                Watchlist
              </Link>
              <Link href="/leaderboard" className="navlink">
                Leaderboard
              </Link>
              <Link href="/search" className="navlink">
                Search
              </Link>
              <Link href="/login" className="navlink">
                Login
              </Link>
            </nav>

            <div className="auth">
              <AuthButton />
            </div>
          </div>
        </header>

        <div className="container">{children}</div>
      </body>
    </html>
  );
}
