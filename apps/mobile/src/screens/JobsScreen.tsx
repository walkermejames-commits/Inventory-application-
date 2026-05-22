import React, { useEffect, useMemo, useState } from 'react';
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

const adminApiUrl = process.env.EXPO_PUBLIC_ADMIN_API_URL || '';
const demoDriverId = process.env.EXPO_PUBLIC_DEMO_DRIVER_ID || '';
const pollIntervalMs = 10000;

async function loadAssignedJobs(): Promise<Booking[]> {
  if (!adminApiUrl || !demoDriverId) {
    return [];
  }

  const baseUrl = adminApiUrl.replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/api/mobile/jobs?driverId=${encodeURIComponent(demoDriverId)}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || 'Could not load assigned jobs');
  }

  return data.jobs || [];
}

export default function JobsScreen({ navigation }: any) {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Booking[]>([]);

  const activeJobs = useMemo(
    () => jobs.filter(job => job.status !== 'completed' && job.status !== 'cancelled'),
    [jobs]
  );

  const fetchJobs = async () => {
    try {
      const nextJobs = await loadAssignedJobs();
      setJobs(nextJobs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();

    const interval = setInterval(fetchJobs, pollIntervalMs);

    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  };

  const missingConfig = !adminApiUrl || !demoDriverId;

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
          <Text style={styles.statLabel}>Assigned jobs</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>£{
            activeJobs
              .reduce((sum, job) => sum + (job.driver_payout_amount || 0), 0)
              .toFixed(0)
          }</Text>
          <Text style={styles.statLabel}>Assigned payout</Text>
        </View>
      </View>

      {missingConfig ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>Driver feed not configured</Text>
          <Text style={styles.warningText}>
            Add EXPO_PUBLIC_ADMIN_API_URL and EXPO_PUBLIC_DEMO_DRIVER_ID to the mobile app environment.
          </Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Could not load jobs</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

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
            <Text style={styles.emptyTitle}>{loading ? 'Loading jobs...' : 'No assigned jobs'}</Text>
            <Text style={styles.emptyText}>
              FC-assigned delivery work will appear here automatically.
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
  warningBox: {
    marginHorizontal: 22,
    marginTop: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: colors.surface,
    padding: 16,
  },
  warningTitle: {
    color: colors.warning,
    fontWeight: '900',
    marginBottom: 6,
  },
  warningText: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
  errorBox: {
    marginHorizontal: 22,
    marginTop: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.surface,
    padding: 16,
  },
  errorTitle: {
    color: colors.danger,
    fontWeight: '900',
    marginBottom: 6,
  },
  errorText: {
    color: colors.textSecondary,
    lineHeight: 20,
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
