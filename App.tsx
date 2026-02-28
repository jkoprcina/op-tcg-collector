import React from 'react';
import { AppNavigator } from './src/navigation';
import { AuthProvider } from './src/context/AuthContext';
import { CollectionsProvider } from './src/context/CollectionsContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { SettingsProvider } from './src/context/SettingsContext';
import { CollectedCardsProvider } from './src/context/CollectedCardsContext';
import { SystemCollectionsProvider } from './src/context/SystemCollectionsContext';
import { CardFilterProvider } from './src/context/CardFilterContext';
import { FavoritesProvider } from './src/context/FavoritesContext';
import { ToastProvider, ErrorBoundary, ErrorOverlay } from './src/components';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useSystemCollectionSync } from './src/hooks/useSystemCollectionSync';

function SystemCollectionSyncWrapper({ children }: { children: React.ReactNode }) {
  // This component sits inside all providers and syncs system collections
  useSystemCollectionSync();
  return <>{children}</>;
}

function AppContent() {
  const { mode } = useTheme();
  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <ToastProvider>
        <ErrorOverlay />
        <SettingsProvider>
          <CardFilterProvider>
            <FavoritesProvider>
              <AuthProvider>
                <CollectedCardsProvider>
                  <SystemCollectionsProvider>
                    <CollectionsProvider>
                      <SystemCollectionSyncWrapper>
                        <AppNavigator />
                      </SystemCollectionSyncWrapper>
                    </CollectionsProvider>
                  </SystemCollectionsProvider>
                </CollectedCardsProvider>
              </AuthProvider>
            </FavoritesProvider>
          </CardFilterProvider>
        </SettingsProvider>
      </ToastProvider>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
