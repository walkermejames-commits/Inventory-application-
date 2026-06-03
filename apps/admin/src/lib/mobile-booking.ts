export const mobileBookingSelect = `
  id,status,payment_status,item_title,item_size,approximate_weight_kg,fragile,requires_two_people,requires_van,delivery_quote_amount,accepted_price,driver_payout_amount,created_at,updated_at,
  pickup_contacts (town, postcode, address_line_1),
  delivery_addresses (town, postcode, address_line_1)
`;

export function toMobileBooking(job: any) {
  const pickup = Array.isArray(job.pickup_contacts) ? job.pickup_contacts[0] : job.pickup_contacts;
  const delivery = Array.isArray(job.delivery_addresses) ? job.delivery_addresses[0] : job.delivery_addresses;

  return {
    id: job.id,
    status: job.status,
    payment_status: job.payment_status,
    pickup_town: pickup?.town || "Pickup",
    pickup_postcode: pickup?.postcode || null,
    pickup_address_line: pickup?.address_line_1 || null,
    delivery_town: delivery?.town || "Delivery",
    delivery_postcode: delivery?.postcode || null,
    delivery_address_line: delivery?.address_line_1 || null,
    item_title: job.item_title || "Delivery job",
    item_size: job.item_size || "medium",
    approximate_weight_kg: Number(job.approximate_weight_kg || 0),
    fragile: Boolean(job.fragile),
    requires_two_people: Boolean(job.requires_two_people),
    requires_van: Boolean(job.requires_van),
    delivery_quote_amount: job.delivery_quote_amount,
    accepted_price: job.accepted_price,
    driver_payout_amount: job.driver_payout_amount,
    created_at: job.created_at,
    updated_at: job.updated_at,
  };
}
