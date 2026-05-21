import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

const weeklyJobs = [
  { id: '1', route: 'Tunbridge Wells → Tonbridge', payout: 58 },
  { id: '2', route: 'Sevenoaks → Maidstone', payout: 35 },
  { id: '3', route: 'Crowborough → Ashford', payout: 74 },
];

export default function EarningsScreen() {
  const total = weeklyJobs.reduce((sum, job) => sum + job.payout, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>THIS WEEK</Text>
        <Text style={styles.total}>£{total.toFixed(2)}</Text>
        <Text style={styles.subtitle}>Estimated driver payout</Text>

        <View style={styles.card}>
          {weeklyJobs.map(job => (
            <View key={job.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.route}>{job.route}</Text>
                <Text style={styles.small}>Completed delivery</Text>
              </View>

              <Text style={styles.amount}>£{job.payout}</Text>
            </View>
          ))}
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
    padding: 24,
    paddingBottom: 120,
  },
  kicker: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 10,
  },
  total: {
    color: colors.text,
    fontSize: 54,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 8,
    marginBottom: 28,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 28,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  route: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  small: {
    color: colors.textSecondary,
    marginTop: 4,
  },
  amount: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: '900',
  },
});
