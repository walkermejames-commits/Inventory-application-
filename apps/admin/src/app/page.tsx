import Link from "next/link";

const adminLinks = [
  { href: "/operations", label: "FC Operations Board", description: "Live jobs, timers, interventions and operational events." },
  { href: "/dispatch", label: "FC Dispatch", description: "Driver map, active jobs and launch-zone coverage." },
  { href: "/get-a-quote", label: "Create Quote", description: "Create and save customer delivery quotes." },
  { href: "/quotes", label: "Quotes / Quote Query", description: "Review and search quote records." },
  { href: "/bookings", label: "Bookings", description: "Manage dispatch and delivery status." },
  { href: "/performance", label: "Performance", description: "View high-level operational and commercial KPIs." }
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-12">
        <div className="mb-8 inline-flex w-fit rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-emerald-100">
          Door in Four · FC launch control
        </div>

        <h1 className="max-w-3xl text-5xl font-black tracking-tight sm:text-6xl">
          Fat Controller operations
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          Dispatch visibility, quote operations, booking management and performance oversight for the Door in Four network.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-3xl border border-white/15 bg-white/10 p-6 transition hover:border-emerald-300/50 hover:bg-white/15"
            >
              <p className="text-lg font-black text-white">{link.label}</p>
              <p className="mt-2 text-sm text-slate-300">{link.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
