import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { I18nManager, Alert } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useNotifications } from '@/hooks/useNotifications';

const queryClient = new QueryClient();

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const { language, isRTL, loading } = useTranslation();
  const prevLanguageRef = useRef<string | null>(null);
  
  // Initialize push notifications
  useNotifications();

  useEffect(() => {
    // Only apply RTL changes after translations are loaded
    if (loading) return;

    // Force RTL layout when language is Arabic
    const shouldBeRTL = language === 'ar';
    
    // Always allow RTL
    I18nManager.allowRTL(true);
    
    // Check if this is the initial load or a language change
    const isLanguageChange = prevLanguageRef.current !== null && prevLanguageRef.current !== language;
    prevLanguageRef.current = language;
    
    if (__DEV__) {
      console.log(`🔍 RTL Check - Language: ${language}, shouldBeRTL: ${shouldBeRTL}, I18nManager.isRTL: ${I18nManager.isRTL}, isLanguageChange: ${isLanguageChange}`);
    }
    
    if (I18nManager.isRTL !== shouldBeRTL) {
      console.log(`🔄 Changing app direction to ${shouldBeRTL ? 'RTL' : 'LTR'} for language: ${language}`);
      I18nManager.forceRTL(shouldBeRTL);
      
      // Note: On some devices, the app needs to be restarted for RTL changes to take full effect
      if (isLanguageChange) {
        console.log('⚠️ RTL change applied. Please RESTART the app for layout changes to take full effect.');
        
        // Show alert to user
        // if (__DEV__) {
        //   Alert.alert(
        //     'Restart Required',
        //     `Language changed to ${language.toUpperCase()}. Please restart the app for the layout to update properly. You can use Cmd+R (iOS) or press R in the dev menu (Android) to reload.`,
        //     [{ text: 'OK' }]
        //   );
        // }
      }
    } else {
      if (__DEV__) {
        console.log(`✅ App direction is already ${shouldBeRTL ? 'RTL' : 'LTR'} for language: ${language}`);
      }
    }
  }, [language, loading]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack> 
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false, animation: "fade" }} />
        <Stack.Screen name="search-results" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="category/[slug]" options={{ headerShown: false }} />
        <Stack.Screen name="checkout/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="checkout/success" options={{ headerShown: false }} />
        <Stack.Screen name="selling" options={{ headerShown: false }} />
        <Stack.Screen name="help-center/index" options={{ headerShown: false }} />
        <Stack.Screen name="buying" options={{ headerShown: false }} />
        <Stack.Screen name="help-center/faq" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="create-listing" options={{ headerShown: false }} />
        <Stack.Screen name="inbox/[orderId]" options={{ headerShown: false }} />
        <Stack.Screen name="favorites" options={{ headerShown: false }} />
        <Stack.Screen name="wishlist/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="wishlist/edit/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="wishlist/create" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <RootLayoutContent />
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
