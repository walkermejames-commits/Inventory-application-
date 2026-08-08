import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";

import MoneyPill from "../components/MoneyPill";
import ProofPhotoBox from "../components/ProofPhotoBox";
import StatusButton from "../components/StatusButton";
import { colors } from "../theme/colors";
import type { Booking } from "../types/booking";
import type { RootStackParamList } from "../navigation/types";
import { getMobileConfigErrors } from "../lib/config";
import {
  advanceDriverJobProgress,
  DriverApiError,
  fetchDriverJob,
  uploadProofPhoto,
} from "../lib/driverApi";
import {
  getNextDriverStatus,
  isVerificationStep,
} from "../lib/driverProgress";
import { getPilotMode } from "../lib/config";

type Props = NativeStackScreenProps<RootStackParamList, "JobDetail">;

export default function JobDetailScreen({ route }: Props) {
  const bookingId = route.params?.bookingId?.trim() || "";

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sellerCode, setSellerCode] = useState("");
  const [buyerCode, setBuyerCode] = useState("");
  const [pickupPhotoPath, setPickupPhotoPath] = useState<string | null>(null);
  const [deliveryPhotoPath, setDeliveryPhotoPath] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const configErrors = useMemo(() => getMobileConfigErrors(), []);
  const pilotMode = useMemo(() => getPilotMode(), []);

  const loadBooking = useCallback(async () => {
    if (!bookingId) {
      setError("No bookingId provided. Open a job from the jobs list.");
      setBooking(null);
      setLoading(false);
      return;
    }

    if (configErrors.length) {
      setError(configErrors.join("\n"));
      setBooking(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const job = await fetchDriverJob(bookingId);
      setBooking(job);
      setError(null);
    } catch (err) {
      const message =
        err instanceof DriverApiError
          ? [err.message, err.detail].filter(Boolean).join(" — ")
          : err instanceof Error
            ? err.message
            : "Could not load job";
      setError(message);
      setBooking(null);
    } finally {
      setLoading(false);
    }
  }, [bookingId, configErrors]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  const nextStatus = useMemo(
    () => (booking ? getNextDriverStatus(booking.status) : null),
    [booking]
  );

  const pickProofPhoto = async (kind: "pickup" | "delivery") => {
    if (!booking) return;
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Camera permission needed",
          "Allow camera access to capture proof photos."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.55,
        allowsEditing: false,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert(
          "Photo capture failed",
          "Camera did not return image data. Try again."
        );
        return;
      }

      setUploadingPhoto(true);
      const photoType = kind === "pickup" ? "pickup_proof" : "delivery_proof";
      const storagePath = await uploadProofPhoto({
        bookingId: booking.id,
        photoType,
        base64: asset.base64,
        contentType: asset.mimeType || "image/jpeg",
      });

      if (kind === "pickup") {
        setPickupPhotoPath(storagePath);
      } else {
        setDeliveryPhotoPath(storagePath);
      }
      Alert.alert("Proof uploaded", "Photo stored securely for this booking.");
    } catch (err) {
      const message =
        err instanceof DriverApiError
          ? [err.message, err.detail].filter(Boolean).join("\n")
          : err instanceof Error
            ? err.message
            : "Could not capture/upload photo";
      Alert.alert("Photo failed", message);
      // Do not set local path — verification cannot proceed without server path
    } finally {
      setUploadingPhoto(false);
    }
  };

  const updateStatus = async () => {
    if (!booking || !nextStatus || submitting) {
      if (!nextStatus) {
        Alert.alert("Delivery complete", "This job has already reached completed.");
      }
      return;
    }

    // Preflight verification requirements before calling API
    if (nextStatus === "pickup_verified") {
      if (!sellerCode.trim() || !pickupPhotoPath) {
        Alert.alert(
          "Pickup verification required",
          "Enter the seller handover code and capture a pickup proof photo before continuing."
        );
        return;
      }
    }

    if (nextStatus === "delivery_verified") {
      if (!buyerCode.trim() || !deliveryPhotoPath) {
        Alert.alert(
          "Delivery verification required",
          "Enter the buyer delivery code and capture a delivery proof photo before continuing."
        );
        return;
      }
    }

    setSubmitting(true);
    const previousStatus = booking.status;

    try {
      const result = await advanceDriverJobProgress({
        bookingId: booking.id,
        fromStatus: booking.status,
        sellerCode: nextStatus === "pickup_verified" ? sellerCode : undefined,
        buyerCode: nextStatus === "delivery_verified" ? buyerCode : undefined,
        photoPath:
          nextStatus === "pickup_verified"
            ? pickupPhotoPath || undefined
            : nextStatus === "delivery_verified"
              ? deliveryPhotoPath || undefined
              : undefined,
      });

      // Never keep optimistic state — prefer server booking, else full refresh
      if (result.booking) {
        setBooking(result.booking);
      } else {
        await loadBooking();
      }
      setError(null);

      if (nextStatus === "pickup_verified") {
        setSellerCode("");
      }
      if (nextStatus === "delivery_verified") {
        setBuyerCode("");
      }
    } catch (err) {
      // Do not change local status on failure (still at previousStatus)
      const message =
        err instanceof DriverApiError
          ? [err.message, err.detail].filter(Boolean).join("\n")
          : err instanceof Error
            ? err.message
            : "Progress update failed";

      Alert.alert("Could not update status", message);
      setError(message);
      // Ensure UI still reflects server truth
      try {
        const fresh = await fetchDriverJob(booking.id);
        setBooking(fresh);
        if (fresh.status !== previousStatus) {
          // Server moved somehow; keep server truth
        }
      } catch {
        // keep last known booking; status was never optimistically changed
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openMaps = async () => {
    if (!booking) return;
    const destination = encodeURIComponent(
      `${booking.delivery_address_line || ""} ${booking.delivery_postcode || ""}`.trim()
    );
    const url = `https://www.google.com/maps/search/?api=1&query=${destination}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Unable to open maps");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.loadingText}>Loading job…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Job unavailable</Text>
          <Text style={styles.errorText}>{error || "Unknown error"}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadBooking}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const needsPickupProof = nextStatus === "pickup_verified";
  const needsDeliveryProof = nextStatus === "delivery_verified";
  const showPickupCode = needsPickupProof || isVerificationStep(booking.status);
  const showDeliveryCode =
    needsDeliveryProof ||
    booking.status === "delivery_verified" ||
    booking.status === "delivered" ||
    booking.status === "completed";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.kicker}>LIVE DELIVERY</Text>
              <Text style={styles.route}>
                {booking.pickup_town} → {booking.delivery_town}
              </Text>
            </View>
            <MoneyPill amount={booking.driver_payout_amount} />
          </View>
          <Text style={styles.status}>{booking.status.replace(/_/g, " ")}</Text>
          <Text style={styles.bookingId}>#{booking.id.slice(0, 8)}</Text>
          {pilotMode ? (
            <Text style={styles.pilotBadge}>
              PRIVATE PILOT MODE — shared mobile secret, not production auth
            </Text>
          ) : null}
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorTitle}>Notice</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Item</Text>
          <Text style={styles.itemTitle}>{booking.item_title}</Text>
          <Text style={styles.meta}>
            {booking.item_size} • {booking.approximate_weight_kg}kg
          </Text>
          <View style={styles.flags}>
            {booking.fragile ? <Text style={styles.flag}>⚠ Fragile</Text> : null}
            {booking.requires_two_people ? (
              <Text style={styles.flag}>👥 Two-person</Text>
            ) : null}
            {booking.requires_van ? (
              <Text style={styles.flag}>🚐 Van required</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pickup</Text>
          <Text style={styles.locationTitle}>{booking.pickup_town}</Text>
          <Text style={styles.locationText}>
            {booking.pickup_address_line || "Address pending"}
          </Text>
          <Text style={styles.locationText}>
            {booking.pickup_postcode || "Postcode pending"}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery</Text>
          <Text style={styles.locationTitle}>{booking.delivery_town}</Text>
          <Text style={styles.locationText}>
            {booking.delivery_address_line || "Address pending"}
          </Text>
          <Text style={styles.locationText}>
            {booking.delivery_postcode || "Postcode pending"}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.mapsButton}
          onPress={openMaps}
        >
          <Text style={styles.mapsButtonText}>Open in Google Maps</Text>
        </TouchableOpacity>

        {(needsPickupProof || needsDeliveryProof || showPickupCode || showDeliveryCode) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Verification & proof</Text>

            {needsPickupProof || showPickupCode ? (
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Seller handover code</Text>
                <TextInput
                  value={sellerCode}
                  onChangeText={setSellerCode}
                  placeholder="Enter seller code"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                  autoCapitalize="characters"
                  editable={needsPickupProof}
                />
                <ProofPhotoBox
                  title={
                    pickupPhotoPath
                      ? "Pickup proof photo ready"
                      : "Pickup proof photo"
                  }
                  subtitle={
                    pickupPhotoPath
                      ? "Tap to retake"
                      : "Required before pickup_verified"
                  }
                  onPress={() => pickProofPhoto("pickup")}
                />
              </View>
            ) : null}

            {needsDeliveryProof ||
            booking.status === "driver_arrived_at_delivery" ||
            booking.status === "delivery_verified" ? (
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Buyer delivery code</Text>
                <TextInput
                  value={buyerCode}
                  onChangeText={setBuyerCode}
                  placeholder="Enter buyer code"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                  autoCapitalize="characters"
                  editable={needsDeliveryProof}
                />
                <ProofPhotoBox
                  title={
                    deliveryPhotoPath
                      ? "Delivery proof photo ready"
                      : "Delivery proof photo"
                  }
                  subtitle={
                    deliveryPhotoPath
                      ? "Tap to retake"
                      : "Required before delivery_verified"
                  }
                  onPress={() => pickProofPhoto("delivery")}
                />
              </View>
            ) : null}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progress delivery</Text>
          <Text style={styles.helperText}>
            Status advances one step at a time on the server. Failed API calls do not
            change local status.
          </Text>
          <StatusButton
            label={
              uploadingPhoto
                ? "Uploading proof…"
                : submitting
                  ? "Updating…"
                  : nextStatus
                    ? `Move to ${nextStatus.replace(/_/g, " ")}`
                    : booking.status === "completed"
                      ? "Completed"
                      : "Delivery complete"
            }
            onPress={updateStatus}
            disabled={!nextStatus || submitting || uploadingPhoto}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 22,
    paddingBottom: 120,
    gap: 18,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 12,
  },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  kicker: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 6,
  },
  route: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900",
    maxWidth: 220,
  },
  status: {
    marginTop: 16,
    color: colors.textSecondary,
    textTransform: "uppercase",
    fontSize: 13,
    fontWeight: "700",
  },
  bookingId: {
    marginTop: 6,
    color: colors.textSecondary,
    fontSize: 12,
  },
  pilotBadge: {
    marginTop: 12,
    color: colors.warning,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  meta: {
    color: colors.textSecondary,
    marginTop: 8,
    fontSize: 15,
  },
  flags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  flag: {
    color: colors.text,
    backgroundColor: colors.card,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: "700",
  },
  locationTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
  },
  locationText: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 24,
  },
  mapsButton: {
    backgroundColor: colors.accent,
    borderRadius: 22,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  mapsButtonText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 16,
  },
  fieldBlock: {
    gap: 12,
    marginBottom: 16,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontWeight: "700",
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 2,
  },
  helperText: {
    color: colors.textSecondary,
    marginBottom: 14,
    lineHeight: 20,
    fontSize: 13,
  },
  errorBanner: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.surface,
    padding: 16,
  },
  errorTitle: {
    color: colors.danger,
    fontWeight: "900",
    marginBottom: 6,
    fontSize: 16,
  },
  errorText: {
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryText: {
    color: "#000",
    fontWeight: "900",
  },
});
