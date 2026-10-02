import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { getWeather } from '@/services';
import type { Weather } from '@/services';

/** Weather to dress for, refreshed each time the screen gains focus (the service caches it for 30 min). */
export function useWeather(): Weather | null {
  const [weather, setWeather] = useState<Weather | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getWeather().then((next) => {
        if (active) setWeather(next);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  return weather;
}
