import Link from "next/link";

export default function Home() {
  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Door in Four Admin Dashboard</h1>
      <p>Operational dashboard for one-van launch dispatch in Tunbridge Wells.</p>
      <div className="flex gap-4">
        <Link className="underline" href="/bookings">Bookings</Link>
      </div>
    </main>
  );
}
