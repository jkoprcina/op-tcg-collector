import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Currency = 'USD' | 'EUR';

const CURRENCY_STORAGE_KEY = 'app_currency';

type SettingsContextType = {
  ready: boolean;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  toggleCurrency: () => void;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('USD');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
        if (saved === 'USD' || saved === 'EUR') {
          setCurrencyState(saved);
        }
      } catch {}
      setReady(true);
    })();
  }, []);

  const setCurrency = async (next: Currency) => {
    setCurrencyState(next);
    try {
      await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, next);
    } catch {}
  };

  const toggleCurrency = () => {
    const next = currency === 'USD' ? 'EUR' : 'USD';
    setCurrency(next);
  };

  const value: SettingsContextType = {
    ready,
    currency,
    setCurrency,
    toggleCurrency,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
