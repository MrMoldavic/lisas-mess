import { useSyncExternalStore } from 'react';

import { getShopState, subscribeShop } from '@/services/shop';
import type { ShopState } from '@/services/shop';

/** Shop purchases and equipped items, re-rendering on every change. */
export function useShop(): ShopState {
  return useSyncExternalStore(subscribeShop, getShopState);
}
