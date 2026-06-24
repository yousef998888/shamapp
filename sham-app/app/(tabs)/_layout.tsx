import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { FloatingTabBar } from '@/components/FloatingTabBar';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthContext } from '@/contexts/AuthContext';

export default function TabLayout() {
  const { language } = useTranslation();
  const { isAuthenticated } = useAuthContext();
  
  const t = language === 'ar' 
    ? {
        home: 'الرئيسية',
        search: 'البحث',
        inbox: 'الرسائل',
        account: 'الحساب',
      }
    : {
        home: 'Home',
        search: 'Search',
        inbox: 'Inbox',
        account: 'Account',
      };
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: t.home,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: t.search,
          }}
        />
        <Tabs.Screen
          name="inbox"
          options={{
            title: t.inbox,
          }}
        />
        <Tabs.Screen
          name="explore/account"
          options={{
            title: t.account,
          }}
        />
      </Tabs>
      {isAuthenticated && <FloatingTabBar />}
    </View>
  );
}
