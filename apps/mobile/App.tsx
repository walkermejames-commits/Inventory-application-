import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";

const API_BASE = process.env.EXPO_PUBLIC_ADMIN_API_URL ?? "https://inventory-application-was4.onrender.com";

type ApiJob = {
  id: string;
  status: string;
  accepted_price: number | null;
  pickup_contact?: { town?: string; postcode?: string } | null;
  delivery_address?: { town?: string; postcode?: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  driver_assigned: "#3b82f6",
  driver_en_route_to_pickup: "#3b82f6",
  driver_arrived_at_pickup: "#eab308",
  pickup_verified: "#22c55e",
  item_collected: "#22c55e",
  driver_en_route_to_delivery: "#3b82f6",
  driver_arrived_at_delivery: "#eab308",
  delivery_verified: "#22c55e",
  delivered: "#16a34a",
  completed: "#15803d",
};

export default function App() {
  const [driverId, setDriverId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [message, setMessage] = useState("Welcome! Sign up or enter your Driver ID to get started.");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verification form state
  const [pendingAction, setPendingAction] = useState<{ jobId: string; toStatus: string; label: string } | null>(null);
  const [sellerCode, setSellerCode] = useState("");
  const [buyerCode, setBuyerCode] = useState("");
  const [photoPath, setPhotoPath] = useState("");

  const inProgress = useMemo(() => jobs.filter((job) => !["delivered", "completed"].includes(job.status)).length, [jobs]);

  // Persist driver ID
  useEffect(() => {
    const loadSavedDriver = async () => {
      try {
        const savedId = await AsyncStorage.getItem("driverId");
        if (savedId) {
          setDriverId(savedId);
          await fetchJobs(savedId);
        }
      } catch (e) {
        // ignore
      }
    };
    loadSavedDriver();
  }, []);

  const saveDriverId = async (id: string) => {
    try {
      await AsyncStorage.setItem("driverId", id);
    } catch (e) {
      // ignore persistence error
    }
  };

  async function signUpDriver() {
    if (!fullName.trim() || !email.trim()) {
      Alert.alert("Missing info", "Please enter your full name and email.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    setMessage("Creating your driver profile...");
    try {
      const response = await fetch(`${API_BASE}/api/drivers/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: fullName.trim(), email: email.trim().toLowerCase(), phone: phone.trim() || null, serviceRadiusMiles: 15 })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Signup failed");

      const newDriverId = payload.driverId;
      setDriverId(newDriverId);
      await saveDriverId(newDriverId);
      setMessage(`✅ Driver profile created! ID: ${newDriverId.slice(0, 8)}...`);
      await fetchJobs(newDriverId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not sign up");
      Alert.alert("Signup error", error instanceof Error ? error.message : "Please try again");
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchJobs(overrideId?: string) {
    const id = (overrideId || driverId).trim();
    if (!id) {
      Alert.alert("Driver ID needed", "Please sign up or paste your Driver ID first.");
      return;
    }

    setIsLoading(true);
    setMessage("Loading your assigned jobs...");
    try {
      const response = await fetch(`${API_BASE}/api/drivers/jobs?driverId=${encodeURIComponent(id)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load jobs");

      setJobs(payload.jobs || []);
      setMessage(`Loaded ${(payload.jobs || []).length} job(s). Pull to refresh or tap a button below.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load jobs");
      Alert.alert("Load error", error instanceof Error ? error.message : "Check your connection");
    } finally {
      setIsLoading(false);
    }
  }

  function getNextActions(status: string) {
    const actions: { label: string; toStatus: string; requiresVerification?: boolean }[] = [];

    switch (status) {
      case "driver_assigned":
        actions.push({ label: "En route to pickup", toStatus: "driver_en_route_to_pickup" });
        break;
      case "driver_en_route_to_pickup":
        actions.push({ label: "Arrived at pickup", toStatus: "driver_arrived_at_pickup" });
        break;
      case "driver_arrived_at_pickup":
        actions.push({ label: "Verify pickup & collect", toStatus: "pickup_verified", requiresVerification: true });
        break;
      case "pickup_verified":
      case "item_collected":
        actions.push({ label: "Item collected", toStatus: "item_collected" });
        break;
      case "item_collected":
        actions.push({ label: "En route to delivery", toStatus: "driver_en_route_to_delivery" });
        break;
      case "driver_en_route_to_delivery":
        actions.push({ label: "Arrived at delivery", toStatus: "driver_arrived_at_delivery" });
        break;
      case "driver_arrived_at_delivery":
        actions.push({ label: "Verify delivery", toStatus: "delivery_verified", requiresVerification: true });
        break;
      case "delivery_verified":
        actions.push({ label: "Mark delivered", toStatus: "delivered" });
        break;
      case "delivered":
        actions.push({ label: "Complete job", toStatus: "completed" });
        break;
    }
    return actions;
  }

  async function pickProofPhoto() {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.6,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets.length > 0) {
        setPhotoPath(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert("Camera error", "Could not open camera. You can type a photo path instead.");
    }
  }

  async function advanceJob(jobId: string, toStatus: string, requiresVerification = false) {
    if (isSubmitting) return;

    if (requiresVerification) {
      // Open verification form
      setPendingAction({ jobId, toStatus, label: getNextActions(jobs.find(j => j.id === jobId)?.status || "")[0]?.label || toStatus });
      setSellerCode("");
      setBuyerCode("");
      setPhotoPath("");
      return;
    }

    await submitProgressUpdate(jobId, toStatus, "", "", "");
  }

  async function submitProgressUpdate(jobId: string, toStatus: string, sellerCodeVal: string, buyerCodeVal: string, photoPathVal: string) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setMessage(`Submitting ${toStatus}...`);

    try {
      const body: any = { driverId, toStatus };

      if (["pickup_verified", "delivery_verified", "delivered"].includes(toStatus)) {
        if (toStatus === "pickup_verified" && !sellerCodeVal.trim()) {
          Alert.alert("Required", "Seller handover code is required");
          setIsSubmitting(false);
          return;
        }
        if (["delivery_verified", "delivered"].includes(toStatus) && !buyerCodeVal.trim()) {
          Alert.alert("Required", "Buyer delivery code is required");
          setIsSubmitting(false);
          return;
        }
        if (!photoPathVal.trim()) {
          Alert.alert("Required", "Proof photo is required for verification");
          setIsSubmitting(false);
          return;
        }

        if (toStatus === "pickup_verified") body.sellerCode = sellerCodeVal.trim();
        if (["delivery_verified", "delivered"].includes(toStatus)) body.buyerCode = buyerCodeVal.trim();
        body.photoPath = photoPathVal.trim();
      } else {
        body.sellerCode = "";
        body.buyerCode = "";
        body.photoPath = "";
      }

      const response = await fetch(`${API_BASE}/api/drivers/jobs/${jobId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Update failed");

      setPendingAction(null);
      setSellerCode("");
      setBuyerCode("");
      setPhotoPath("");

      await fetchJobs();
      setMessage(`✅ Job updated to ${toStatus}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update job");
      Alert.alert("Update failed", error instanceof Error ? error.message : "Please try again");
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleConfirmVerification = () => {
    if (!pendingAction) return;
    submitProgressUpdate(
      pendingAction.jobId,
      pendingAction.toStatus,
      sellerCode,
      buyerCode,
      photoPath
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.container} refreshControl={undefined}>
        <Text style={styles.title}>Door in Four</Text>
        <Text style={styles.subtitle}>Driver Field App</Text>

        {/* Onboarding / Driver ID */}
        <View style={styles.card}>
          <Text style={styles.label}>Driver Onboarding</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor="#64748b"
            autoCapitalize="words"
          />
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#64748b"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
            placeholder="Phone number (optional)"
            placeholderTextColor="#64748b"
            keyboardType="phone-pad"
          />
          <Pressable
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={signUpDriver}
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create / Update Driver Profile</Text>}
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Your Driver ID</Text>
          <TextInput
            value={driverId}
            onChangeText={setDriverId}
            style={styles.input}
            placeholder="Paste or enter your Driver ID"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
          />
          <View style={styles.row}>
            <Pressable
              style={[styles.button, styles.flex1, isLoading && styles.buttonDisabled]}
              onPress={() => fetchJobs()}
              disabled={isLoading || !driverId.trim()}
            >
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Load My Jobs</Text>}
            </Pressable>
            <Pressable
              style={[styles.secondaryButton, styles.flex1]}
              onPress={() => { if (driverId) saveDriverId(driverId); fetchJobs(); }}
            >
              <Text style={styles.buttonText}>Save ID & Refresh</Text>
            </Pressable>
          </View>
          <Text style={styles.meta}>Jobs in progress: {inProgress}</Text>
        </View>

        {/* Verification Form (shown when needed) */}
        {pendingAction && (
          <View style={styles.verificationCard}>
            <Text style={styles.label}>Verify Step: {pendingAction.label}</Text>
            <Text style={styles.meta}>Job #{pendingAction.jobId.slice(0, 8)}</Text>

            {pendingAction.toStatus === "pickup_verified" && (
              <TextInput
                value={sellerCode}
                onChangeText={setSellerCode}
                style={styles.input}
                placeholder="Seller handover code"
                placeholderTextColor="#64748b"
              />
            )}
            {["delivery_verified", "delivered"].includes(pendingAction.toStatus) && (
              <TextInput
                value={buyerCode}
                onChangeText={setBuyerCode}
                style={styles.input}
                placeholder="Buyer delivery code"
                placeholderTextColor="#64748b"
              />
            )}

            <TextInput
              value={photoPath}
              onChangeText={setPhotoPath}
              style={styles.input}
              placeholder="Photo path / URI (or tap button below)"
              placeholderTextColor="#64748b"
            />

            <Pressable style={styles.photoButton} onPress={pickProofPhoto}>
              <Text style={styles.buttonText}>📷 Take Proof Photo</Text>
            </Pressable>

            <View style={styles.row}>
              <Pressable
                style={[styles.button, styles.flex1, isSubmitting && styles.buttonDisabled]}
                onPress={handleConfirmVerification}
                disabled={isSubmitting}
              >
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Confirm & Submit</Text>}
              </Pressable>
              <Pressable
                style={[styles.secondaryButton, styles.flex1]}
                onPress={() => {
                  setPendingAction(null);
                  setSellerCode("");
                  setBuyerCode("");
                  setPhotoPath("");
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Jobs List */}
        {jobs.length === 0 && !isLoading && (
          <View style={styles.card}>
            <Text style={styles.meta}>No jobs yet. Sign up or load your jobs above.</Text>
          </View>
        )}

        {jobs.map((job) => {
          const pickup = job.pickup_contact || {};
          const delivery = job.delivery_address || {};
          const nextActions = getNextActions(job.status);
          const statusColor = STATUS_COLORS[job.status] || "#64748b";

          return (
            <View key={job.id} style={styles.jobCard}>
              <View style={styles.jobHeader}>
                <Text style={styles.bookingId}>Booking #{job.id.slice(0, 8)}</Text>
                <View style={[styles.statusPill, { backgroundColor: statusColor }]}>
                  <Text style={styles.statusText}>{job.status.replace(/_/g, " ")}</Text>
                </View>
              </View>

              <Text style={styles.route}>
                📍 {pickup.town || "Pickup town"} ({pickup.postcode || "?"})
              </Text>
              <Text style={styles.route}>
                ➡️ {delivery.town || "Delivery town"} ({delivery.postcode || "?"})
              </Text>

              <Text style={styles.payout}>£{(job.accepted_price ?? 0).toFixed(2)} payout</Text>

              <View style={styles.actionsRow}>
                {nextActions.length > 0 ? (
                  nextActions.map((action, idx) => (
                    <Pressable
                      key={idx}
                      style={[styles.actionButton, isSubmitting && styles.buttonDisabled]}
                      onPress={() => advanceJob(job.id, action.toStatus, action.requiresVerification)}
                      disabled={isSubmitting}
                    >
                      <Text style={styles.actionButtonText}>{action.label}</Text>
                    </Pressable>
                  ))
                ) : (
                  <Text style={styles.meta}>Job complete — no further actions</Text>
                )}
              </View>
            </View>
          );
        })}

        <Text style={styles.message}>{message}</Text>

        <Pressable style={styles.refreshButton} onPress={() => fetchJobs()}>
          <Text style={styles.refreshText}>🔄 Refresh Jobs</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0a0f1e" },
  container: { padding: 16, gap: 16 },
  title: { color: "#fff", fontSize: 28, fontWeight: "900", textAlign: "center" },
  subtitle: { color: "#94a3b8", fontSize: 14, textAlign: "center", marginBottom: 8 },
  card: { backgroundColor: "#1e2937", borderRadius: 16, padding: 16, gap: 12 },
  jobCard: { backgroundColor: "#1e2937", borderRadius: 16, padding: 16, gap: 10, borderLeftWidth: 5, borderLeftColor: "#3b82f6" },
  jobHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bookingId: { color: "#fff", fontSize: 16, fontWeight: "700" },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { color: "#fff", fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  route: { color: "#e2e8f0", fontSize: 15, fontWeight: "600" },
  payout: { color: "#22c55e", fontSize: 20, fontWeight: "800", marginTop: 4 },
  label: { color: "#fff", fontWeight: "800", fontSize: 15 },
  input: { backgroundColor: "#0f172a", color: "#fff", borderRadius: 10, padding: 12, fontSize: 15 },
  button: { backgroundColor: "#6366f1", borderRadius: 12, padding: 14, alignItems: "center", justifyContent: "center" },
  secondaryButton: { backgroundColor: "#334155", borderRadius: 12, padding: 14, alignItems: "center", justifyContent: "center" },
  photoButton: { backgroundColor: "#475569", borderRadius: 12, padding: 12, alignItems: "center" },
  actionButton: { backgroundColor: "#3b82f6", borderRadius: 10, paddingVertical: 12, paddingHorizontal: 8, flex: 1, alignItems: "center" },
  actionButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  buttonDisabled: { opacity: 0.6 },
  flex1: { flex: 1 },
  row: { flexDirection: "row", gap: 10 },
  actionsRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  meta: { color: "#94a3b8", fontSize: 13 },
  message: { color: "#64748b", textAlign: "center", paddingVertical: 12, fontSize: 13 },
  verificationCard: { backgroundColor: "#334155", borderRadius: 16, padding: 16, gap: 12, borderWidth: 2, borderColor: "#eab308" },
  refreshButton: { alignSelf: "center", marginTop: 8, padding: 10 },
  refreshText: { color: "#64748b", fontSize: 14 },
});