import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors } from '../theme/colors';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('driver@doorinfour.local');
  const [pin, setPin] = useState('1234');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);

    await new Promise(resolve => setTimeout(resolve, 450));

    setLoading(false);
    navigation.replace('Jobs');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.hero}>
          <Text style={styles.kicker}>DOOR IN FOUR</Text>
          <Text style={styles.title}>Driver cockpit</Text>
          <Text style={styles.subtitle}>
            Sign in to see available work, accept delivery jobs, and keep collections moving.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Driver email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="driver@example.com"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <Text style={styles.label}>PIN</Text>
          <TextInput
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            placeholder="1234"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Start driving'}</Text>
          </TouchableOpacity>

          <Text style={styles.helperText}>
            MVP login uses a demo driver identity. Real Supabase auth comes next.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  hero: {
    paddingTop: 56,
  },
  kicker: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 10,
  },
  title: {
    color: colors.text,
    fontSize: 46,
    fontWeight: '900',
    lineHeight: 52,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 17,
    lineHeight: 26,
    marginTop: 18,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 28,
    padding: 22,
    marginBottom: 18,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 22,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '900',
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 16,
    textAlign: 'center',
  },
});
