import React, { useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import JobCard from '../components/JobCard';
import { Booking } from '../types/booking';
import { colors } from '../theme/colors';

const mockBookings: Booking[] = [
  {
    id: 'job-1',
    status: 'paid_awaiting_dispatch',
    payment_status: 'paid',
    pickup_town: 'Tunbridge Wells',
    delivery_town: 'Tonbridge',
    item_title: 'Vintage oak desk',
    item_size: 'furniture',
    approximate_weight_kg: 42,
    fragile: true,
    requires_two_people: true,
    requires_van: true,
    delivery_quote_amount: 86,
    accepted_price: 86,
    driver_payout_amount: 58,
    created_at: new Date().toISOString(),
  },
  {
    id: 'job-2',
    status: 'driver_assigned',
    payment_status: 'paid',
    pickup_town: 'Sevenoaks',
    delivery_town: 'Maidstone',
    item_title: 'Marketplace TV cabinet',
    item_size: 'large',
    approximate_weight_kg: 28,
    fragile: false,
    requires_two_people: false,
    requires_van: true,
    delivery_quote_amount: 52,
    accepted_price: 52,
    driver_payout_amount: 35,
    created_at: new Date().toISOString(),
  },
];

export default function JobsScreen({ navigation }: any) {
  const [refreshing, setRefreshing] = useState(false);
  const [jobs] = useState<Booking[]>(mockBookings);

  const activeJobs = useMemo(
    () => jobs.filter(job => job.status !== 'completed' && job.status !== 'cancelled'),
    [jobs]
  );

  const onRefresh = async () => {
    setRefreshing(true);

    await new Promise(resolve => setTimeout(resolve, 1000));

    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>DOOR IN FOUR</Text>
          <Text style={styles.title}>Driver Jobs</Text>
        </View>

        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.profileText}>Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{activeJobs.length}</Text>
          <Text style={styles.statLabel}>Active jobs</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>£{
            activeJobs
              .reduce((sum, job) => sum + (job.driver_payout_amount || 0), 0)
              .toFixed(0)
          }</Text>
          <Text style={styles.statLabel}>Potential payout</Text>
        </View>
      </View>

      <FlatList
        data={activeJobs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
        renderItem={({ item }) => (
          <JobCard
            booking={item}
            onPress={() =>
              navigation.navigate('JobDetail', {
                bookingId: item.id,
              })
            }
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No jobs right now</Text>
            <Text style={styles.emptyText}>
              New delivery work will appear here automatically.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kicker: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '900',
  },
  profileButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  profileText: {
    color: colors.text,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 22,
    marginTop: 8,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statNumber: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  statLabel: {
    color: colors.textSecondary,
    marginTop: 4,
    fontSize: 13,
  },
  listContent: {
    padding: 22,
    paddingBottom: 120,
  },
  emptyState: {
    paddingVertical: 120,
    alignItems: 'center',
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
});
