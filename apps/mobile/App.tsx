import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

const API_BASE = process.env.EXPO_PUBLIC_ADMIN_API_URL ?? "https://inventory-application-was4.onrender.com";

type JobStatus = "available" | "accepted" | "en_route" | "picked_up" | "delivered";

type DriverJob = {
  id: string;
  title: string;
  pickup: string;
  delivery: string;
  payout: string;
  distance: string;
  item: string;
  access: string;
  urgency: string;
  status: JobStatus;
};

const starterJobs: DriverJob[] = [
  {
    id: "demo-001",
    title: "Marketplace furniture pickup",
    pickup: "TN1 · Tunbridge Wells",
    delivery: "TN2 · St James",
    payout: "£22.40",
    distance: "3.1 miles",
    item: "Medium furniture item",
    access: "1 pickup flight · 0 delivery flights",
    urgency: "Scheduled today",
    status: "available"
  },
  {
    id: "demo-002",
    title: "Box collection",
    pickup: "TN4 · Southborough",
    delivery: "TN1 · Town centre",
    payout: "£13.80",
    distance: "2.4 miles",
    item: "Medium box",
    access: "No stairs",
    urgency: "Flexible",
    status: "available"
  }
];

function statusLabel(status: JobStatus) {
  if (status === "available") return "Available";
  if (status === "accepted") return "Accepted";
  if (status === "en_route") return "En route";
  if (status === "picked_up") return "Picked up";
  return "Delivered";
}

