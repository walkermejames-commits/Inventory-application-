import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import MoneyPill from '../components/MoneyPill';
import ProofPhotoBox from '../components/ProofPhotoBox';
import StatusButton from '../components/StatusButton';
import { Booking, BookingStatus } from '../types/booking';
import { colors } from '../theme/colors';
import { fetchJobDetail, progressJobStatus, respondToJob } from '../lib/adminApi';

const progression: BookingStatus[] = [
  'driver_en_route_to_pickup',
  'driver_arrived_at_pickup',
  'pickup_verified',
  'item_collected',
  'driver_en_route_to_delivery',
  'driver_arrived_at_delivery',
  'delivery_verified',
  'delivered',
];

export default function JobDetailScreen({ route, navigation }: any) {
  const bookingId = route?.params?.bookingId;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadJob = useCallback(async () => {
    if (!bookingId) {
      setBooking(null);
      setError('No booking selected');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const nextBooking = await fetchJobDetail(bookingId);
      setBooking(nextBooking);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load job');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadJob();
  }, [loadJob]);

  const nextStatus = useMemo(() => {
    if (!booking) return null;

    const currentIndex = progression.indexOf(booking.status);

    if (currentIndex === -1 || currentIndex === progression.length - 1) {
      return null;
    }

    return progression[currentIndex + 1];
  }, [booking]);

  const acceptJob = async () => {
    if (!booking) return;

    try {
      setActionLoading('accept');
      await respondToJob(booking.id, 'accepted');
      await loadJob();
    } catch (err) {
      Alert.alert('Could not accept job', err instanceof Error ? err.message : 'Try again shortly.');
    } finally {
      setActionLoading(null);
    }
  };

  const rejectJob = async () => {
    if (!booking) return;

    try {
      setActionLoading('reject');
      await respondToJob(booking.id, 'rejected');
      navigation.navigate('Jobs');
    } catch (err) {
      Alert.alert('Could not reject job', err instanceof Error ? err.message : 'Try again shortly.');
    } finally {
      setActionLoading(null);
    }
  };

  const updateStatus = async () => {
    if (!booking) return;

    if (!nextStatus) {
      Alert.alert('Delivery complete', 'This job has already reached its final state.');
      return;
    }

    try {
      setActionLoading('progress');
      // TODO: pass pickup/delivery proof path, captured timestamp, and GPS once native upload is wired.
      const updated = await progressJobStatus(booking.id, nextStatus);
      setBooking(updated);
    } catch (err) {
      Alert.alert('Could not update job', err instanceof Error ? err.message : 'Try again shortly.');
    } finally {
      setActionLoading(null);
    }
  };

  const openMaps = async () => {
    if (!booking) return;

    const destination = encodeURIComponent(
      `${booking.delivery_address_line || ''} ${booking.delivery_postcode || ''}`
    );

    const url = `https://www.google.com/maps/search/?api=1&query=${destination}`;

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Unable to open maps');
    }
  };

  const showProofTodo = (proofType: 'pickup' | 'delivery') => {
    Alert.alert(
      'Proof upload pending',
      `${proofType === 'pickup' ? 'Pickup' : 'Delivery'} proof capture will attach photo, timestamp, and GPS in the next native upload pass.`
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.centerTitle}>Loading job</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerState}>
          <Text style={styles.centerTitle}>Could not load job</Text>
          <Text style={styles.centerText}>{error}</Text>
          <StatusButton label="Retry" onPress={loadJob} />
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerState}>
          <Text style={styles.centerTitle}>Job not found</Text>
          <Text style={styles.centerText}>This job may no longer be assigned to you.</Text>
          <StatusButton label="Back to jobs" onPress={() => navigation.navigate('Jobs')} tone="muted" />
        </View>
      </SafeAreaView>
    );
  }

  const isAssignedAwaitingResponse = booking.status === 'driver_assigned';

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

          <Text style={styles.status}>
            {booking.status.replace(/_/g, ' ')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Item</Text>

          <Text style={styles.itemTitle}>{booking.item_title}</Text>

          <Text style={styles.meta}>
            {booking.item_size} • {booking.approximate_weight_kg}kg
          </Text>

          <View style={styles.flags}>
            {booking.fragile && (
              <Text style={styles.flag}>⚠ Fragile</Text>
            )}

            {booking.requires_two_people && (
              <Text style={styles.flag}>👥 Two-person</Text>
            )}

            {booking.requires_van && (
              <Text style={styles.flag}>🚐 Van required</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pickup</Text>

          <Text style={styles.locationTitle}>{booking.pickup_town}</Text>

          <Text style={styles.locationText}>
            {booking.pickup_address_line || 'Address pending'}
          </Text>

          <Text style={styles.locationText}>
            {booking.pickup_postcode || 'Postcode pending'}
          </Text>

          {!!booking.pickup_stairs_floors && (
            <Text style={styles.locationMeta}>
              {booking.pickup_stairs_floors} pickup flight(s)
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery</Text>

          <Text style={styles.locationTitle}>{booking.delivery_town}</Text>

          <Text style={styles.locationText}>
            {booking.delivery_address_line || 'Address pending'}
          </Text>

          <Text style={styles.locationText}>
            {booking.delivery_postcode || 'Postcode pending'}
          </Text>

          {!!booking.delivery_stairs_floors && (
            <Text style={styles.locationMeta}>
              {booking.delivery_stairs_floors} delivery flight(s)
            </Text>
          )}
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.mapsButton}
          onPress={openMaps}
        >
          <Text style={styles.mapsButtonText}>Open in Google Maps</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Proof</Text>

          <View style={styles.photoStack}>
            <ProofPhotoBox
              title="Pickup proof photo"
              subtitle="Capture item condition before loading"
              onPress={() => showProofTodo('pickup')}
            />

            <ProofPhotoBox
              title="Delivery proof photo"
              subtitle="Capture delivered item and safe placement"
              onPress={() => showProofTodo('delivery')}
            />
          </View>
        </View>

        {isAssignedAwaitingResponse ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assignment response</Text>

            <View style={styles.actionRow}>
              <View style={styles.actionButton}>
                <StatusButton
                  label={actionLoading === 'accept' ? 'Accepting...' : 'Accept Job'}
                  onPress={acceptJob}
                  disabled={Boolean(actionLoading)}
                />
              </View>

              <View style={styles.actionButton}>
                <StatusButton
                  label={actionLoading === 'reject' ? 'Rejecting...' : 'Reject Job'}
                  onPress={rejectJob}
                  disabled={Boolean(actionLoading)}
                  tone="danger"
                />
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Progress delivery</Text>

            <StatusButton
              label={
                actionLoading === 'progress'
                  ? 'Updating...'
                  : nextStatus
                    ? `Move to ${nextStatus.replace(/_/g, ' ')}`
                    : 'Delivery complete'
              }
              onPress={updateStatus}
              disabled={!nextStatus || Boolean(actionLoading)}
            />
          </View>
        )}
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
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  kicker: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 6,
  },
  route: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    maxWidth: 220,
  },
  status: {
    marginTop: 16,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontSize: 13,
    fontWeight: '700',
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
    fontWeight: '800',
    marginBottom: 16,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  meta: {
    color: colors.textSecondary,
    marginTop: 8,
    fontSize: 15,
  },
  flags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  flag: {
    color: colors.text,
    backgroundColor: colors.card,
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '700',
  },
  locationTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  locationText: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 24,
  },
  locationMeta: {
    color: colors.warning,
    marginTop: 12,
    fontWeight: '700',
  },
  mapsButton: {
    backgroundColor: colors.accent,
    borderRadius: 22,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapsButtonText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 16,
  },
  photoStack: {
    gap: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  centerState: {
    flex: 1,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  centerTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  centerText: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
