import crypto from "node:crypto";
import { NextResponse } from "next/server"; // not needed but kept for consistency
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export default async function SellerCollectPage({ params }: { params: { token: string } }) {
  const tokenHash = hashToken(params.token);
  const { data: contact } = await supabase
    .from("pickup_contacts")
    .select("*, bookings(id,status,scheduled_collection_start,scheduled_collection_end,users!bookings_driver_id_fkey(full_name,phone),seller_handover_code_hash)")
    .eq("secure_token_hash", tokenHash)
    .single();

  if (!contact) {
    return (
      <main className="min-h-screen bg-[#0a0f1e] text-white flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-6">🔒</div>
          <h1 className="text-3xl font-semibold tracking-tight mb-3">Link expired or invalid</h1>
          <p className="text-zinc-400 max-w-xs mx-auto">This collection link is no longer active. Please contact the seller for an updated link.</p>
          <Link href="/" className="inline-block mt-8 text-sm underline">Return to Door in Four</Link>
        </div>
      </main>
    );
  }

  const booking = Array.isArray(contact.bookings) ? contact.bookings[0] : contact.bookings;
  const driver = booking?.users;
  const status = booking?.status || "awaiting assignment";

  const statusColor = 
    status === "completed" ? "emerald" :
    status === "driver_en_route_to_pickup" ? "blue" : "amber";

  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white py-12">
      <div className="max-w-2xl mx-auto px-6">
        <div className="flex justify-between items-center mb-10">
          <div>
            <div className="text-emerald-400 text-xs tracking-[2px] font-medium">DOOR IN FOUR</div>
            <h1 className="text-3xl font-semibold tracking-tight mt-1">Collection confirmation</h1>
          </div>
          <div className={`px-4 py-1.5 rounded-full text-xs font-medium border ${statusColor === "emerald" ? "border-emerald-500 text-emerald-400" : statusColor === "blue" ? "border-blue-500 text-blue-400" : "border-amber-500 text-amber-400"}`}>
            {status.replace(/_/g, " ").toUpperCase()}
          </div>
        </div>

        <div className="bg-zinc-900 border border-white/10 rounded-3xl p-10 space-y-10">
          <div>
            <div className="text-sm text-zinc-400 mb-1">SELLER</div>
            <div className="text-2xl font-semibold tracking-tight">{contact.seller_name}</div>
            <div className="text-zinc-400 mt-1">{contact.town} {contact.postcode}</div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="text-sm text-zinc-400 mb-1">PICKUP WINDOW</div>
              <div className="font-medium">
                {booking?.scheduled_collection_start ? new Date(booking.scheduled_collection_start).toLocaleDateString() : "To be confirmed"}
              </div>
            </div>
            <div>
              <div className="text-sm text-zinc-400 mb-1">DRIVER</div>
              <div className="font-medium">
                {driver?.full_name ? driver.full_name.split(" ")[0] : "Not yet assigned"}
                {driver?.phone && <div className="text-xs text-zinc-500 mt-0.5">{driver.phone}</div>}
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10">
            <div className="uppercase text-xs tracking-[1.5px] text-zinc-500 mb-3">IMPORTANT</div>
            <div className="text-sm text-zinc-400 leading-relaxed">
              Do not share buyer delivery details with anyone. This link is for your collection confirmation only.
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-zinc-600">
          Door in Four • Local delivery for West Kent marketplaces
        </div>
      </div>
    </main>
  );
}