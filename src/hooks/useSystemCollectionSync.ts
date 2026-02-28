import { useEffect, useRef } from 'react';
import { useCollectedCards } from './useCollectedCards';
import { useCollections } from '../context/CollectionsContext';
import { useCardFilters } from '../context/CardFilterContext';
import { isAlternateArtCard, getRarityKeyForCard } from '../context/CardFilterContext';
import { SYSTEM_COLLECTION_IDS } from '../utils/systemCollections';
import type { Card } from '../types';

/**
 * Hook that syncs card collections to system collections when collected card counts change.
 * Removes cards from Missing Alts when alt cards reach count 1.
 * Removes cards from Missing Playsets when cards reach their rarity threshold.
 * 
 * Must be used in a component that has access to both CollectedCardsProvider and CollectionsProvider.
 */
export function useSystemCollectionSync(cardData?: Record<string, Partial<Card>>) {
  const { collected } = useCollectedCards();
  const { removeCardFromCollectionByImageId, getCollection } = useCollections();
  const { thresholds } = useCardFilters();
  const previousCountsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      // Check each collected card to see if it changed
      for (const [cardId, count] of Object.entries(collected)) {
        const previousCount = previousCountsRef.current[cardId] || 0;
        
        // Only process if count increased
        if (count > previousCount) {
          const card = cardData?.[cardId];
          
          try {
            // If this is an alt card reaching count 1, remove from Missing Alts
            if (count === 1 && card && isAlternateArtCard(card as Card)) {
              const missingAltsCollection = getCollection(SYSTEM_COLLECTION_IDS.MISSING_ALTS);
              if (missingAltsCollection) {
                await removeCardFromCollectionByImageId(SYSTEM_COLLECTION_IDS.MISSING_ALTS, cardId);
              }
            }
            
            // If this card reaches the playset threshold, remove from Missing Playsets
            if (card) {
              const rarityKey = getRarityKeyForCard(card as Card);
              const threshold = thresholds[rarityKey] || 4;
              if (count === threshold) {
                const missingPlaysetsCollection = getCollection(SYSTEM_COLLECTION_IDS.MISSING_PLAYSETS);
                if (missingPlaysetsCollection) {
                  await removeCardFromCollectionByImageId(SYSTEM_COLLECTION_IDS.MISSING_PLAYSETS, cardId);
                }
              }
            }
          } catch (err) {
            console.error('Failed to update system collections for card:', cardId, err);
          }
        }
      }
      
      // Update ref with current counts
      previousCountsRef.current = { ...collected };
    })();
  }, [collected, cardData, removeCardFromCollectionByImageId, getCollection, thresholds]);
}
