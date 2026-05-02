import crypto from "node:crypto";
import { supabase } from "@/lib/server";

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export default async function SellerCollectPage({ params }: { params: { token: string } }) {
  const tokenHash = hashToken(params.token);
  const { data: contact } = await supabase
    .from("pickup_contacts")
    .select("*, bookings(id,status,scheduled_collection_start,scheduled_collection_end,users!bookings_driver_id_fkey(full_name,phone),seller_handover_code_hash)")
    .eq("secure_token_hash", tokenHash)
    .single();

  if (!contact) {
    return <main className="p-6"><h1>Invalid or expired seller link</h1></main>;
  }

  const booking = Array.isArray(contact.bookings) ? contact.bookings[0] : contact.bookings;
  const driver = booking?.users;

  return (
    <main className="p-6 space-y-3">
      <h1 className="text-xl font-semibold">Door in Four collection confirmation</h1>
      <p>Collection for: {contact.seller_name}</p>
      <p>Pickup town/postcode: {contact.town} {contact.postcode}</p>
      <p>Status: {booking?.status ?? "awaiting assignment"}</p>
      <p>Collection window: {booking?.scheduled_collection_start ?? "TBC"} - {booking?.scheduled_collection_end ?? "TBC"}</p>
      <p>Driver: {driver?.full_name ? `${driver.full_name.split(" ")[0]} (${driver.phone ?? "phone pending"})` : "Not assigned yet"}</p>
      <p>Handover code is available in seller secure API and buyer/driver workflow.</p>
      <p>Do not share buyer delivery details.</p>
    </main>
  );
}
