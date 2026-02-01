import React from 'react';
import { AppNavigator } from './src/navigation';
import { AuthProvider } from './src/context/AuthContext';
import { CollectionsProvider } from './src/context/CollectionsContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { CollectedCardsProvider } from './src/context/CollectedCardsContext';
import { ToastProvider, ErrorBoundary } from './src/components';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <CollectedCardsProvider>
              <CollectionsProvider>
                <AppNavigator />
              </CollectionsProvider>
            </CollectedCardsProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
