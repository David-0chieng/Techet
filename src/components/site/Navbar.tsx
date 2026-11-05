import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

const links = [
  { href: "/", label: "Home" },
  { href: "/discover", label: "Discover" },
  { href: "/plan", label: "Plan" },
  { href: "/map", label: "Map" },
];

export async function Navbar() {
  const session = await auth();
  const role = session?.user?.role;
  const isOrganizer = role === "ORGANIZER" || role === "ADMIN";

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-mono text-lg font-bold tracking-tight">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          VIBENASI
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {session?.user ? (
            <>
              {isOrganizer && (
                <Link
                  href="/dashboard"
                  className="hidden text-sm text-muted transition-colors hover:text-foreground sm:inline"
                >
                  Dashboard
                </Link>
              )}
              {role === "ADMIN" && (
                <Link
                  href="/admin/events"
                  className="hidden text-sm text-muted transition-colors hover:text-foreground sm:inline"
                >
                  Moderation
                </Link>
              )}
              <Link
                href="/profile"
                className="hidden text-sm text-muted transition-colors hover:text-foreground sm:inline"
              >
                Profile
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90"
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden text-sm text-muted transition-colors hover:text-foreground sm:inline"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
