import { useCollectedCardsContext } from '../context/CollectedCardsContext';

export function useCollectedCards() {
  return useCollectedCardsContext();
}
