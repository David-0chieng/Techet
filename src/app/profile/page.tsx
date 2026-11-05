import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/profile");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { organizer: true, artistProfile: true },
  });
  if (!user) redirect("/login");

  const isOrganizer = user.role === "ORGANIZER" || user.role === "ADMIN";
  const isArtist = user.role === "ARTIST";

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
        <p className="mt-1 text-sm text-muted">{user.email}</p>
        <span className="mt-3 inline-block rounded-full border border-border px-3 py-1 text-xs font-medium text-muted">
          {user.role}
        </span>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/bookings"
            className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 text-sm transition-colors hover:border-accent-2"
          >
            My bookings
            <span className="text-muted">→</span>
          </Link>
          <Link
            href="/plan"
            className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 text-sm transition-colors hover:border-accent-2"
          >
            My weekend plans
            <span className="text-muted">→</span>
          </Link>
          {isOrganizer && (
            <Link
              href="/dashboard"
              className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 text-sm transition-colors hover:border-accent-2"
            >
              Organizer dashboard
              <span className="text-muted">→</span>
            </Link>
          )}
          {isArtist && (
            <Link
              href="/dashboard/artist"
              className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 text-sm transition-colors hover:border-accent-2"
            >
              Artist dashboard
              <span className="text-muted">→</span>
            </Link>
          )}
          {!isArtist && (
            <Link
              href="/register?role=artist"
              className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 text-sm transition-colors hover:border-accent-2"
            >
              Become an artist on VibeNasi
              <span className="text-muted">→</span>
            </Link>
          )}
          <Link
            href="/artists"
            className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 text-sm transition-colors hover:border-accent-2"
          >
            Book an artist
            <span className="text-muted">→</span>
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
