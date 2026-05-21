import React, { useMemo, useState } from 'react';
import {
  Alert,
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

const mockBooking: Booking = {
  id: 'job-detail-1',
  status: 'driver_assigned',
  payment_status: 'paid',
  pickup_town: 'Tunbridge Wells',
  pickup_postcode: 'TN1',
  pickup_address_line: 'The Pantiles',
  delivery_town: 'Tonbridge',
  delivery_postcode: 'TN9',
  delivery_address_line: 'High Street',
  item_title: 'Mid-century sideboard',
  item_size: 'furniture',
  approximate_weight_kg: 55,
  fragile: true,
  requires_two_people: true,
  requires_van: true,
  delivery_quote_amount: 92,
  accepted_price: 92,
  driver_payout_amount: 61,
  driver_name: 'James',
  driver_vehicle: 'Ford Transit',
  pickup_stairs_floors: 1,
  delivery_stairs_floors: 0,
  created_at: new Date().toISOString(),
};

const progression: BookingStatus[] = [
  'driver_assigned',
  'driver_en_route_to_pickup',
  'driver_arrived_at_pickup',
  'pickup_verified',
  'item_collected',
  'driver_en_route_to_delivery',
  'driver_arrived_at_delivery',
  'delivery_verified',
  'delivered',
];

export default function JobDetailScreen() {
  const [booking, setBooking] = useState<Booking>(mockBooking);

  const nextStatus = useMemo(() => {
    const currentIndex = progression.indexOf(booking.status);

    if (currentIndex === -1 || currentIndex === progression.length - 1) {
      return null;
    }

    return progression[currentIndex + 1];
  }, [booking.status]);

  const updateStatus = () => {
    if (!nextStatus) {
      Alert.alert('Delivery complete', 'This job has already reached its final state.');
      return;
    }

    setBooking((previous) => ({
      ...previous,
      status: nextStatus,
    }));
  };

  const openMaps = async () => {
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
            />

            <ProofPhotoBox
              title="Delivery proof photo"
              subtitle="Capture delivered item and safe placement"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progress delivery</Text>

          <StatusButton
            label={
              nextStatus
                ? `Move to ${nextStatus.replace(/_/g, ' ')}`
                : 'Delivery complete'
            }
            onPress={updateStatus}
            disabled={!nextStatus}
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
});