export default function App() {
  const [jobs, setJobs] = useState<DriverJob[]>(starterJobs);
  const [driverName, setDriverName] = useState("Driver");
  const [bookingId, setBookingId] = useState("");
  const [message, setMessage] = useState("Ready for jobs");

  const acceptedJobs = useMemo(() => jobs.filter((job) => job.status !== "available"), [jobs]);
  const availableJobs = useMemo(() => jobs.filter((job) => job.status === "available"), [jobs]);
  const deliveredCount = jobs.filter((job) => job.status === "delivered").length;

  function updateJob(jobId: string, status: JobStatus) {
    setJobs((current) => current.map((job) => (job.id === jobId ? { ...job, status } : job)));
    setMessage(`Job ${jobId} marked ${statusLabel(status).toLowerCase()}`);
  }

  async function pushStatusToApi(toStatus: string) {
    if (!bookingId.trim()) {
      Alert.alert("Booking ID needed", "Paste a real booking ID from the admin dashboard first.");
      return;
    }

    try {
      setMessage("Updating booking status...");
      const response = await fetch(`${API_BASE}/api/bookings/${bookingId.trim()}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStatus, actorRole: "driver" })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Status update failed");
      }

      setMessage(`Live booking updated: ${toStatus}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update booking");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Door in Four Driver</Text>
          <Text style={styles.title}>Your delivery cockpit.</Text>
          <Text style={styles.subtitle}>
            Accept local jobs, update progress, track payouts and keep dispatch informed without the faff.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Driver profile</Text>
          <TextInput value={driverName} onChangeText={setDriverName} style={styles.input} placeholder="Driver name" placeholderTextColor="#8a91a6" />
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{availableJobs.length}</Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{acceptedJobs.length}</Text>
              <Text style={styles.statLabel}>In progress</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{deliveredCount}</Text>
              <Text style={styles.statLabel}>Delivered</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Available jobs</Text>
        {availableJobs.map((job) => (
          <View key={job.id} style={styles.jobCard}>
            <View style={styles.jobHeader}>
              <Text style={styles.jobTitle}>{job.title}</Text>
              <Text style={styles.payout}>{job.payout}</Text>
            </View>
            <Text style={styles.jobMeta}>{job.pickup} → {job.delivery}</Text>
            <Text style={styles.jobMeta}>{job.item} · {job.distance}</Text>
            <Text style={styles.jobMeta}>{job.access}</Text>
            <Text style={styles.badge}>{job.urgency}</Text>
            <Pressable style={styles.primaryButton} onPress={() => updateJob(job.id, "accepted")}>
              <Text style={styles.primaryButtonText}>Accept job</Text>
            </Pressable>
          </View>
        ))}

        <Text style={styles.sectionTitle}>My active jobs</Text>
        {acceptedJobs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No active jobs yet</Text>
            <Text style={styles.emptyText}>Accept a job above and it will appear here with status controls.</Text>
          </View>
        ) : (
          acceptedJobs.map((job) => (
            <View key={job.id} style={styles.jobCard}>
              <View style={styles.jobHeader}>
                <Text style={styles.jobTitle}>{job.title}</Text>
                <Text style={styles.statusPill}>{statusLabel(job.status)}</Text>
              </View>
              <Text style={styles.jobMeta}>{job.pickup} → {job.delivery}</Text>
              <View style={styles.buttonGrid}>
                <Pressable style={styles.secondaryButton} onPress={() => updateJob(job.id, "en_route")}>
                  <Text style={styles.secondaryButtonText}>En route</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => updateJob(job.id, "picked_up")}>
                  <Text style={styles.secondaryButtonText}>Picked up</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => updateJob(job.id, "delivered")}>
                  <Text style={styles.secondaryButtonText}>Delivered</Text>
                </Pressable>
                <Pressable style={styles.photoButton} onPress={() => Alert.alert("Proof photo", "Photo upload comes next.")}>
                  <Text style={styles.secondaryButtonText}>Proof photo</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Test live booking status</Text>
          <Text style={styles.helperText}>Paste a real booking ID from the admin dashboard to test the live API.</Text>
          <TextInput value={bookingId} onChangeText={setBookingId} style={styles.input} placeholder="Booking ID" placeholderTextColor="#8a91a6" />
          <View style={styles.buttonGrid}>
            <Pressable style={styles.secondaryButton} onPress={() => pushStatusToApi("driver_en_route_to_pickup")}>
              <Text style={styles.secondaryButtonText}>API en route</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => pushStatusToApi("picked_up")}>
              <Text style={styles.secondaryButtonText}>API picked up</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => pushStatusToApi("delivered")}>
              <Text style={styles.secondaryButtonText}>API delivered</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Earnings preview</Text>
          <Text style={styles.earnings}>£36.20</Text>
          <Text style={styles.helperText}>Demo total from visible jobs. Live payout records come next.</Text>
        </View>

        <Text style={styles.footerMessage}>{message}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#070a18"
  },
  container: {
    padding: 20,
    gap: 18,
    paddingBottom: 44
  },
  hero: {
    paddingTop: 28,
    paddingBottom: 10
  },
  eyebrow: {
    color: "#bda8ff",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 3,
    textTransform: "uppercase"
  },
  title: {
    marginTop: 12,
    color: "#ffffff",
    fontSize: 42,
    lineHeight: 46,
    fontWeight: "900"
  },
  subtitle: {
    marginTop: 12,
    color: "#c9cedd",
    fontSize: 16,
    lineHeight: 24
  },
  card: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#191d2d",
    padding: 18,
    gap: 12
  },
  cardLabel: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900"
  },
  helperText: {
    color: "#b8becf",
    fontSize: 14,
    lineHeight: 20
  },
  input: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "#101421",
    color: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontWeight: "700"
  },
  statsRow: {
    flexDirection: "row",
    gap: 10
  },
  statBox: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "#24293a",
    padding: 14
  },
  statValue: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900"
  },
  statLabel: {
    marginTop: 4,
    color: "#b8becf",
    fontSize: 12,
    fontWeight: "800"
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 8
  },
  jobCard: {
    borderRadius: 26,
    backgroundColor: "#ffffff",
    padding: 18,
    gap: 10
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start"
  },
  jobTitle: {
    flex: 1,
    color: "#111527",
    fontSize: 19,
    fontWeight: "900"
  },
  payout: {
    color: "#6d35f5",
    fontSize: 18,
    fontWeight: "900"
  },
  jobMeta: {
    color: "#4b5568",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600"
  },
  badge: {
    alignSelf: "flex-start",
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#edfdf7",
    color: "#087a58",
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 12,
    fontWeight: "900"
  },
  primaryButton: {
    marginTop: 4,
    borderRadius: 999,
    backgroundColor: "#7c3df0",
    paddingVertical: 15,
    alignItems: "center"
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900"
  },
  buttonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  secondaryButton: {
    flexGrow: 1,
    borderRadius: 999,
    backgroundColor: "#eef0f7",
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center"
  },
  photoButton: {
    flexGrow: 1,
    borderRadius: 999,
    backgroundColor: "#e6ddff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center"
  },
  secondaryButtonText: {
    color: "#111527",
    fontSize: 13,
    fontWeight: "900"
  },
  statusPill: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#ede7ff",
    color: "#5a2de2",
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 12,
    fontWeight: "900"
  },
  emptyCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#151a2a",
    padding: 18
  },
  emptyTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900"
  },
  emptyText: {
    marginTop: 6,
    color: "#b8becf",
    fontSize: 14,
    lineHeight: 20
  },
  earnings: {
    color: "#ffffff",
    fontSize: 44,
    fontWeight: "900"
  },
  footerMessage: {
    color: "#c9cedd",
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700"
  }
});
