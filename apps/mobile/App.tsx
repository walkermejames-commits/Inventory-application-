import React, { useMemo, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";

const API_BASE = process.env.EXPO_PUBLIC_ADMIN_API_URL ?? "https://inventory-application-was4.onrender.com";

type ApiJob = {
  id: string;
  status: string;
  accepted_price: number | null;
  pickup_contact?: { town?: string; postcode?: string } | null;
  delivery_address?: { town?: string; postcode?: string } | null;
};

export default function App() {
  const [driverId, setDriverId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [message, setMessage] = useState("Sign up or paste your driver ID to load jobs.");

  const inProgress = useMemo(() => jobs.filter((job) => !["delivered", "completed"].includes(job.status)).length, [jobs]);

  async function signUpDriver() {
    try {
      setMessage("Submitting driver signup...");
      const response = await fetch(`${API_BASE}/api/drivers/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, phone, serviceRadiusMiles: 10 })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Signup failed");
      setDriverId(payload.driverId);
      setMessage(`Signup saved. Driver ID: ${payload.driverId}`);
      await fetchJobs(payload.driverId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not sign up");
    }
  }

  async function fetchJobs(overrideId?: string) {
    const id = (overrideId || driverId).trim();
    if (!id) {
      Alert.alert("Driver ID needed", "Paste your driver ID or sign up first.");
      return;
    }

    try {
      setMessage("Loading your dispatched jobs...");
      const response = await fetch(`${API_BASE}/api/drivers/jobs?driverId=${encodeURIComponent(id)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load jobs");
      setJobs(payload.jobs || []);
      setMessage(`Loaded ${(payload.jobs || []).length} assigned jobs.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load jobs");
    }
  }

  async function advanceJob(jobId: string, toStatus: string) {
    try {
      const response = await fetch(`${API_BASE}/api/drivers/jobs/${jobId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId, toStatus, sellerCode: "000000", buyerCode: "000000", photoPath: "demo/path.jpg" })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Update failed");
      await fetchJobs();
      setMessage(`Job ${jobId} updated to ${toStatus}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update job");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Driver app</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Driver sign-up</Text>
          <TextInput value={fullName} onChangeText={setFullName} style={styles.input} placeholder="Full name" placeholderTextColor="#889" />
          <TextInput value={email} onChangeText={setEmail} style={styles.input} placeholder="Email" placeholderTextColor="#889" />
          <TextInput value={phone} onChangeText={setPhone} style={styles.input} placeholder="Phone" placeholderTextColor="#889" />
          <Pressable style={styles.button} onPress={signUpDriver}><Text style={styles.buttonText}>Submit sign-up</Text></Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Driver ID + dispatch</Text>
          <TextInput value={driverId} onChangeText={setDriverId} style={styles.input} placeholder="Driver ID" placeholderTextColor="#889" />
          <Pressable style={styles.button} onPress={() => fetchJobs()}><Text style={styles.buttonText}>Load my jobs</Text></Pressable>
          <Text style={styles.meta}>In progress jobs: {inProgress}</Text>
        </View>

        {jobs.map((job) => (
          <View key={job.id} style={styles.card}>
            <Text style={styles.label}>Booking {job.id.slice(0, 8)}</Text>
            <Text style={styles.meta}>Status: {job.status}</Text>
            <Text style={styles.meta}>Route: {job.pickup_contact?.town || "Pickup"} → {job.delivery_address?.town || "Delivery"}</Text>
            <Text style={styles.meta}>Payout: £{job.accepted_price ?? "0"}</Text>
            <View style={styles.row}>
              <Pressable style={styles.smallButton} onPress={() => advanceJob(job.id, "driver_en_route_to_pickup")}><Text style={styles.buttonText}>Accept</Text></Pressable>
              <Pressable style={styles.smallButton} onPress={() => advanceJob(job.id, "item_collected")}><Text style={styles.buttonText}>Picked up</Text></Pressable>
              <Pressable style={styles.smallButton} onPress={() => advanceJob(job.id, "delivered")}><Text style={styles.buttonText}>Delivered</Text></Pressable>
            </View>
          </View>
        ))}

        <Text style={styles.message}>{message}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#070a18" },
  container: { padding: 20, gap: 14 },
  title: { color: "#fff", fontSize: 32, fontWeight: "900" },
  card: { borderRadius: 14, backgroundColor: "#1a1f35", padding: 14, gap: 10 },
  label: { color: "#fff", fontWeight: "800", fontSize: 16 },
  input: { backgroundColor: "#0e1325", color: "#fff", borderRadius: 10, padding: 10 },
  button: { backgroundColor: "#6548ff", borderRadius: 10, padding: 12, alignItems: "center" },
  smallButton: { backgroundColor: "#32408a", borderRadius: 10, padding: 10, flex: 1, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700" },
  row: { flexDirection: "row", gap: 8 },
  meta: { color: "#c8d0ef" },
  message: { color: "#9db0f0", paddingBottom: 28 }
});
