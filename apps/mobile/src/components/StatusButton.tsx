import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { colors } from '../theme/colors';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'warning' | 'danger' | 'muted';
}

export default function StatusButton({ label, onPress, disabled = false, tone = 'primary' }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        tone === 'primary' && styles.primary,
        tone === 'warning' && styles.warning,
        tone === 'danger' && styles.danger,
        tone === 'muted' && styles.muted,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.text, tone === 'warning' && styles.darkText]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  warning: {
    backgroundColor: colors.warning,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  muted: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
  },
  darkText: {
    color: '#111',
  },
});
