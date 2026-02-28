import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import type { Card } from '../types';
import { useTheme } from '../context/ThemeContext';
import { getTheme } from '../theme';
import { getRarityKeyForCard } from '../context/CardFilterContext';

type Props = {
  cards: Card[];
};

export function CollectionStats({ cards }: Props) {
  const { mode } = useTheme();
  const theme = getTheme(mode);

  const stats = useMemo(() => {
    if (cards.length === 0) {
      return {
        totalCards: 0,
        totalValue: 0,
        rarityBreakdown: {} as Record<string, number>,
        priceSymbol: '$',
      };
    }

    const rarityBreakdown: Record<string, number> = {};
    let totalValue = 0;

    cards.forEach(card => {
      // Count by rarity
      const rarityKey = getRarityKeyForCard(card);
      rarityBreakdown[rarityKey] = (rarityBreakdown[rarityKey] || 0) + 1;

      // Sum prices
      const price = card.market_price;
      if (price) {
        totalValue += price;
      }
    });

    return {
      totalCards: cards.length,
      totalValue,
      rarityBreakdown,
      priceSymbol: '$',
    };
  }, [cards]);

  const rarityItems = Object.entries(stats.rarityBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4); // Show top 4 rarities

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {/* Main stats row */}
      <View style={styles.mainStats}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>
            {stats.totalCards}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.mutedText }]}>Cards</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.accent }]}>
            {stats.priceSymbol}{stats.totalValue.toFixed(2)}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.mutedText }]}>Total Value</Text>
        </View>
      </View>

      {/* Rarity breakdown */}
      {rarityItems.length > 0 && (
        <>
          <View style={[styles.breakdownDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.breakdown}>
            <Text style={[styles.breakdownTitle, { color: theme.colors.text }]}>Rarity Breakdown</Text>
            <View style={styles.rarityGrid}>
              {rarityItems.map(([rarity, count]) => (
                <View key={rarity} style={styles.rarityItem}>
                  <Text style={[styles.rarityName, { color: theme.colors.text }]}>
                    {rarity}
                  </Text>
                  <Text style={[styles.rarityCount, { color: theme.colors.primary }]}>
                    {count}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    borderWidth: 0,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 12px rgba(0,0,0,0.06)',
      },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  mainStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 40,
    marginHorizontal: 16,
  },
  breakdownDivider: {
    height: 1,
    marginVertical: 12,
  },
  breakdown: {
    gap: 8,
  },
  breakdownTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  rarityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rarityItem: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  rarityName: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  rarityCount: {
    fontSize: 14,
    fontWeight: '700',
  },
});
