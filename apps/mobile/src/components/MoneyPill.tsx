import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

interface Props {
  amount?: number | null;
}

export default function MoneyPill({ amount }: Props) {
  const display = amount !== null && amount !== undefined
    ? `£${amount.toFixed(2)}`
    : 'TBC';

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{display}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  text: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
  },
});
