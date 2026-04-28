import React, { useMemo, useState } from "react";
import { Button, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";

type Role = "buyer" | "driver";
const API_BASE = process.env.EXPO_PUBLIC_ADMIN_API_URL ?? "http://localhost:3001";

export default function App() {
  const [role, setRole] = useState<Role>("buyer");
  const [bookingId, setBookingId] = useState("");
  const [quoteId, setQuoteId] = useState("");
  const [status, setStatus] = useState("draft");
  const [message, setMessage] = useState("Ready");

  const buyer = useMemo(
    () => (
      <View style={{ gap: 8 }}>
        <Text style={{ fontWeight: "700" }}>Buyer quote flow</Text>
        <TextInput placeholder="Buyer UUID" onChangeText={(v) => setMessage(v)} style={{ borderWidth: 1, padding: 8 }} />
        <Button
          title="Create quote"
          onPress={async () => {
            const res = await fetch(`${API_BASE}/api/quotes`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                buyerId: message,
                pickupTown: "Tonbridge",
                deliveryTown: "Royal Tunbridge Wells",
                pickupPostcode: "TN9 1DD",
                deliveryPostcode: "TN1 1RS",
                itemSize: "furniture",
                approximateWeightKg: 35,
                quantity: 1,
                urgency: "scheduled",
                routeDistanceMiles: 8,
                routeDurationMinutes: 24,
                fragile: false,
                pickupStairsFloors: 1,
                deliveryStairsFloors: 0,
                requiresTwoPeople: true,
                requiresVan: true
              })
            });
            const json = await res.json();
            setQuoteId(json.quote?.id ?? "");
            setMessage(JSON.stringify(json));
          }}
        />
        <Text>Quote ID: {quoteId}</Text>
        <Text>Status tracker: {status}</Text>
      </View>
    ),
    [message, quoteId, status]
  );

  const driver = (
    <View style={{ gap: 8 }}>
      <Text style={{ fontWeight: "700" }}>Driver job flow</Text>
      <TextInput placeholder="Booking ID" value={bookingId} onChangeText={setBookingId} style={{ borderWidth: 1, padding: 8 }} />
      <Button
        title="Mark en route to pickup"
        onPress={async () => {
          const res = await fetch(`${API_BASE}/api/bookings/${bookingId}/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ toStatus: "driver_en_route_to_pickup", actorRole: "driver" })
          });
          setStatus(res.ok ? "driver_en_route_to_pickup" : "error");
        }}
      />
      <Button
        title="Mark delivered"
        onPress={async () => {
          const res = await fetch(`${API_BASE}/api/bookings/${bookingId}/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ toStatus: "delivered", actorRole: "driver" })
          });
          setStatus(res.ok ? "delivered" : "error");
        }}
      />
      <Text>Current workflow status: {status}</Text>
    </View>
  );

  return (
    <SafeAreaView>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        <Text style={{ fontSize: 26, fontWeight: "700" }}>Door in Four</Text>
        <Text>Bought it local? Get it home.</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button title="Buyer mode" onPress={() => setRole("buyer")} />
          <Button title="Driver mode" onPress={() => setRole("driver")} />
        </View>
        {role === "buyer" ? buyer : driver}
        <Text selectable>{message}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
