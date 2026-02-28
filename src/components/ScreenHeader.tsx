import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getTheme } from '../theme';

type Props = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  style?: ViewStyle;
};

export function ScreenHeader({ title, subtitle, right, style }: Props) {
  const { mode } = useTheme();
  const theme = getTheme(mode);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
        {right ? <View style={styles.rightSlot}>{right}</View> : null}
      </View>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: theme.colors.mutedText }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rightSlot: {
    marginLeft: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
    opacity: 0.8,
  },
});
