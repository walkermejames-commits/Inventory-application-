import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import MoneyPill from './MoneyPill';
import { Booking } from '../types/booking';
import { colors } from '../theme/colors';

interface Props {
  booking: Booking;
  onPress: () => void;
}

export default function JobCard({ booking, onPress }: Props) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <Text style={styles.route}>
          {booking.pickup_town} → {booking.delivery_town}
        </Text>

        <MoneyPill
          amount={
            booking.driver_payout_amount ??
            booking.accepted_price ??
            booking.delivery_quote_amount
          }
        />
      </View>

      <Text style={styles.status}>
        {booking.status.replace(/_/g, ' ')}
      </Text>

      <Text style={styles.item}>{booking.item_title}</Text>

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
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  route: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '800',
    flex: 1,
  },
  status: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  item: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 8,
  },
  flags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  flag: {
    color: colors.text,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    overflow: 'hidden',
  },
});
