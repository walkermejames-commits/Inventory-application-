import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '../theme/colors';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>JW</Text>
          </View>

          <Text style={styles.name}>James Walker</Text>
          <Text style={styles.meta}>Ford Transit • Tunbridge Wells</Text>
        </View>

        <View style={styles.card}>
          <ProfileRow label="Driver rating" value="4.9 ★" />
          <ProfileRow label="Completed deliveries" value="128" />
          <ProfileRow label="Vehicle type" value="Medium van" />
          <ProfileRow label="Support status" value="Priority pilot" />
        </View>

        <TouchableOpacity activeOpacity={0.85} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
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
  hero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatar: {
    width: 94,
    height: 94,
    borderRadius: 999,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  avatarText: {
    color: '#000',
    fontSize: 28,
    fontWeight: '900',
  },
  name: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  meta: {
    color: colors.textSecondary,
    marginTop: 8,
    fontSize: 15,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 6,
  },
  rowValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  logoutButton: {
    backgroundColor: colors.danger,
    borderRadius: 22,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 26,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
});
