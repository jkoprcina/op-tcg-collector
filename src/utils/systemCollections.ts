import { isAlternateArtCard as isAltCardFromFilter } from '../context/CardFilterContext';

// Re-export the corrected function that excludes manga and SP cards
export const isAlternateArtCard = isAltCardFromFilter;

/**
 * System collection IDs - these are special collections that cannot be deleted
 */
export const SYSTEM_COLLECTION_IDS = {
  MISSING_ALTS: 'system_missing_alts',
  MISSING_PLAYSETS: 'system_missing_playsets',
} as const;

/**
 * Check if a collection ID is a system collection
 */
export function isSystemCollection(collectionId: string): boolean {
  return Object.values(SYSTEM_COLLECTION_IDS).includes(collectionId as any);
}
