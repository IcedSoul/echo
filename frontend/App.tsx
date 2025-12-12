import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import Toast from 'react-native-toast-message';

import { store, persistor } from './src/store';
import { setHydrated } from './src/store/slices/authSlice';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import { toastConfig } from './src/components/Toast/ToastConfig';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Loading 组件 - 在状态恢复时显示
const LoadingView = () => {
  const { theme } = useTheme();
  
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
      }}
    >
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
};

// Hydration 完成后设置状态的组件
const HydrationHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();
  
  useEffect(() => {
    // PersistGate 完成后，这个组件会渲染，标记 hydration 完成
    dispatch(setHydrated());
  }, [dispatch]);
  
  return <>{children}</>;
};

export default function App() {
  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <PersistGate loading={<LoadingView />} persistor={persistor}>
                <HydrationHandler>
                  <StatusBar style="auto" />
                  <AppNavigator />
                  <Toast config={toastConfig} topOffset={50} />
                </HydrationHandler>
              </PersistGate>
            </ThemeProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Provider>
  );
}
